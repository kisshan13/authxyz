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

import nodemailer, {
  SendMailOptions,
  Transport,
  TransportOptions,
} from "nodemailer";
import bcrypt from "bcrypt";
import ejs from "ejs";
import Nodecache from "node-cache";

import type {
  AdapterMethodResult,
  DatabaseAdapter,
  PayloadSchema,
  PayloadValidation,
} from "./shared.js";

import createZodSchema from "./utils/createZodSchema.js";
import { validateByMethod, signAuth } from "./authentication.js";
import zodError from "./utils/errorHandler.js";
import Mail from "./utils/mail.js";

import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

type JwtSecret = string;

interface LocalLoginConfig<T extends string> {
  schema?: PayloadSchema[] | PayloadValidation;
  role?: T;
  mailTemplate?: string;
}

interface MailOptions {
  mailConfig?: SMTPTransport.Options;
  templates?: {
    register: () => string;
    resend: () => string;
    forgetPassword: () => string;
  };
  mail?: string;
}

interface RegisterConfig {
  schema?: PayloadSchema[];
}

interface AuthOptions {
  validationMethod: "JWT" | "COOKIE";
  cookieOptions?: CookieOptions;
  jwtOptions?: SignOptions;
  verification?: boolean;
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

  mailOptions: MailOptions;
}

class Local<T extends string> {
  #secret: JwtSecret;
  #roles: T[] | undefined;
  #adapter: DatabaseAdapter;
  #options: AuthOptions;
  #mail: MailOptions;
  #mailVerificationCode: Nodecache;
  constructor({
    secret,
    mailOptions,
    roles = ["user"] as T[],
    adapter,
    options,
  }: LocalAuthOptions<T>) {
    this.#secret = secret;
    this.#roles = roles as T[];
    this.#adapter = adapter;
    this.#options = options;
    this.#mail = {} as MailOptions;
    this.#mailVerificationCode = new Nodecache({
      stdTTL: 60 * 5 * 1000,
    });
  }

  configMail(options: MailOptions) {
    this.#mail = options;
  }

  protect(role: T[]) {
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

        if (!user?.data || role.includes(user?.data?.role)) {
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

  login(path: string, config: LocalLoginConfig<T>) {
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

          delete data["password"];

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

  register(path: string, config: LocalLoginConfig<T>) {
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

          const password = await bcrypt.hash(
            payload["password"],
            bcrypt.genSaltSync()
          );

          const user = await this.#adapter?.addUser({
            ...payload,
            password,
            ...(config?.role && { role: config?.role }),
          });

          const { status, message, data } = user;

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

          delete data["password"];

          if (this.#options?.onRegister) {
            this.#options.onRegister({ ...data, token: authInfo }, res, next);
            return;
          }

          res.status(status).json({
            message: message,
            data: { ...data, token: authInfo },
          });

          if (this.#options.verification) {
            const verification = Math.ceil(Math.random() * 1000000);
            this.#mailVerificationCode.set(
              data?._id?.toString() || data?.id,
              verification
            );
            const template = await Promise.resolve(
              this.#mail?.templates?.register()
            );

            this.sendMail({
              from: this.#mail?.mail,
              to: data?.email,
              html: ejs.render(template, { verificationCode: verification }),
              subject: "Please verify your email",
            });
          }
        } catch (error) {
          console.log(error);
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

  resendVerification(path: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === path) {
        try {
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

  private async onError(error: Error, res: Response) {
    let response = null as { message: string; status: number };
    if (error instanceof ZodError) {
      response = zodError(error);

      return res.status(response?.status).send({
        message: response?.message,
      });
    }

    for (let i = 0; i < this.#adapter.handlers.length; i++) {
      const handler = this.#adapter.handlers[i];
      response = handler(error);
      console.log(response);
      if (response) {
        break;
      }
    }

    res.status(response?.status || 500).json({
      message: response?.message,
    });
  }

  private async sendMail(options: SendMailOptions) {
    const mail = new Mail(this.#mail.mailConfig);

    return await mail.sendMail(options);
  }
}

export default Local;
