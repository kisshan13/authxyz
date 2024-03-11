import mongoose, { Schema } from "mongoose";

import { SchemaRegisterOptions } from "../shared.js";

export function registerUserSchema(
  database: mongoose.Connection,
  options: SchemaRegisterOptions
) {
  const schema = new Schema({
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    ...(typeof options?.schema === "object" ? { ...options.schema } : {}),
  });

  const model = database.model(options?.name || "users", schema);

  return model;
}
