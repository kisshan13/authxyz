export type SchemaConfig = any;

export interface SchemaRegisterOptions {
  schema?: any;
  name?: string;
}

export type ErrorHandler = (error: Error) => {
  message: string;
  status: number;
};
