import type { SignOptions } from "jsonwebtoken";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import type { Transporter } from "nodemailer";

import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import bcrypt from "bcrypt";
import core from "@authxyz/core";

import { DatabaseAdapter } from "./types.js";
import { asyncHandler, withRequestProcessors } from "./utils.js";
import { registerSchema, resetPasswordSchema } from "./validation.js";
import MailResponder, { MailType } from "@authxyz/mail";
import NodeCache from "node-cache";

import { forgotPasswordSchema, verificationSchema } from "./validation.js";

interface AuthType {
  type: "JWT" | "COOKIE";
  options: SignOptions | CookieOptions;
  secret?: string;
  verification: boolean;
}

export type PreProcessAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => boolean;

export type PostProcessAuth<T extends Object> = (
  context: T,
  req: Request,
  res: Response
) => void;

interface HandlerOptions<T, J> {
  role: T;
  body: (payload: any) => Object;
  pre?: PreProcessAuth;
  post?: PostProcessAuth<J>;
}

interface LocalAuthOption<T extends string> {
  roles: T[];
  adapter: DatabaseAdapter;
  auth: AuthType;
  mailClient?: Transporter<SMTPTransport.SentMessageInfo>;
}

interface MailEvent<T> {
  type: MailType;
  callback: MailCallback<T>;
}

type MailCallback<T extends Object> = (options: T) => MailResponder;

interface MailEventConfig {
  onRegister: MailCallback<{ user: Object; verificationCode: number }>;
  onForgotPassword: MailCallback<{ user: Object; verificationCode: number }>;
  onLogin: MailCallback<{ user: Object }>;
  onPasswordChange: MailCallback<{ user: Object }>;
}

class Local<T extends string> {
  #roles: T[];
  #adapter: DatabaseAdapter;
  #auth: AuthType;
  #mailConfig: MailEventConfig;
  #verifications: NodeCache;
  #resetCodes: NodeCache;
  #mailClient: Transporter<SMTPTransport.SentMessageInfo>;
  constructor({ roles, adapter, auth, mailClient }: LocalAuthOption<T>) {
    this.#roles = roles;
    this.#adapter = adapter;
    this.#auth = auth;
    this.#mailConfig = {} as MailEventConfig;
    this.#mailClient = mailClient;
    this.#verifications = new NodeCache({ stdTTL: 60 * 5 * 1000 });
    this.#resetCodes = new NodeCache({ stdTTL: 60 * 5 * 1000 });
  }

  protect(roles: T[]) {
    return core.middlewares.useProtect(roles, {
      secret: this.#auth.secret,
      adapter: this.#adapter,
      validationMethod: this.#auth.type,
    });
  }

