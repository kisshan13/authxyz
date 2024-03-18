import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

import type {
  AuthConfig,
  AuthUrlConfig,
  LocalMiddlewareRegister,
  PostprocessRequest,
} from "./types.js";
import ThirdParty, { ThirdPartyInitailization } from "./core.js";
import { isFunction } from "./utils.js";

interface AuthLinkResponse {
  url: string;
  state: string;
}

export default class Google<T extends string> extends ThirdParty<T> {
  #client: OAuth2Client;
  constructor({ ...options }: ThirdPartyInitailization<T>) {
    super(options);
    this.#client = new OAuth2Client({
      clientId: options?.clientId,
      clientSecret: options?.clientSecret,
      redirectUri: options?.redirectUri,
    });
  }

  auth(
    config: AuthUrlConfig<T>,
    callback: PostprocessRequest<{ url: string; state: string }>
  ): LocalMiddlewareRegister {
    const isCallback = isFunction(callback);
    const { stateSecret } = this.getPrivateFields();

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "GET") {
        const state = jwt.sign({ role: config.role }, stateSecret);
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
    config: AuthUrlConfig<T>,
    callback?: PostprocessRequest<{ user: Object }>
  ): LocalMiddlewareRegister {
    const isCallback = isFunction(callback);
    const { stateSecret, roles, clientId } = this.getPrivateFields();

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "GET") {
        const { code, state } = req.query;

        if (!code || !state) {
          return isCallback
            ? callback({ type: "INVALID-CODE" }, req, res)
            : res.status(400).json({ message: "Invalid code" });
        }

        const decoded = jwt.verify(state as string, stateSecret) as { role: T };

        if (roles.includes(decoded.role)) {
          const { tokens } = await Promise.resolve(
            this.#client.getToken(code as string)
          );

          const ticket = await this.#client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: clientId,
          });

          const payload = ticket.getPayload();

          if (payload) {
            return isCallback
              ? callback(
                  { type: "NEW-USER", data: { user: payload } },
                  req,
                  res
                )
              : res.status(200).json({ user: payload });
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
