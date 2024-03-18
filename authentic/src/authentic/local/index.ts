import bcrypt from "bcrypt";
import { Request, type CookieOptions, type Response } from "express";
import { SignOptions } from "jsonwebtoken";
import { ZodError } from "zod";
import ejs from "ejs";

import SMTPTransport from "nodemailer/lib/smtp-transport";
import type {
  CoreMiddleware,
  DatabaseAdapter,
  LocalMiddlewareRegister,
  PostprocessRequest,
} from "../types.js";

import {
  middlewareProtect,
  middlewareValidateAuthorization,
} from "./middlewares.js";

import { signAuth } from "../shared/auth.js";
import zodError from "../utils/errorHandler.js";
import NodeCache from "node-cache";
import { SendMailOptions } from "nodemailer";
import Mail from "../utils/mail.js";
import {
  forgetPasswordSchema,
  passwordChangeSchema,
  verificationSchema,
} from "./schema.js";
import { loginSchema, registerSchema } from "../shared/schema.js";

interface MailOptions {
  mailConfig?: SMTPTransport.Options;
  templates?: {
    register: () => string;
    resend: () => string;
    forgetPassword: () => string;
  };
  mail?: string;
}

interface AuthOptions {
  cookieOptions?: CookieOptions;
  jwtOptions?: SignOptions;
  verification?: boolean;
}

interface LocalAuthConfig<T extends string> {
  roles?: T[];
  adapter: DatabaseAdapter;
  validationMethod: "JWT" | "COOKIE";
  secret: string;
  options?: AuthOptions;
  mail?: MailOptions;
}

interface LoginAuthConfig<T extends string> {
  path: string;
  role: T;
  body: (data: any) => any;
}

type RegisterAuthConfig<T extends string> = LoginAuthConfig<T>;
type ResendVerificationConfig<T extends string> = LoginAuthConfig<T>;

class LocalAuth<T extends string> {
  #roles: T[];
  #adapter: DatabaseAdapter;
  #validationMethod: "JWT" | "COOKIE";
  #secret: string;
  #options: AuthOptions;
  #mail: MailOptions;
  #verificationCodes: NodeCache;
  #resetCode: NodeCache;
  constructor({
    roles,
    adapter,
    validationMethod = "JWT",
    secret,
    mail,
    options,
  }: LocalAuthConfig<T>) {
    this.#roles = roles || [];
    this.#adapter = adapter;
    this.#mail = mail;
    this.#validationMethod = validationMethod;
    this.#secret = secret;
    this.#verificationCodes = new NodeCache({ stdTTL: 60 * 5 * 1000 });
    this.#resetCode = new NodeCache({ stdTTL: 60 * 5 * 1000 });
    this.#options = options;
  }

  protect(roles: T[]): LocalMiddlewareRegister {
    const useProtected = middlewareProtect(
      roles,
      this.#secret,
      this.#adapter,
      this.#validationMethod
    );

    return async (req, res, next) => {
      const isAuthenticated = await useProtected(req, res, next);

      if (isAuthenticated.status) {
        next();
      }
    };
  }

