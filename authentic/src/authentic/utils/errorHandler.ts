import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";

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
