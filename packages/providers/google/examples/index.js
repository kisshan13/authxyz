import express from "express";
import mongoose from "mongoose";
import MongoAdapter from "@authxyz/adapter-mongodb";

import Google from "../dist/index.js";

const database = mongoose.createConnection(
    "mongodb+srv://ks492013:ks492013@cluster0.jutd3d1.mongodb.net/authetic-test?retryWrites=true&w=majority&appName=Cluster0"
);

const adapter = new MongoAdapter({
    database: database,
});

adapter.addUserSchema();

const app = express();

const googleAuth = new Google({
    auth: "JWT",
    adapter,
    clientId:
        "808594364348-ucirj4h7g4a2tg50grm5u1bq8md7kl42.apps.googleusercontent.com",
    clientSecret: "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",
    redirectUrl: "http://localhost:3000/api/client/onboard",
    roles: ["user", "admin"],
    options: {
        stateSecret: "this is a state secret",
        jwtOptions: {
            expiresIn: "7days"
        },
        authSecret: "this is a auth secret"
    }
});

app.use(googleAuth.auth({ path: "/auth/google", role: "user" }))
app.use(googleAuth.callback({ path: "/api/client/onboard" }))

app.listen(3000, () => {
    console.log("App running at port 3000")
})
