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
