import mongoose, { Model, Document } from "mongoose";

import { SchemaConfig } from "./shared.js";
import { registerUserSchema } from "./schema/user.js";

interface MongoAdapterConfig {
  database: mongoose.Connection;
}

interface UserCreate {
  name?: string;
  password: string;
  email: string;
}

interface GetUser {
  email?: string;
  id?: string;
}

class MongoAdapter<T extends Document> {
  #database: mongoose.Connection;
  #user: Model<T>;
  constructor({ database }: MongoAdapterConfig) {
    this.#database = database;
    this.#user = null as Model<T>;
  }

  addUserSchema(model?: Model<T>, options?: { schema: SchemaConfig }) {
    if (model) {
      this.#user = model;
    } else {
      this.#user = registerUserSchema(this.#database, {
        schema: options?.schema,
      }) as any as Model<T>;
    }
  }

  async addUser(user: UserCreate | Object) {
    const newUser = new this.#user({ ...user });

    await newUser.save();

    delete newUser["password"];

    return newUser.toJSON();
  }

  async getUser(user: GetUser | Object) {
    const foundUser = await this.#user.findOne(user);

    if (!foundUser) {
      return null;
    }

    return foundUser.toJSON();
  }
}

export default MongoAdapter;
