export type PayloadSchema = { name: string; optional: boolean };

export interface AdapterMethodResult {
  status: number;
  message: string;
  data: any;
}

export type DatabaseAdapter = {
  addUser: (data: any) => Promise<AdapterMethodResult>;
  loginUser: (data: any) => Promise<AdapterMethodResult>;
};
