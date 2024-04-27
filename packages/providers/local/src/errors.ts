export class NoSecretTokenError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
  }
}

export class AdapterError extends Error {
  constructor(message: string) {
    super();
    this.message = message; 
  }
}
