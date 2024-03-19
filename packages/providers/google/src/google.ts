import { OAuth2Client, TokenPayload } from "google-auth-library";
import core from "@authxyz/core";

import type { CookieOptions } from "express";
import type { SignOptions } from "jsonwebtoken";

import jwt from "jsonwebtoken";

import type {
  AuthConfig,
  AuthUrlConfig,
  DatabaseAdapter,
  LocalMiddlewareRegister,
  PostprocessRequest,
} from "./types.js";
import { isFunction } from "./utils.js";

interface GoogleAuthOptions<T extends string> {
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

export default class Google<T extends string> {
  #client: OAuth2Client;
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
  constructor({
    auth = "JWT",
    clientId,
    adapter,
    clientSecret,
    options,
    redirectUrl,
    roles,
  }: GoogleAuthOptions<T>) {
    this.#client = new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri: redirectUrl,
    });
    this.#clientInfo = { clientId, clientSecret, redirectUrl };
    this.#roles = roles;
    this.#auth = auth;
    this.#options = options;
    this.#adapter = adapter;
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

        const url = this.#client.generateAuthUrl({
          access_type: "offline",
          scope: config.scope || ["email", "openid", "profile"],
          state,
        });

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
    config: AuthConfig<T>,
    callback?: PostprocessRequest<{ user: TokenPayload; token: string }>
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
        ) as { role: T };

        if (this.#roles.includes(decoded.role)) {
          const { tokens } = await this.#client.getToken(code as string);

          const ticket = await this.#client.verifyIdToken({
            idToken: tokens.id_token,
            audience: this.#clientInfo.clientId,
          });

          const payload = ticket.getPayload();

          const { data } = await this.#adapter.getUser({
            email: payload.email,
          });

          const token = core.signAuth({
            method: this.#auth,
            options: {
              cookieOptions: this.#options.cookieOptions,
              jwtOptions: this.#options.jwtOptions,
            },
            data: { id: data["id"] || data["_id"] },
            res: res,
            secret: this.#options.authSecret,
          });

          if (data?.email) {
            return isCallback
              ? callback(
                  { data: { user: payload, token: token || "" } },
                  req,
                  res
                )
              : res.status(200).json({ user: payload, token });
          }

          const newUser = await this.#adapter.addUser({
            ...payload,
            provider: "google",
            credentials: { ...tokens },
          });

          if (newUser.status === 200) {
            const token = core.signAuth({
              method: this.#auth,
              options: {
                cookieOptions: this.#options.cookieOptions,
                jwtOptions: this.#options.jwtOptions,
              },
              data: { id: newUser?.data["id"] || newUser?.data["_id"] },
              res: res,
              secret: this.#options.authSecret,
            });
            return isCallback
              ? callback(
                  {
                    type: "NEW-USER",
                    data: { user: payload, token: token || "" },
                  },
                  req,
                  res
                )
              : res.status(200).json({ user: payload, token });
          }
        }

        return isCallback
          ? callback({ type: "INVALID-CODE" }, req, res)
          : res.status(400).json({ message: "Invalid code" });
      } else {
        next();
      }
    };
  }
}

// export default class Google<T extends string> {
//   #client: OAuth2Client;
//   constructor({ ...options }: ThirdPartyInitailization<T>) {
//     super(options);
//     this.#client = new OAuth2Client({
//       clientId: options?.clientId,
//       clientSecret: options?.clientSecret,
//       redirectUri: options?.redirectUri,
//     });
//   }

//   auth(
//     config: AuthUrlConfig<T>,
//     callback: PostprocessRequest<{ url: string; state: string }>
//   ): LocalMiddlewareRegister {
//     const isCallback = isFunction(callback);
//     const { stateSecret } = this.getPrivateFields();

//     return async (req, res, next) => {
//       if (req.path === config.path && req.method === "GET") {
//         const state = jwt.sign({ role: config.role }, stateSecret);
//         const url = this.#client.generateAuthUrl({
//           access_type: "offline",
//           scope: config.scope || ["email", "openid", "profile"],
//           state,
//         });

//         if (config.redirect) {
//           return res.redirect(url);
//         }

//         return isCallback
//           ? callback({ type: "AUTH-URL", data: { url, state } }, req, res)
//           : res.status(200).json({ url, state });
//       } else {
//         next();
//       }
//     };
//   }

//   callback(
//     config: AuthUrlConfig<T>,
//     callback?: PostprocessRequest<{ user: Object }>
//   ): LocalMiddlewareRegister {
//     const isCallback = isFunction(callback);
//     const { stateSecret, roles, clientId } = this.getPrivateFields();

//     return async (req, res, next) => {
//       if (req.path === config.path && req.method === "GET") {
//         const { code, state } = req.query;

//         if (!code || !state) {
//           return isCallback
//             ? callback({ type: "INVALID-CODE" }, req, res)
//             : res.status(400).json({ message: "Invalid code" });
//         }

//         const decoded = jwt.verify(state as string, stateSecret) as { role: T };

//         if (roles.includes(decoded.role)) {
//           const { tokens } = await Promise.resolve(
//             this.#client.getToken(code as string)
//           );

//           const ticket = await this.#client.verifyIdToken({
//             idToken: tokens.id_token!,
//             audience: clientId,
//           });

//           const payload = ticket.getPayload();

//           if (payload) {
//             return isCallback
//               ? callback(
//                   { type: "NEW-USER", data: { user: payload } },
//                   req,
//                   res
//                 )
//               : res.status(200).json({ user: payload });
//           }
//         }

//         return isCallback
//           ? callback({ type: "INVALID-CODE" }, req, res)
//           : res.status(400).json({ message: "Invalid code" });
//       } else {
//         next();
//       }
//     };
//   }
// }
