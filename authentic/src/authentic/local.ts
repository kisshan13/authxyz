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

import type { DatabaseAdapter, PayloadSchema } from "./shared.js";
import createZodSchema from "./utils/createZodSchema.js";

type JwtSecret = string;

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
}

interface LocalLoginConfig {
  schema?: PayloadSchema[];
}

interface RegisterConfig {
  schema?: PayloadSchema[];
}

class Local<T extends string> {
  #secret: JwtSecret;
  #jwtOption: JwtPayload | undefined;
  #roles: T[] | undefined;
  #adapter: DatabaseAdapter;

  constructor({
    secret,
    jwtOption,
    roles = ["user"] as T[],
    adapter,
  }: LocalAuthOptions<T>) {
    this.#secret = secret;
    this.#jwtOption = jwtOption;
    this.#roles = roles as T[];
    this.#adapter = adapter;
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
        } catch (error) {}
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
        console.log(req.path);
        try {
          const payload = validationSchema.parse(req.body);

          const user = await this.#adapter?.addUser(payload);

          const { status, message, data } = user;

          res.status(status).send({
            message: message,
            data: data,
          });
        } catch (error) {
          res.send("FAileed");
          console.log(error);
        }
      } else {
        next();
      }
    };
  }

  async mail() {
    // Implement logic for sending emails
  }

  private async onError(error: Error, res: Response) {
    if (error instanceof ZodError) {
    }
  }
}

export default Local;
