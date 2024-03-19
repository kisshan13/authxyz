import type { NextFunction, Request, Response } from "express";

export interface GoogleAuthOptions {
  auth: "JWT" | "COOKIE";
}

export type PostProcessType =
  | "ALREADY-USER"
  | "NEW-USER"
  | "INVALID-CODE"
  | "AUTH-URL";

export interface AuthConfig<T> {
  path: string;
  role: T;
}

export interface AuthUrl {
  url: string;
  state: string;
}

export interface AuthUrlConfig<T> extends AuthConfig<T> {
  scope?: string;
  redirect?: boolean;
}

export type Body<T extends Object> = {
  type?: PostProcessType;
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

export type GoogleScopes = "email" | "openid" | "profile";
export interface AdapterMethodResult {
  status: number;
  message: string;
  data: any;
}

export type DatabaseAdapter = {
  addUser: (data: any) => Promise<AdapterMethodResult>;
  getUser: (data: any) => Promise<AdapterMethodResult>;
  updateUser: (data: {
    id: string;
    update: Object;
  }) => Promise<AdapterMethodResult>;

  handlers: ErrorHandler[];
};

export type ErrorHandler = (error: Error) => {
  message: string;
  status: number;
};
