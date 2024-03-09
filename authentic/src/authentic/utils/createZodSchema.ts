import { z } from "zod";
import { PayloadSchema } from "../shared.js";

function createZodSchema(payload: PayloadSchema[]) {
  const fields = {};
  payload.forEach((field) => {
    fields[field.name] = field.optional ? z.string().optional() : z.string();
  });
  const schema = z.object({
    ...fields,
  });

  return schema;
}

export default createZodSchema;
