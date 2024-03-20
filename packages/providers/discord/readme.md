![Logo](https://media.discordapp.net/attachments/1183600181405564992/1219857608643448963/authxyz-discord.png?ex=660cd3ed&is=65fa5eed&hm=af88100af3f1c1e005db0472876a42b8dd5258487e4b45a201ab8958288c1d5e&=&format=webp&quality=lossless&width=1440&height=276)

#

`@authxyz/provider-discord` official [authxyz](https://github.com/kisshan13/authxyz) library for discord authentication. [See Documentation](https://authenticjs.com)

## Quickstart

- Installation

```bash
npm i @authxyz/provider-discord @authxyz/adapater-mongodb
```

- Example

```js
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
```

You can this example on [Github]("https://github.com/kisshan13/authxyz/tree/main/packages/providers/discord/examples")
