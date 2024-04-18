import jwt from "jsonwebtoken";

const { JsonWebTokenError, TokenExpiredError } = jwt;

export type ErrorHandler = (error: Error) => {
  message: string;
  status: number;
};

export function errorFormatter(err: Error, handlers: ErrorHandler[]) {
  let response = null as { message: string; status: number };

  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    response = handler(err);

    if (response) {
      break;
    }
  }

  return response || { message: "Internal server error", status: 500 };
}

export function jwtError(error: Error) {
  if (error instanceof JsonWebTokenError) {
    return { message: "Invalid auth token", status: 401 };
  } else if (error instanceof TokenExpiredError) {
    return { message: "Token expired", status: 401 };
  }
}
