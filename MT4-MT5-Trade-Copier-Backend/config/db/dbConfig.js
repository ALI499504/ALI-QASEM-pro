var user = process.env.DB_USER || "postgres";
var host = process.env.DB_HOST || "localhost";
var database = process.env.DB_NAME || "ticklab_db";
var password = process.env.DB_PASS || "password";
var port = process.env.DB_PORT || 5432;

// Support DATABASE_URL (used by Render, Neon, Supabase)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  user = url.username;
  host = url.hostname;
  database = url.pathname.slice(1);
  password = url.password;
  port = url.port || 5432;
}

module.exports = { user, host, database, password, port };
