import { SQL } from "bun";
import { database } from "../../config";

// Initialize DB connection
export const sql = new SQL({
  host: database.host,
  port: database.port,
  user: database.user,
  password: database.password,
  database: database.name,
  adapter: "postgres",
  max: 10,
});
