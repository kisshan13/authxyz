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

    return {
      status: 201,
      message: "User Details are: ",
      data: newUser.toJSON(),
    };
  }

  async getUser(user: GetUser | Object) {
    
    const userFilter = {
      ...(user["email"] && { email: user["email"] }),
      ...(user["id"] && { _id: user["id"] }),
    };

    const foundUser = await this.#user.findOne(userFilter);

    if (!foundUser) {
      return null;
    }

    return {
      status: 200,
      message: "User Details are: ",
      data: foundUser.toJSON(),
    };
  }
}

export default MongoAdapter;
