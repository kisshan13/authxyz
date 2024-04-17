import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { cookieName } from "./sign.js";

type ErrorHandler = (error: Error) => {
  message: string;
  status: number;
};

type LocalMiddlewareRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

interface ProtectedMiddlewareOptions {
  secret: string;
  adapter: DatabaseAdapter;
  validationMethod: "JWT" | "COOKIE";
}

export interface AdapterMethodResult {
  status: number;
  message: string;
  data: any;
}

type DatabaseAdapter = {
  addUser: (data: any) => Promise<any>;
  getUser: (data: any) => Promise<any>;
  updateUser: (data: { id: string; update: Object }) => Promise<any>;

  handlers: ErrorHandler[];
};

type Middleware<T> = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<MiddlewareProcessAcknowlege<T>>;

interface MiddlewareProcessAcknowlege<T> {
  status: boolean | "error";
  data: T;
}

function middlewareProtect(
  roles: string[],
  secret: string,
  adapter: DatabaseAdapter,
  validationMethod: "JWT" | "COOKIE"
): Middleware<any> {
  const useAuthorization = middlewareValidateAuthorization({
    secret: secret,
    method: validationMethod,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const isAuthenticated = await useAuthorization(req, res, next);

    console.log(isAuthenticated);

    if (isAuthenticated.status !== "error" && isAuthenticated.status) {
      const user = await adapter.getUser({ id: isAuthenticated.data.id });

      console.log(user);

      if (roles.includes(user?.role)) {
        return {
          data: null,
          status: true,
        };
      }

      res.status(401).json({ message: "Unauthorized (Missing permission)" });
      return {
        data: null,
        status: false,
      };
    }
  };
}

function middlewareValidateAuthorization({
  secret,
  method,
}: {
  secret: string;
  method: "JWT" | "COOKIE";
}): Middleware<null | { id: string }> {
  return async (req: Request, res: Response, next: NextFunction) => {
    switch (method) {
      case "JWT":
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
          res.status(401).json({ message: "Invalid Auth token" });
          return {
            data: null,
            status: false,
          };
        }

        const isValid = jwt.verify(token, secret);

        if (typeof isValid === "object") {
          return {
            data: {
              id: isValid?.id,
            },
            status: true,
          };
        }

        res.status(401).json({ message: "Invalid Auth token" });

        return {
          data: null,
          status: false,
        };
      case "COOKIE":
        const cookieInfo = req.signedCookies[cookieName];

        if (!cookieInfo) {
          res.status(401).json({ message: "Invalid Auth token" });
          return {
            data: null,
            status: false,
          };
        }

        return {
          data: { id: cookieInfo?.id },
          status: true,
        };
    }
  };
}

function useProtect<T extends string>(
  roles: T[],
  { secret, adapter, validationMethod }: ProtectedMiddlewareOptions
): LocalMiddlewareRegister {
  const useProtected = middlewareProtect(
    roles,
    secret,
    adapter,
    validationMethod
  );

  return async (req, res, next) => {
    const isAuthenticated = await useProtected(req, res, next);

    if (isAuthenticated.status) {
      next();
    }
  };
}

export { middlewareValidateAuthorization, middlewareProtect, useProtect };
