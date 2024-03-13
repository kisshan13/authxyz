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

import type { Request, Response, NextFunction, CookieOptions } from "express";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { ZodError } from "zod";
import bcrypt from "bcrypt";

import type {
  AdapterMethodResult,
  DatabaseAdapter,
  PayloadSchema,
  PayloadValidation,
} from "./shared.js";
import createZodSchema from "./utils/createZodSchema.js";
import { validateByMethod, signAuth } from "./authentication.js";
import { send } from "process";

type JwtSecret = string;

interface LocalLoginConfig<T> {
  schema?: PayloadSchema[] | PayloadValidation;
  role?: T;
}

interface RegisterConfig {
  schema?: PayloadSchema[];
}

interface AuthOptions {
  validationMethod: "JWT" | "COOKIE";
  cookieOptions?: CookieOptions;
  jwtOptions?: SignOptions;
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
    this.#roles = roles as T[];
    this.#adapter = adapter;
    this.#options = options;
  }

  protect(role: T) {
    // Implement logic for protecting routes

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const isAuthenticated = validateByMethod({
          method: this.#options?.validationMethod,
          req: req,
          secret: this.#secret,
        });

        if (isAuthenticated?.message || !isAuthenticated) {
          return res.status(403).json({
            message: isAuthenticated?.message || "Unauthorized",
          });
        }

        const user = await this.#adapter.getUser({ id: isAuthenticated?.id });

        if (!user?.data || user?.data?.role !== role) {
          return res.status(401).json({
            message: "Missing required permissions",
          });
        }

        next();
      } catch (error) {
        this.onError(error, res);
      }
    };
  }

  login<T>(path: string, config: LocalLoginConfig<T>) {
    const validationSchema =
      typeof config?.schema !== "function" &&
      createZodSchema([
        { name: "email", optional: false },
        { name: "password", optional: false },
        ...(config?.schema && [...config.schema]),
      ]);

    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        try {
          const payload =
            typeof config?.schema === "function"
              ? config?.schema(req.body)
              : validationSchema.parse(req.body);

          const user = await this.#adapter?.getUser(payload);

          const { status, message, data } = user;

          const password = bcrypt.compareSync(
            payload["password"],
            data?.password
          );

          if (!password) {
            return res.status(401).send({
              message: "Wrong Credentials",
            });
          }

          const authToken = signAuth({
            method: this.#options.validationMethod,
            data: { id: data?.id || data?._id },
            secret: this.#secret,
            options: {
              jwtOptions: this.#options?.jwtOptions,
              cookieOptions: this.#options?.cookieOptions,
            },
            res: res,
          });

          if (this.#options?.onLogin) {
            this.#options.onLogin({ ...data, token: authToken }, res, next);
            return;
          }

          res.status(status).send({
            message: message,
            data: data,
          });
        } catch (error) {
          if (this.#options?.onError) {
            this.#options.onError(error, res);
          } else {
            this.onError(error, res);
          }
        }
      }
    };
  }

  register<T>(path: string, config: LocalLoginConfig<T>) {
    const validationSchema =
      typeof config?.schema !== "function" &&
      createZodSchema([
        { name: "email", optional: false },
        { name: "password", optional: false },
        ...(config?.schema && [...config.schema]),
      ]);

    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        console.log(path);
        try {
          const payload =
            typeof config?.schema === "function"
              ? config?.schema(req.body)
              : validationSchema.parse(req.body);

          console.log(payload);
          const password = await bcrypt.hash(
            payload["password"],
            bcrypt.genSaltSync()
          );

          const user = await this.#adapter?.addUser({ ...payload, password });

          const { status, message, data } = user;

          console.log(user);

          const authInfo = signAuth({
            method: this.#options.validationMethod,
            res: res,
            data: { id: data?.id || data?._id },
            options: {
              jwtOptions: this.#options.jwtOptions,
              cookieOptions: this.#options.cookieOptions,
            },
            secret: this.#secret,
          });

          console.log(authInfo);

          if (this.#options?.onRegister) {
            this.#options.onRegister({ ...data, token: authInfo }, res, next);
            return;
          }

          res.status(status).json({
            message: message,
            data: { ...data, token: authInfo },
          });
        } catch (error) {
          if (this.#options?.onError) {
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

  onRegister() {}

  async mail() {
    // Implement logic for sending emails
  }

  private async onError(error: Error, res: Response) {
    if (error instanceof ZodError) {
      return res.send(error);
    }

    res.send(error);
  }
}

export default Local;
