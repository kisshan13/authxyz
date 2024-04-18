import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";

import MongoAdapter from "@authxyz/adapter-mongodb"
import Local from "@authxyz/local";

config();

const app = express();

app.use(express.json());

const database = mongoose.createConnection(process.env.DATABASE_URL)

const adapter = new MongoAdapter({
    database: database
})

adapter.addUserSchema();

const localAuth = new Local({
    roles: ["user"],
    adapter: adapter,
    auth: {
        options: { expiresIn: "7days" },
        type: "JWT",
        secret: process.env.JWT_SECRET
    }
});

app.use(localAuth.login("/api/login", { role: "user" }));
app.use(localAuth.register("/api/register", { role: "user" }));

app.listen(3000, () => {
    console.log("App running on port 3000");
});