  resetPasswordRequest(
    path: string,
    callback: PostprocessRequest<{ email: string; code: number }>
  ): LocalMiddlewareRegister {
    const isCallbackFunction = typeof callback === "function";

    return async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const { email } = forgetPasswordSchema.parse(req.body);

        if (this.#resetCode.get(email)) {
          return res.status(400).json({ message: "Can't reset password." });
        }

        const verificationToken = Math.ceil(Math.random() * 1000000);

        this.#resetCode.set(email, verificationToken);

        const template = this.#mail.templates.forgetPassword();

        this.sendMail({
          from: this.#mail.mail,
          to: email,
          subject: "Reset your password",
          html: ejs.render(template, { verificationCode: verificationToken }),
        });

        return isCallbackFunction
          ? callback(
              {
                type: "CODE-SENT",
                data: { email: email, code: verificationToken },
              },
              req,
              res
            )
          : res.status(200).json({ message: "Reset code sent to your mail." });
      } else {
        next();
      }
    };
  }

  resetPassword(
    path: string,
    callback: PostprocessRequest<{ email: string }>
  ): LocalMiddlewareRegister {
    const isCallbackFunction = typeof callback === "function";

    const handleWrongCode = (req: Request, res: Response) => {
      isCallbackFunction
        ? callback({ type: "INVALID-CODE" }, req, res)
        : res.status(400).json({ message: "Invalid Code" });
    };

    return async (req, res, next) => {
      if (req.path === path && req.method === "PATCH") {
        const { code, email, password } = passwordChangeSchema.parse(req.body);

        if (this.#resetCode.get(email) !== code) {
          return handleWrongCode(req, res);
        }
        const user = await this.#adapter.getUser({ email });
        const updatedUser = await this.#adapter.updateUser({
          id: user.data["_id"],
          update: {
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
          },
        });

        this.#resetCode.del(email);

        isCallbackFunction
          ? callback(
              { type: "PASSWORD-CHANGE", data: { email: email } },
              req,
              res
            )
          : res.status(200).json({ message: "Password Changed." });
      } else {
        next();
      }
    };
  }

  register(
    config: RegisterAuthConfig<T>,
    callback?: PostprocessRequest<{ token: string }>
  ): LocalMiddlewareRegister {
    if (typeof callback !== "function" && typeof callback !== "undefined") {
      throw new Error(
        "Authentic.js Error: Invalid callback argument. It can only be a function or undefined."
      );
    }

    const isCallbackFunction = typeof callback === "function";

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "POST") {
        try {
          const body =
            typeof config?.body === "function"
              ? config.body(req.body)
              : registerSchema.parse(req.body);

          const password = bcrypt.hashSync(
            body["password"],
            bcrypt.genSaltSync(10)
          );

          const user = await this.#adapter.addUser({
            ...body,
            password,
            role: config?.role,
          });

          const { data } = user;

          const id = data["id"]?.toString() || data["_id"]?.toString();

          const token = signAuth({
            method: this.#validationMethod,
            data: { id },
            secret: this.#secret,
            res: res,
            options: {
              cookieOptions: this.#options?.cookieOptions,
              jwtOptions: this.#options?.jwtOptions,
            },
          });

          if (this.#options?.verification) {
            console.log("here");
            const verificationCode = Math.ceil(Math.random() * 1000000);

            this.#verificationCodes.set(id, verificationCode);

            const template = ejs.render(this.#mail.templates.register(), {
              verificationCode: verificationCode,
            });

            this.sendMail({
              from: this.#mail.mail,
              to: data["email"],
              subject: "Verify your email",
              html: template,
            });
          }

          return isCallbackFunction
            ? callback(
                {
                  type: "TOKEN",
                  data: { token: token || "" },
                  message: "User Auth Token",
                },
                req,
                res
              )
            : res
                .status(200)
                .json({ message: "User Auth Token", data: { token } });
        } catch (error) {
          console.log(error);
          this.onError(error, res);
        }
      } else {
        next();
      }
    };
  }

  login(
    config: LoginAuthConfig<T>,
    callback?: PostprocessRequest<{ token: string }>
  ): CoreMiddleware {
    return async (req, res, next) => {
      if (req.path === config.path && req.method === "POST") {
        try {
          const body =
            typeof config?.body === "function"
              ? config.body(req.body)
              : loginSchema.parse(req.body);

          const user = await this.#adapter.getUser(body);

          const { data, status, message } = user;

          const isCallback = typeof callback === "function";

          if (status !== 200) {
            return isCallback
              ? callback(
                  {
                    type: "USER-NOT-FOUND",
                    data: { token: "" },
                    message: "No such user exists",
                  },
                  req,
                  res
                )
              : res.status(400).json({ message: "Invalid credentials" });
          }

          const isPasswordMatched = bcrypt.compareSync(
            body["password"],
            data["password"]
          );

          if (!isPasswordMatched) {
            return isCallback
              ? callback(
                  {
                    type: "WRONG-PASSWORD",
                    data: { token: "" },
                    message: "Invalid password",
                  },
                  req,
                  res
                )
              : res.status(400).json({ message: "Invalid credentials" });
          }

          const token = signAuth({
            method: this.#validationMethod,
            data: { id: data["id"] || data["_id"] },
            secret: this.#secret,
            res: res,
            options: {
              cookieOptions: this.#options?.cookieOptions,
              jwtOptions: this.#options?.jwtOptions,
            },
          });

          return isCallback
            ? callback(
                {
                  type: "TOKEN",
                  data: { token: token || "" },
                  message: "User Auth Token",
                },
                req,
                res
              )
            : res
                .status(200)
                .json({ message: "User Auth Token", data: { token } });
        } catch (error) {
          this.onError(error, res);
        }
      } else {
        next();
      }
    };
  }

  verify(
    config: LoginAuthConfig<T>,
    callback?: PostprocessRequest<{}>
  ): LocalMiddlewareRegister {
    const useAuthenticated = middlewareValidateAuthorization({
      method: this.#validationMethod,
      secret: this.#secret,
    });

    const isCallback = typeof callback === "function";

    const handleNoUserFound = (req: Request, res: Response) => {
      isCallback
        ? callback({ type: "USER-NOT-FOUND" }, req, res)
        : res.status(400).json({ message: "No such user exists" });
    };

    const handleUserVerified = (req: Request, res: Response) => {
      isCallback
        ? callback({ type: "USER-VERIFIED" }, req, res)
        : res.status(200).json({ message: "User successfully verified" });
    };

    return async (req, res, next) => {
      if (req.path === config.path && req.method === "POST") {
        const payload = verificationSchema.parse(req.body);
        const isAuthenticated = await useAuthenticated(req, res);

        const { status, data } = await this.#adapter.getUser({
          id: isAuthenticated.data.id,
        });

        if (status !== 200) {
          return handleNoUserFound(req, res);
        }

        const serverVerificationCode = this.#verificationCodes.get(
          isAuthenticated.data.id
        );

        if (serverVerificationCode !== payload.code) {
          return isCallback
            ? callback({ type: "INVALID-VERIFICATION" }, req, res)
            : res.status(400).json({ message: "Invalid verification code" });
        }

        this.#verificationCodes.del(isAuthenticated.data.id);

        const updateUser = await this.#adapter.updateUser({
          id: isAuthenticated.data.id,
          update: { isVerified: true },
        });

        return handleUserVerified(req, res);
      } else {
        next();
      }
    };
  }

  resendVerification(
    config: ResendVerificationConfig<T>,
    callback?: PostprocessRequest<{ verification: number }>
  ): LocalMiddlewareRegister {
    const useAuthenticated = middlewareValidateAuthorization({
      secret: this.#secret,
      method: this.#validationMethod,
    });

    const isCallback = typeof callback === "function";

    const handleUserNotFound = (req: Request, res: Response) => {
      isCallback
        ? callback({ type: "USER-NOT-FOUND" }, req, res)
        : res.status(400).json({ message: "No such user exists" });
    };

    const handleVerificationSent = (
      code: number,
      req: Request,
      res: Response
    ) => {
      isCallback
        ? callback(
            { type: "VERIFICATION-SENT", data: { verification: code } },
            req,
            res
          )
        : res.status(200).json({ message: "Verification code sent" });
    };

    const handleUserVerified = (req: Request, res: Response) => {
      isCallback
        ? callback({ type: "USER-VERIFIED" }, req, res)
        : res.status(400).json({ message: "User already verified" });
    };

    return async (req, res, next) => {
      const isAuthenticatedUser = await useAuthenticated(req, res);

      if (!isAuthenticatedUser.status) {
        return isCallback
          ? callback({ type: "USER-NOT-FOUND" }, req, res)
          : res.status(400).json({ message: "No such user exists" });
      }

      const { data, status } = await this.#adapter.getUser({
        id: isAuthenticatedUser.data.id,
      });

      if (status !== 200) {
        return handleUserNotFound(req, res);
      }

      if (data["isVerified"]) {
        return handleUserVerified(req, res);
      }

      if (this.#options?.verification) {
        const verificationCode = Math.ceil(Math.random() * 1000000);

        this.#verificationCodes.set(
          data["id"] || data["_id"],
          verificationCode
        );

        const template = ejs.render(this.#mail.templates.register(), {
          verificationCode: verificationCode,
        });

        this.sendMail({
          from: this.#mail.mail,
          to: data["email"],
          subject: "Verify your email",
          html: template,
        });

        return handleVerificationSent(verificationCode, req, res);
      }

      next();
    };
  }

  mailConfig(mail: MailOptions) {
    this.#mail = mail;
  }

  private async sendMail(options: SendMailOptions) {
    const mail = new Mail(this.#mail.mailConfig);

    const here = await mail.sendMail(options);

    console.log(here);
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
}

export default LocalAuth;
