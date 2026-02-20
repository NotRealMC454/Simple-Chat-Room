import {
  loadHistory,
  saveHistory,
  chatHistory,
  ChatMessage,
  getChannels,
  createChannel,
  deleteChannel,
} from "./utils/historyManagement";

import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { db, hashPwd, saveDB, loadDb } from "./utils/db";

interface ExtendedWebSocket extends WebSocket {
  currentChannel: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const CHUNK_SIZE = 15;

app.use(express.static(path.join(__dirname, "dist")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use(express.json());

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, Date.now() + "-" + Math.floor(Math.random() * 1000) + "." + ext);
  },
});

const upload = multer({ storage: storage, limits: { fileSize: 5368709120 } });
app.post("/upload", upload.single("mediaFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: "/uploads/" + req.file.filename });
});

loadHistory();
saveHistory();
loadDb();

function broadcastChannels() {
  const channels = getChannels();
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "channels", channels }));
    }
  });
}

wss.on("connection", (ws: ExtendedWebSocket) => {
  ws.currentChannel = "general";

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      // Auth
      case "register": {
        const user = data.user.trim();
        if (db.users[user]) {
          return ws.send(
            JSON.stringify({ type: "auth_error", msg: "Username taken!" }),
          );
        }

        db.users[user] = { password: hashPwd(data.pass), servers: ["MAIN"] };
        saveDB(db);

        ws.send(
          JSON.stringify({
            type: "auth_success",
            user: user,
            myServers: db.users[user].servers,
            allServers: db.servers,
          }),
        );
      }
      case "login": {
        const user = data.user.trim();
        if (!db.users[user] || db.users[user].password !== hashPwd(data.pass)) {
          return ws.send(
            JSON.stringify({ type: "auth_error", msg: "Invalid credentials." }),
          );
        }

        ws.send(
          JSON.stringify({
            type: "auth_success",
            user: user,
            myServers: db.users[user].servers,
            allServers: db.servers,
          }),
        );
      }

      case "join": {
        if (!chatHistory[data.channel]) {
          chatHistory[data.channel] = [];
          saveHistory();
          broadcastChannels();
        }
        ws.currentChannel = data.channel;
        const messages = chatHistory[data.channel] || [];
        ws.send(
          JSON.stringify({
            type: "history",
            channel: data.channel,
            messages: messages.slice(-CHUNK_SIZE),
          }),
        );
        break;
      }
      case "createChannel": {
        const newChannel = data.name?.toLowerCase().trim();
        if (newChannel && createChannel(newChannel)) {
          broadcastChannels();
          ws.send(JSON.stringify({ type: "channelCreated", name: newChannel }));
        }
        break;
      }
      case "deleteChannel": {
        const delChannel = data.name?.toLowerCase().trim();
        if (deleteChannel(delChannel)) {
          broadcastChannels();
          ws.send(JSON.stringify({ type: "channelDeleted", name: delChannel }));
        }
        break;
      }
      case "message": {
        if (!chatHistory[data.channel]) {
          chatHistory[data.channel] = [];
        }

        const msgObj: ChatMessage = {
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          user: data.user,
          text: data.text,
          media: data.media,
          mediaType: data.mediaType,
          likes: 0,
        };

        chatHistory[data.channel].push(msgObj);

        if (chatHistory[data.channel].length > 100)
          chatHistory[data.channel].shift();

        saveHistory();

        wss.clients.forEach((client) => {
          const extClient = client as ExtendedWebSocket;
          if (
            extClient.readyState === WebSocket.OPEN &&
            extClient.currentChannel === data.channel
          ) {
            extClient.send(JSON.stringify({ type: "message", ...msgObj }));
          }
        });
        break;
      }
      case "like": {
        const roomMessages = chatHistory[data.channel] || [];
        const msg = roomMessages.find((m) => m.id === data.messageId);
        if (msg) {
          msg.likes = (msg.likes || 0) + 1;
          saveHistory();
          wss.clients.forEach((client) => {
            const extClient = client as ExtendedWebSocket;
            if (
              extClient.readyState === WebSocket.OPEN &&
              extClient.currentChannel === data.channel
            ) {
              extClient.send(
                JSON.stringify({ type: "updateLikes", id: msg.id, likes: msg.likes }),
              );
            }
          });
        }
        break;
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ultimate Chat Server running on port ${PORT}`);
});
