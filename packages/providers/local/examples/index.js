import express from "express";
import mongoose from "mongoose";
import { createTransport } from "nodemailer";

import LocalAuth from "../dist/index.js";
import MongoAdapter from "@authxyz/adapter-mongodb"

const app = express();

app.use(express.json());

const database = mongoose.createConnection("mongodb+srv://ks492013:ks492013@cluster0.jutd3d1.mongodb.net/authxyz-local-test?retryWrites=true&w=majority&appName=Cluster0")

const adapter = new MongoAdapter({
    database: database
})

adapter.addUserSchema();

const localAuth = new LocalAuth({
    roles: ["user"],
    adapter: adapter,
    auth: {
        options: { expiresIn: "7days" },
        type: "JWT",
        secret: "SECRET"
    }
});

const mail = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "<your-mail-client>",
        pass: "<your-mail-password>"
    }
});

localAuth.mailConfig(mail);

app.use(localAuth.login("/login", { role: "user" }));
app.use(localAuth.register("/api/register", { role: "user" }));
app.use(localAuth.forgotPassword("/forgot-password", { role: "user" }));
app.use(localAuth.resetPassword("/reset-password", { role: "user" }))

app.get("/", localAuth.protect(["user"]), (req, res) => res.send("protected route"))

localAuth.addTrigger("onLogin", ({ verificationCode, user }) => {
    const email = user["email"];

    console.log(user)
    return {
        config: {
            body: "Verification Code",
            subject: verificationCode,
            to: email,
            type: "text"
        },
        type: "onLogin"
    }
});

localAuth.addTrigger("onForgotPassword", (options) => {
    const email = options.user["email"];

    return {
        config: {
            body: "Verification Code",
            subject: options["verificationCode"],
            to: email,
            type: "text"
        },
        type: "onForgotPassword"
    }
})

app.listen(3000, () => {
    console.log("App running on port 3000");
});