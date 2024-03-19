![Logo](https://media.discordapp.net/attachments/1183600181405564992/1219535288729210990/authxyz-adapater.png?ex=660ba7be&is=65f932be&hm=915bca42ee9134640852b13549205ad2310ffc12778b2ba7a637763a7d99c8a4&=&format=webp&quality=lossless&width=1440&height=276)

#

`@authxyz/adapater-mongodb` official [authxyz](https://github.com/kisshan13/authxyz) adapter for mongodb database. [See Documentation](https://authenticjs.com)

## Quickstart

- Installation

```bash
npm i @authxyz/adapater-mongodb
```

- Adapater Initialization

```js
import Mongo from "@authxyz/adapater-mongodb";

const database = mongoose.createConnection("<your-connection-uri>");

const adapter = new MongoAdapter({
  database: database,
});

adapter.addUserSchema();
```
