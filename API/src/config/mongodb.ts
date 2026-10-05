import "dotenv/config";

import mongoose from "mongoose";
import dns from "dns";

import { MongodbConfig } from "./app-env";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

(async () => {
  try {
    if (!MongodbConfig.url) {
      throw new Error(
        "MONGODB_URL is not defined in .env"
      );
    }

    await mongoose.connect(MongodbConfig.url, {
      dbName: MongodbConfig.dbName,
      autoCreate: true,
      autoIndex: true,
    });

    console.log(
      "**** Mongodb connected successfully ****"
    );
  } catch (error) {
    console.error(
      "**** Error Mongodb connection ****"
    );

    console.error(error);

    process.exit(1);
  }
})();