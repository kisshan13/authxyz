import type { NextFunction, Request, Response } from "express";

import { PostProcessAuth, PreProcessAuth } from "./local.js";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

const { JsonWebTokenError, TokenExpiredError } = jwt;

export function zodError(error: Error) {
  if (error instanceof ZodError) {
    const message = JSON.parse(error.message);
    const errorMessages = message.map((errorMsg) => {
      const fieldName =
        errorMsg.path?.length === 2 ? errorMsg.path[1] : errorMsg.path[0];
      const errorMessage = errorMsg.message;
      return `${fieldName}: ${errorMessage}`;
    });

    return { message: errorMessages, status: 422 };
  }
}

export function jwtError(error: Error) {
  if (error instanceof JsonWebTokenError) {
    return { message: "Invalid auth token", status: 401 };
  } else if (error instanceof TokenExpiredError) {
    return { message: "Token expired", status: 401 };
  }
}

export function duplicateDocHandler(error: Error) {
  if (error instanceof Error) {
    if (error.message.includes("E11000 duplicate key error")) {
      const alreadyExists = Object.keys(error["keyValue"]);
      return {
        status: 400,
        message: `${alreadyExists.join()} already exists`,
      };
    }
  }
}

type Controller = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

interface RequestProcessors<T extends object> {
  pre?: PreProcessAuth;
  main: Controller;
  post?: PostProcessAuth<T>;
}

export function asyncHandler(controller: Controller) {
  return async (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(controller(req, res, next)).catch((err) => {
      let handlers = [jwtError, zodError, duplicateDocHandler];

      for (const handler of handlers) {
        const error = handler(err);
        if (error) {
          return res.status(error.status).json({ error: error.message });
        }
      }
      return res.send(err);
    });
  };
}

export function withRequestProcessors<T extends Object>(
  path: string,
  processors: RequestProcessors<T>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (path === req.path) {
      const { pre, main, post } = processors;

      if (pre) {
        const stopRequest = await Promise.resolve(!pre(req, res, next));
        if (stopRequest) {
          return;
        }
      }

      const context = await main(req, res, next);

      if (post && context?.context) {
        post(context?.context as T, req, res);
      } else {
        context?.resolveMainHandler();
      }
    } else {
      next();
    }
  };
}
