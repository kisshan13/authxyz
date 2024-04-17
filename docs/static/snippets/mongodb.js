import express from "express";
import mongoose from "mongoose";
import * as fs from "fs"
import cookieParser from "cookie-parser";

import authxyz from "@authxyz/provider-local"
import MongoAdapter from "@authxyz/adapter-mongodb"

import { z } from "zod";


const database = mongoose.createConnection("<database-connection-uri>")

const adapter = new MongoAdapter({
    database: database
});

adapter.addUserSchema();

const app = express();

const parser = cookieParser("this is a secret");

app.use(parser);

const authLocal = new authxyz.LocalAuth({
    validationMethod: "JWT",
    secret: "hello",
    roles: ["user", "admin"],
    adapter: adapter,
    options: {
        verification: true
    }
});

authLocal.mailConfig({
    mail: "<mail>",
    mailConfig: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "<mail>",
            pass: "<password>"
        }
    },
    templates: {
        register: () => fs.readFileSync("./register.ejs", "utf-8"),
        forgetPassword: () => fs.readFileSync("./register.ejs", "utf-8")
    }
})

app.use(express.json());

const zodSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

app.use(authLocal.register({ path: "/register", role: "admin", body: (body) => zodSchema.parse(body) }));

app.use(authLocal.login({ path: "/login", role: "user", body: (body) => zodSchema.parse(body) }))

app.use(authLocal.resetPasswordRequest("/reset"));
app.use(authLocal.resetPassword("/reset/password"));

app.get("/", authLocal.protect("user"), (req, res) => {
    res.send("Have permissions");
});

app.listen(3000, () => {
    console.log("Running");
});
