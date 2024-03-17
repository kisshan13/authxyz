import type { Request, Response, NextFunction } from "express";

export type PayloadSchema = { name: string; optional: boolean };
export type PayloadValidation = (data: any) => Object;

export type ErrorHandler = (error: Error) => {
  message: string;
  status: number;
};

export type PostprocessRequest<T> = (
  body: Body<T>,
  req: Request,
  res: Response
) => Promise<void> | void;

export type Body<T extends Object> = {
  type: PostProcessType;
  message?: string;
  data?: T;
};

export type PostProcessType =
  | "USER-NOT-FOUND"
  | "WRONG-PASSWORD"
  | "TOKEN"
  | "VERIFICATION-SENT"
  | "USER-VERIFIED"
  | "INVALID-VERIFICATION"
  | "INVALID-CODE"
  | "PASSWORD-CHANGE";

export type CoreMiddleware = LocalMiddlewareRegister;

export type LocalMiddlewareRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

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
