import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createPool } from "./db.js";
const pool = createPool();
try {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter((s) => s.trim()))
    await pool.query(statement);
  console.log("Notes tables are ready.");
} finally {
  await pool.end();
}