  register(
    path: string,
    {
      role,
      body,
      pre,
      post,
    }: HandlerOptions<T, { token: string; email: string; id: string }>
  ) {
    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const payload = body ? body(req.body) : registerSchema.parse(req.body);

        const passwordHash = bcrypt.hashSync(
          payload["password"],
          bcrypt.genSaltSync(10)
        );

        const user = await this.#adapter.addUser({
          ...payload,
          password: passwordHash,
          role: role,
          verified: false,
        });

        if (!user) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(500).json({ error: "Internal server error." }),
          };
        }

        const token = core.sign.signAuth({
          method: this.#auth.type,
          res,
          data: { id: user?.id || user?._id },
          secret: this.#auth.secret,
          options: {
            jwtOptions: this.#auth.options as SignOptions,
            cookieOptions: this.#auth.options as CookieOptions,
          },
        });

        const verificationCode = Math.ceil(Math.random() * 1000000);
        this.sendMail("onRegister", { user, verificationCode });

        return {
          context: { token, email: user?.email, id: user?.id || user?._id },
          resolveMainHandler: () => res.status(200).json({ token }),
        };
      } else {
        next();
      }
    });

    return withRequestProcessors(path, {
      main: handler,
      post: post,
      pre: pre,
    });
  }

  login(
    path: string,
    { role, body, pre, post }: HandlerOptions<T, { user: Object }>
  ) {
    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const payload = body ? body(req.body) : registerSchema.parse(req.body);

        const user = await this.#adapter.getUser({ email: payload["email"] });

        if (!user) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(401).json({ error: "User not found." }),
          };
        }

        const isPasswordMatched = bcrypt.compareSync(
          payload["password"],
          user["password"]
        );

        if (!isPasswordMatched) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(401).json({ error: "Invalid login credentials." }),
          };
        }

        const token = core.sign.signAuth({
          method: this.#auth.type,
          res,
          data: { id: user?.id || user?._id },
          secret: this.#auth.secret,
          options: {
            jwtOptions: this.#auth.options as SignOptions,
            cookieOptions: this.#auth.options as CookieOptions,
          },
        });

        console.log("Token :", token);

        this.sendMail("onLogin", { user, verificationCode: 0 });

        return {
          context: { user },
          resolveMainHandler: () => res.status(200).json({ token }),
        };
      } else {
        next();
      }
    });

    return withRequestProcessors(path, {
      pre: pre,
      main: handler,
      post: post,
    });
  }

  verify(
    path: string,
    { body, role, post, pre }: HandlerOptions<T, { user: Object }>
  ) {
    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const payload = body
          ? body(req.body)
          : verificationSchema.parse(req.body);
        const user = await this.#adapter.getUser({ email: req.body["email"] });

        if (!user) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(400).json({ error: "User not found." }),
          };
        }

        const verificationCode = this.#verifications.get(user["id"]);

        if (verificationCode !== payload["code"]) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(400).json({ error: "Invalid verification code." }),
          };
        }

        await this.#adapter.updateUser({
          id: user["id"] || user["_id"],
          update: { verified: true },
        });

        this.sendMail("onVerificationSuccess", {
          user: Object,
          verificationCode: payload["code"],
        });

        return {
          context: { user },
          resolveMainHandler: () => res.status(200).json({ message: "OK" }),
        };
      } else {
        next();
      }
    });

    return withRequestProcessors(path, {
      main: handler,
      post: post,
      pre: pre,
    });
  }

  resendVerification(
    path: string,
    {
      role,
      post,
      pre,
    }: HandlerOptions<T, { user: Object; verificationCode: Number }>
  ) {
    const useAuthenticated = core.middlewares.middlewareValidateAuthorization({
      secret: this.#auth.secret,
      method: this.#auth.type,
    });

    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "GET") {
        const isAuthenticated = await useAuthenticated(req, res);

        if (!isAuthenticated.status) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(401).json({ error: "Unauthorized" }),
          };
        }

        const user = await this.#adapter.getUser({
          id: isAuthenticated.data.id,
        });
        const verificationCode = Math.ceil(Math.random() * 1000000);

        this.sendMail("onVerificationResend", {
          user,
          verificationCode: verificationCode,
        });

        return {
          context: { user, verificationCode },
          resolveMainHandler: () => res.status(200).json({ verificationCode }),
        };
      }
    });

    return withRequestProcessors(path, {
      pre: pre,
      post: post,
      main: handler,
    });
  }

  forgotPassword(
    path: string,
    {
      body,
      role,
      post,
      pre,
    }: HandlerOptions<T, { user: Object; resetCode: number }>
  ) {
    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const payload = body
          ? body(req.body)
          : forgotPasswordSchema.parse(req.body);

        const user = await this.#adapter.getUser({ email: payload["email"] });

        if (!user) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(400).json({ error: "User not found." }),
          };
        }

        const resetCode = Math.ceil(Math.random() * 1000000);

        this.sendMail("onForgotPassword", {
          user,
          verificationCode: resetCode,
        });

        return {
          context: { user, resetCode },
          resolveMainHandler: () =>
            res.status(200).json({ message: "Password reset code sent." }),
        };
      } else {
        next();
      }
    });

    return withRequestProcessors(path, {
      pre: pre,
      main: handler,
      post: post,
    });
  }

  resetPassword(
    path: string,
    {
      body,
      role,
      post,
      pre,
    }: HandlerOptions<T, { email: string; user: Object }>
  ) {
    const handler = asyncHandler(async (req, res, next) => {
      if (req.path === path && req.method === "POST") {
        const payload = body
          ? body(req.body)
          : resetPasswordSchema.parse(req.body);

        const user = await this.#adapter.getUser({ email: payload["email"] });

        if (!user) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(400).json({ error: "User not found." }),
          };
        }

        const resetCode = this.#resetCodes.get(user["email"]);

        if (resetCode !== payload["code"]) {
          return {
            context: null,
            resolveMainHandler: () =>
              res.status(400).json({ error: "Invalid reset code." }),
          };
        }

        const passwordHash = bcrypt.hashSync(
          payload["password"],
          bcrypt.genSaltSync(10)
        );

        await this.#adapter.updateUser({
          id: user["id"] || user["_id"],
          update: { password: passwordHash },
        });

        this.sendMail("onPasswordChange", {
          user: Object,
          verificationCode: payload["code"],
        });

        return {
          context: { email: user["email"], user },
          resolveMainHandler: () =>
            res.status(200).json({ message: "Password Changed" }),
        };
      } else {
        next();
      }
    });

    return withRequestProcessors(path, {
      pre: pre,
      main: handler,
      post: post,
    });
  }

  addTrigger(
    type: MailType,
    callback: MailCallback<{ verificationCode?: number; user: Object }>
  ) {
    this.#mailConfig[type] = callback;
  }

  private async sendMail(
    type: MailType,
    { user, verificationCode }: { user: Object; verificationCode: number }
  ) {
    if (this.#mailConfig[type]) {
      const info = await Promise.resolve(
        this.#mailConfig[type]({ user, verificationCode })
      );

      if (
        verificationCode &&
        this.#auth.verification &&
        type === "onRegister"
      ) {
        this.#verifications.set(user["id"] || user["_id"], verificationCode);
      }

      if (verificationCode && type === "onForgotPassword") {
        this.#resetCodes.set(user["email"], verificationCode);
      }

      console.log(info);

      const hello = await this.#mailClient.sendMail({
        to: info.config.to,
        subject: info.config.subject,
        ...(info.config.type === "html"
          ? { html: info.config.body }
          : { text: info.config.body }),
      });

      console.log(hello);
    }
  }

  mailConfig(mailer: Transporter<SMTPTransport.SentMessageInfo>) {
    this.#mailClient = mailer;
  }
}

export default Local;
