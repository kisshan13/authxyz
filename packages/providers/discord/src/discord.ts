import core from "@authxyz/core";

import type { CookieOptions } from "express";
import type { SignOptions } from "jsonwebtoken";

import jwt from "jsonwebtoken";

import type {
  AuthUrlConfig,
  DatabaseAdapter,
  DiscordToken,
  DiscordUserInfo,
  LocalMiddlewareRegister,
  PostprocessRequest,
} from "./types.js";
import { isFunction } from "./utils.js";
import { signAuth } from "@authxyz/core/dist/sign.js";

const DISCORD_AUTHORIZATION_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USERINFO_URL = "https://discord.com/api/users/@me";

interface DiscordAuthOptions<T extends string> {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  auth: "JWT" | "COOKIE";
  roles: T[];
  adapter: DatabaseAdapter;
  options: {
    stateSecret: string;
    scopes?: string[];
    jwtOptions?: SignOptions;
    cookieOptions?: CookieOptions;
    authSecret: string;
  };
}

export default class Discord<T extends string> {
  #clientInfo: { clientId: string; clientSecret: string; redirectUrl: string };
  #roles: T[];
  #auth: "JWT" | "COOKIE";
  #adapter: DatabaseAdapter;
  #options: {
    stateSecret: string;
    scopes?: string[];
    jwtOptions?: SignOptions;
    cookieOptions?: CookieOptions;
    authSecret: string;
  };
  #scopes: string;
  constructor({
    auth = "JWT",
    clientId,
    adapter,
    clientSecret,
    options,
    redirectUrl,
    roles,
  }: DiscordAuthOptions<T>) {
    this.#clientInfo = { clientId, clientSecret, redirectUrl };
    this.#roles = roles;
    this.#auth = auth;
    this.#options = options;
    this.#adapter = adapter;
    this.#scopes = "";
  }

  protected(roles: T[]): LocalMiddlewareRegister {
    const protect = core.useProtect(roles, {
      secret: this.#options.authSecret,
      adapter: this.#adapter,
      validationMethod: this.#auth,
    });

    return protect;
  }

  auth(
    config: AuthUrlConfig<T>,
    callback?: PostprocessRequest<{ url: string; state: string }>
  ): LocalMiddlewareRegister {
    const isCallback = isFunction(callback);

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "GET") {
        const state = jwt.sign(
          { role: config.role },
          this.#options.stateSecret
        );

        let scopes = "";

        config.scope?.forEach((scope) => (scopes += `${scope} `));

        this.#scopes = scopes || "identity";

        const url =
          DISCORD_AUTHORIZATION_URL +
          `?clientId=${this.#clientInfo.clientId}&state=${state}&redirect_uri${
            this.#clientInfo.redirectUrl
          }&response_type=code&scope${scopes || "identity"}`;

        if (config.redirect) {
          return res.redirect(url);
        }

        return isCallback
          ? callback({ type: "AUTH-URL", data: { url, state } }, req, res)
          : res.status(200).json({ url, state });
      } else {
        next();
      }
    };
  }

  callback(
    config: AuthUrlConfig<T>,
    callback?: PostprocessRequest<{ user: Object; token: string }>
  ): LocalMiddlewareRegister {
    const isCallback = isFunction(callback);

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "GET") {
        const { code, state } = req.query;

        if (!code || !state) {
          return isCallback
            ? callback({ type: "INVALID-CODE" }, req, res)
            : res.status(400).json({ message: "Invalid code" });
        }

        const decoded = jwt.verify(
          state as string,
          this.#options.stateSecret
        ) as { role: string };

        if (!decoded?.role) {
          return isCallback
            ? callback({ type: "INVALID-CODE" }, req, res)
            : res.status(400).json({ message: "Invalid code" });
        }

        const authCode = await fetch(DISCORD_TOKEN_URL, {
          method: "POST",
          body: new URLSearchParams({
            client_id: this.#clientInfo.clientId,
            client_secret: this.#clientInfo.clientSecret,
            code: code.toString(),
            grant_type: "client_credentials",
            redirect_uri: this.#clientInfo.redirectUrl,
            scope: this.#scopes,
          }).toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        const oauthData = (await authCode.json()) as DiscordToken;

        const info = await fetch(DISCORD_USERINFO_URL, {
          method: "GET",
          headers: {
            authorization: `${oauthData.token_type} ${oauthData.access_token}`,
          },
        });

        const user = (await info.json()) as DiscordUserInfo;

        const isAlreadyUser = await this.#adapter.getUser({
          email: user?.email,
        });

        if (isAlreadyUser) {
          const token = signAuth({
            method: this.#auth,
            data: { id: isAlreadyUser["id"] || isAlreadyUser["_id"] },
            res: res,
            options: {
              cookieOptions: this.#options.cookieOptions,
              jwtOptions: this.#options.jwtOptions,
            },
          });

          return isCallback
            ? callback({ data: { user, token: token || "" } }, req, res)
            : res.status(200).json({ user, token });
        }

        const newUser = await this.#adapter.addUser({
          ...user,
          role: decoded?.role,
        });

        const token = signAuth({
          method: this.#auth,
          data: { id: newUser["id"] || newUser["_id"] },
          res: res,
          options: {
            cookieOptions: this.#options.cookieOptions,
            jwtOptions: this.#options.jwtOptions,
          },
        });

        return isCallback
          ? callback({ data: { user, token: token || "" } }, req, res)
          : res.status(200).json({ user, token });
      } else {
        next();
      }
    };
  }

  // callback(
  //   config: AuthConfig<T>,
  //   callback?: PostprocessRequest<{ user: TokenPayload; token: string }>
  // ): LocalMiddlewareRegister {
  //   const isCallback = isFunction(callback);

  //   return async (req, res, next) => {
  //     if (req.path === config.path && req.method === "GET") {
  //       const { code, state } = req.query;

  //       if (!code || !state) {
  //         return isCallback
  //           ? callback({ type: "INVALID-CODE" }, req, res)
  //           : res.status(400).json({ message: "Invalid code" });
  //       }

  //       const decoded = jwt.verify(
  //         state as string,
  //         this.#options.stateSecret
  //       ) as { role: T };

  //       if (this.#roles.includes(decoded.role)) {
  //         const { tokens } = await this.#client.getToken(code as string);

  //         const ticket = await this.#client.verifyIdToken({
  //           idToken: tokens.id_token,
  //           audience: this.#clientInfo.clientId,
  //         });

  //         const payload = ticket.getPayload();

  //         const { data } = await this.#adapter.getUser({
  //           email: payload.email,
  //         });

  //         const token = core.signAuth({
  //           method: this.#auth,
  //           options: {
  //             cookieOptions: this.#options.cookieOptions,
  //             jwtOptions: this.#options.jwtOptions,
  //           },
  //           data: { id: data["id"] || data["_id"] },
  //           res: res,
  //           secret: this.#options.authSecret,
  //         });

  //         if (data?.email) {
  //           return isCallback
  //             ? callback(
  //                 { data: { user: payload, token: token || "" } },
  //                 req,
  //                 res
  //               )
  //             : res.status(200).json({ user: payload, token });
  //         }

  //         const newUser = await this.#adapter.addUser({
  //           ...payload,
  //           provider: "google",
  //           credentials: { ...tokens },
  //         });

  //         if (newUser.status === 200) {
  //           const token = core.signAuth({
  //             method: this.#auth,
  //             options: {
  //               cookieOptions: this.#options.cookieOptions,
  //               jwtOptions: this.#options.jwtOptions,
  //             },
  //             data: { id: newUser?.data["id"] || newUser?.data["_id"] },
  //             res: res,
  //             secret: this.#options.authSecret,
  //           });
  //           return isCallback
  //             ? callback(
  //                 {
  //                   type: "NEW-USER",
  //                   data: { user: payload, token: token || "" },
  //                 },
  //                 req,
  //                 res
  //               )
  //             : res.status(200).json({ user: payload, token });
  //         }
  //       }

  //       return isCallback
  //         ? callback({ type: "INVALID-CODE" }, req, res)
  //         : res.status(400).json({ message: "Invalid code" });
  //     } else {
  //       next();
  //     }
  //   };
  // }
}
