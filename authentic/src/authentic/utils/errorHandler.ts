import { ZodError } from "zod";

export default function zodError(error: Error) {
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
