import fs from "fs";
import crypto from "crypto";
import { database } from "./types";

const DB_FILE = "database.json";

export let db: database = {
  users: {},
  servers: {
    MAIN: {
      name: "Global Public Server",
      owner: "system",
      channels: ["general", "gaming", "random", "space-shooter"],
      pfp: "",
    },
  },
};

export function loadDb() {
  db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  // Migration: Ensure old servers have the new channel/pfp arrays
  for (let s in db.servers) {
    if (!db.servers[s].channels) db.servers[s].channels = ["general"];
    if (!db.servers[s].pfp) db.servers[s].pfp = "";
  }
}

export function saveDB(db: database) {
  fs.writeFile(DB_FILE, JSON.stringify(db), (err) => {
    if (err) console.error(err);
  });
}

export function hashPwd(pwd: string) {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}
