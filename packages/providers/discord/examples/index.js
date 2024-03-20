import express from "express";
import mongoose from "mongoose";
import MongoAdapter from "@authxyz/adapter-mongodb";
 import Discord from "@authxyz/provider-discord";


const database = mongoose.createConnection("<your-database-connection-url>");

const adapter = new MongoAdapter({
    database: database,
});

adapter.addUserSchema();

const app = express();

const googleAuth = new Discord({
    auth: "JWT",
    adapter,
    clientId: "<cliend-id>",
    clientSecret: "<client-secret>",
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
app.use(googleAuth.callback({ path: "/auth/discord/callback" }));

app.listen(3000, () => {
    console.log("App running at port 3000");
});