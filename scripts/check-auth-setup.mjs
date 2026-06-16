import fs from "node:fs";
import net from "node:net";

const root = new URL("../", import.meta.url);
const path = file => new URL(file, root);
const exists = file => fs.existsSync(path(file));

function readEnv() {
  if (!exists(".env")) return {};
  return Object.fromEntries(
    fs.readFileSync(path(".env"), "utf8")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1).replace(/^["']|["']$/g, "")];
      })
  );
}

function status(ok, label, detail = "") {
  const mark = ok ? "PASS" : "MISSING";
  console.log(`${mark.padEnd(8)} ${label}${detail ? ` - ${detail}` : ""}`);
}

function checkPort(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: 900 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

const env = readEnv();
const port = Number(env.PORT || 4174);
let databasePort = 5432;
try {
  databasePort = Number(new URL(env.DATABASE_URL).port || 5432);
} catch {
  databasePort = 5432;
}

status(exists("package.json"), "package.json exists");
status(exists("server.js"), "server.js exists");
status(exists("db/schema.sql"), "Postgres schema exists");
status(exists("node_modules"), "node_modules installed", "run npm install");
status(exists(".env"), ".env exists", "copy .env.example to .env and fill values");
status(Boolean(env.DATABASE_URL), "DATABASE_URL set");
status(await checkPort(databasePort), `Postgres listening on port ${databasePort}`, "install/start Postgres and create the liquiditylens database");
status(Boolean(env.JWT_SECRET && !env.JWT_SECRET.includes("replace-with")), "JWT_SECRET set to a real secret");
status(Boolean(env.COOKIE_SECRET && !env.COOKIE_SECRET.includes("replace-with")), "COOKIE_SECRET set to a real secret");
status(Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), "Google OAuth credentials set");
status(Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET), "Microsoft OAuth credentials set");
status(await checkPort(port), `server listening on port ${port}`, "run npm run dev");

console.log("\nOpen the app at http://localhost:" + port + " after every PASS above is true.");
