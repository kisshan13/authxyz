export type PayloadSchema = { name: string; optional: boolean };
export type PayloadValidation = (data: any) => Object;

export interface AdapterMethodResult {
  status: number;
  message: string;
  data: any;
}

export type DatabaseAdapter = {
  addUser: (data: any) => Promise<AdapterMethodResult>;
  getUser: (data: any) => Promise<AdapterMethodResult>;
};
