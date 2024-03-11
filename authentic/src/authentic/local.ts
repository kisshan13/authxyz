/**
 *  This is the base logic for implementing the local auth for the application.
 *
 *  It supports the following features:
 *
 *  - Email & Password authentication.
 *  - Protection Middleware.
 *  - Mailing Options.
 *  - Forget Password.
 *  - Password Reset.
 */

import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";
import { ZodError } from "zod";
import bcrypt from "bcrypt";

import type {
  AdapterMethodResult,
  DatabaseAdapter,
  PayloadSchema,
} from "./shared.js";
import createZodSchema from "./utils/createZodSchema.js";

type JwtSecret = string;

interface LocalLoginConfig {
  schema?: PayloadSchema[];
}

interface RegisterConfig {
  schema?: PayloadSchema[];
}

interface AuthOptions {
  validationMethod: "JWT" | "COOKIE";
  onError?: (err: Error, res: Response) => void;
  onLogin?: (
    adapterResult: AdapterMethodResult,
    res: Response,
    next: NextFunction
  ) => void;
  onRegister?: (
    adapterResult: AdapterMethodResult,
    res: Response,
    next: NextFunction
  ) => void;
}

interface LocalAuthOptions<T extends string> {
  /**
   * @description JWT Secret used for signing auth tokens
   */
  secret: JwtSecret;
  /**
   * @description JWT Configuration for signing auth tokens.
   */
  jwtOption?: JwtPayload;
  /**
   * @description Roles supported in the application.
   */
  roles?: T[];

  adapter: DatabaseAdapter;

  options?: AuthOptions;
}

class Local<T extends string> {
  #secret: JwtSecret;
  #jwtOption: JwtPayload | undefined;
  #roles: T[] | undefined;
  #adapter: DatabaseAdapter;
  #options: AuthOptions;

  constructor({
    secret,
    jwtOption,
    roles = ["user"] as T[],
    adapter,
    options,
  }: LocalAuthOptions<T>) {
    this.#secret = secret;
    this.#jwtOption = jwtOption;
    this.#roles = roles as T[];
    this.#adapter = adapter;
    this.#options = options;
  }

  protect(role: T) {
    // Implement logic for protecting routes
  }

  login(path: string, config: LocalLoginConfig) {
    const validationSchema = createZodSchema([
      { name: "email", optional: false },
      { name: "password", optional: false },
      ...(config?.schema && { ...config.schema }),
    ]);

    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        try {
          const payload = validationSchema.parse(req.body);

          const user = await this.#adapter?.loginUser(payload);

          const { status, message, data } = user;

          if (this.#options.onLogin) {
            this.#options.onLogin(user, res, next);
            return;
          }

          res.status(status).send({
            message: message,
            data: data,
          });
        } catch (error) {
          if (this.#options.onError) {
            this.#options.onError(error, res);
          } else {
            this.onError(error, res);
          }
        }
      }
    };
  }

  register(path: string, config: LocalLoginConfig) {
    const validationSchema = createZodSchema([
      { name: "email", optional: false },
      { name: "password", optional: false },
    ]);

    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        try {
          const payload = validationSchema.parse(req.body);

          const password = bcrypt.hash(
            payload["password"],
            bcrypt.genSaltSync()
          );

          const user = await this.#adapter?.addUser({ ...payload, password });

          const { status, message, data } = user;

          if (this.#options?.onRegister) {
            this.#options.onRegister(user, res, next);
            return;
          }

          res.status(status).send({
            message: message,
            data: data,
          });
        } catch (error) {
          if (this.#options.onError) {
            this.#options.onError(error, res);
          } else {
            this.onError(error, res);
          }
        }
      } else {
        next();
      }
    };
  }

  onLogin() {}

  async mail() {
    // Implement logic for sending emails
  }

  private async onError(error: Error, res: Response) {
    if (error instanceof ZodError) {
    }
  }
}

export default Local;
