import type { NextFunction, Request, Response } from "express";

export type PostProcessType = "ALREADY-USER" | "NEW-USER" | "INVALID-CODE";

export interface LoginAuthConfig<T extends string> {
  path: string;
  role: T;
  //   scope:
}

export type Body<T extends Object> = {
  type: PostProcessType;
  message?: string;
  data?: T;
};

export type PostprocessRequest<T> = (
  body: Body<T>,
  req: Request,
  res: Response
) => Promise<void> | void;

export type LocalMiddlewareRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

export type GoogleScopes = "email" | "openid" | "profile"