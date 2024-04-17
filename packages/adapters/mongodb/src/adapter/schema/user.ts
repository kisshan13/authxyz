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
    profileImage: String,
    role: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    provider: String,
    auth: {
      access_token: String,
      expires_in: Number,
      scope: String,
      token_type: String,
      refresh_token: String,
    },

    ...(typeof options?.schema === "object" ? { ...options.schema } : {}),
  });

  const model = database.model(options?.name || "users", schema);

  return model;
}
