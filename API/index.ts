import "dotenv/config";
import http from "http";

import app from "./src/app.ts";

const server = http.createServer(app);

// listen
const HOST = "127.0.0.1";

// 0-(2^16 - 1)
const PORT = 9005;

server.listen(PORT, HOST, () => {
    console.log("Server is running in the port " + PORT);
    console.log("To disconnect server, press CTRL+C");
});

server.on("error", (err) => {
    console.error(err);
    console.log("Server error ", err.message);
    process.exit(1);
});
