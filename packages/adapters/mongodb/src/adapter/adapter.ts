import mongoose, { Model, Document } from "mongoose";

import { ErrorHandler, SchemaConfig } from "./shared.js";
import { registerUserSchema } from "./schema/user.js";
import { duplicateDocHandler } from "./handler.js";
import { userInfo } from "os";

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

interface UpdateUser {
  id: string;
  update: Object;
}

class MongoAdapter<T extends Document> {
  #database: mongoose.Connection;
  #user: Model<T>;
  handlers: ErrorHandler[];
  constructor({ database }: MongoAdapterConfig) {
    this.#database = database;
    this.#user = null as Model<T>;
    this.handlers = [duplicateDocHandler];
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
    const userFilter = {
      ...(user["email"] && { email: user["email"] }),
      ...(user["id"] && { _id: user["id"] }),
    };

    const foundUser = await this.#user.findOne(userFilter).lean();

    if (!foundUser) {
      return null;
    }

    return foundUser;
  }

  async updateUser(user: UpdateUser) {
    const updatedUser = await this.#user
      .findByIdAndUpdate(user.id, user.update)
      .lean();

    if (!updatedUser) {
      return null;
    }

    return updatedUser;
  }
}

export default MongoAdapter;
