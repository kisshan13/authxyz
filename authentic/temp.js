import express from "express";
import mongoose from "mongoose";
import * as fs from "fs"
import authentic from "./dist/index.js"

import { z } from "zod";

import MongoAdapter from "mongo-adapter";

const database = mongoose.createConnection("mongodb+srv://ks492013:ks492013@cluster0.jutd3d1.mongodb.net/authetic-test?retryWrites=true&w=majority&appName=Cluster0")

const adapter = new MongoAdapter({
    database: database
});

adapter.addUserSchema();

const app = express();

const authLocal = new authentic.Local({
    secret: "hello",
    roles: ["user", "admin"],
    adapter: adapter,
    options: {
        validationMethod: "JWT",
        verification: true
    },
});

authLocal.configMail({
    mail: "gamekidzesport@gmail.com",
    mailConfig: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "gamekidzesport@gmail.com",
            pass: "jvjx xwsq orbe krhh"
        }
    },
    templates: {
        register: () => fs.readFileSync("./register.ejs", "utf-8")
    }
})

app.use(express.json());

const zodSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// app.use(authLocal.login("/login", { schema: [{ name: "email", optional: false }, { name: "password", optional: false }] }))
app.use(authLocal.register("/register", { schema: (data) => zodSchema.parse(data) }));
app.use(authLocal.register("/register/admin", { role: "user", schema: [{ name: "email", optional: false }, { name: "password", optional: false }] }));

app.get("/", authLocal.protect("user"), (req, res) => {
    res.send("Have permissions")
});

app.listen(3000, () => {
    console.log("Running")
});
