import express from "express";
import mongoose from "mongoose";
import MongoAdapter from "@authxyz/adapter-mongodb";

import Discord from "../dist/index.js";

const database = mongoose.createConnection("mongodb+srv://ks492013:ks492013@cluster0.jutd3d1.mongodb.net/discord-test?retryWrites=true&w=majority&appName=Cluster0");

const adapter = new MongoAdapter({
    database: database,
});

adapter.addUserSchema();

const app = express();

const googleAuth = new Discord({
    auth: "JWT",
    adapter,
    clientId: "1073528049284436018",
    clientSecret: "2g31RUb3He5Pc0X-6LttSIzhNWknvK5V",
    redirectUrl: "http://localhost:3000/auth/discord/callback",
    roles: ["user", "admin"],
    options: {
        stateSecret: "this is a state secret",
        jwtOptions: {
            expiresIn: "7days",
        },
        authSecret: "this is a auth secret",
    },
});

app.use(googleAuth.auth({ path: "/auth/discord", role: "user" }));
app.use(googleAuth.callback({ path: "/auth/discord/callback" }, ({ user }, req, res) => { console.log(user) }));

app.listen(3000, () => {
    console.log("App running at port 3000");
});