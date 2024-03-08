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

import { PayloadSchema } from "./shared";

import createZodSchema from "./utils/createZodSchema";
import { ZodError } from "zod";

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

  constructor({
    secret,
    jwtOption,
    roles = ["user"] as T[],
  }: LocalAuthOptions<T>) {
    this.#secret = secret;
    this.#jwtOption = jwtOption;
    this.#roles = roles as T[];
  }

  async protect(role: T) {
    // Implement logic for protecting routes
  }

  async login(path: string, config: LocalLoginConfig) {
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

  async register(path: string, config: LocalLoginConfig) {
    const validationSchema = createZodSchema([
      { name: "email", optional: false },
      { name: "password", optional: false },
      ...(config?.schema && { ...config.schema }),
    ]);

    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        try {
          const payload = validationSchema.parse(req.body);
        } catch (error) {}
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
