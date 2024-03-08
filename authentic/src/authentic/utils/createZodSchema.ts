import { z } from "zod";
import { PayloadSchema } from "../shared";

function createZodSchema(payload: PayloadSchema[]) {
  const schema = z.object(
    Object.fromEntries(
      payload.map((field) => [
        field.name,
        field.optional ? z.string().optional() : z.string(),
      ])
    )
  );
  return schema;
}

export default createZodSchema;
