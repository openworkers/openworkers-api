import { SQL } from "bun";

// Initialize DB connection
export const sql = new SQL({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "openworkers",
    adapter: "postgres",
    max: 10,
});
