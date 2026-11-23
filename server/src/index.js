import "dotenv/config";
import { createPool, MysqlRepository } from "./db.js";
import { createApp } from "./app.js";
const pool = createPool();
const app = createApp({ repository: new MysqlRepository(pool) });
const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log("Notes API: http://127.0.0.1:3001"),
);
async function stop() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
