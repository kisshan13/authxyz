![Logo](https://cdn.discordapp.com/attachments/1183600181405564992/1219558690604974091/authxyz-google.png?ex=660bbd8a&is=65f9488a&hm=7c48cdf445ebfd14fb46ac8d405d5fddb4d3eeadc00186ab26b16c6fb31a5af1&)

#

`@authxyz/provider-google` official [authxyz](https://github.com/kisshan13/authxyz) library for google authentication. [See Documentation](https://authenticjs.com)

## Quickstart

- Installation

```bash
npm i @authxyz/provider-google @authxyz/adapater-mongodb
```

- Example

```js
import express from "express";
import mongoose from "mongoose";
import MongoAdapter from "@authxyz/adapter-mongodb";

import Google from "@authxyz/provider-google";

const database = mongoose.createConnection("<database-connection-uri>");

const adapter = new MongoAdapter({
  database: database,
});

adapter.addUserSchema();

const app = express();

const googleAuth = new Google({
  auth: "JWT",
  adapter,
  clientId: "<client-id>",
  clientSecret: "<client-secret>",
  redirectUrl: "http://localhost:3000/api/client/onboard",
  roles: ["user", "admin"],
  options: {
    stateSecret: "this is a state secret",
    jwtOptions: {
      expiresIn: "7days",
    },
    authSecret: "this is a auth secret",
  },
});

app.use(googleAuth.auth({ path: "/auth/google", role: "user" }));
app.use(googleAuth.callback({ path: "/auth/google/callback" }));

app.listen(3000, () => {
  console.log("App running at port 3000");
});
```

You can this example on [Github]("https://github.com/kisshan13/authxyz/tree/main/packages/providers/google/examples")
