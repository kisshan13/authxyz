import mongoose from "mongoose";
import { config } from "dotenv";

import MongoAdapter from "@authxyz/adapter-mongodb"
import Local from "@authxyz/local";

config();

const app = express();

app.use(express.json())

app.listen(3000, () => {
    console.log("App running on port 3000");
});