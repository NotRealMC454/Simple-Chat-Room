import { loadHistory, saveHistory, chatHistory, ChatMessage, getChannels, createChannel, deleteChannel } from "./utils/historyManagement";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

interface ExtendedWebSocket extends WebSocket {
  currentChannel: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server, maxPayload: 100 * 1024 * 1024 });

app.use(express.static(path.join(__dirname, "src/")));

loadHistory();
saveHistory();

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

  ws.send(
    JSON.stringify({
      type: "channels",
      channels: getChannels(),
    }),
  );

  ws.on("message", (message: Buffer) => {
    const data = JSON.parse(message.toString());
    const channel = data.channel?.toString().toLowerCase().trim() || "general";

    switch (data.type) {
      case "join": {
        if (!chatHistory[channel]) {
          chatHistory[channel] = [];
          saveHistory();
          broadcastChannels();
        }
        ws.currentChannel = channel;
        ws.send(
          JSON.stringify({
            type: "history",
            channel: channel,
            messages: chatHistory[channel] || [],
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
        if (!chatHistory[channel]) {
          chatHistory[channel] = [];
        }

        const msgObj: ChatMessage = {
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          user: data.user,
          text: data.text,
          media: data.media,
          mediaType: data.mediaType,
          likes: 0,
        };

        chatHistory[channel].push(msgObj);

        if (chatHistory[channel].length > 100)
          chatHistory[channel].shift();

        saveHistory();

        wss.clients.forEach((client) => {
          const extClient = client as ExtendedWebSocket;
          if (
            extClient.readyState === WebSocket.OPEN &&
            extClient.currentChannel === channel
          ) {
            extClient.send(JSON.stringify({ type: "message", ...msgObj }));
          }
        });
        break;
      }
      case "like": {
        if (!chatHistory[channel]) break;
        const msg = chatHistory[channel].find(
          (m) => m.id === data.messageId,
        );
        if (msg) {
          msg.likes++;
          saveHistory();
          wss.clients.forEach((client) => {
            const extClient = client as ExtendedWebSocket;
            if (
              extClient.readyState === WebSocket.OPEN &&
              extClient.currentChannel === channel
            ) {
              extClient.send(
                JSON.stringify({
                  type: "updateLikes",
                  id: msg.id,
                  likes: msg.likes,
                }),
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
