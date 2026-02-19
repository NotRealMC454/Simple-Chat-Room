const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs'); // The File System module

const app = express();
const server = http.createServer(app);

// Increased max payload to 100MB to safely handle our 50MB file limit
const wss = new WebSocket.Server({ server, maxPayload: 100 * 1024 * 1024 }); 

app.use(express.static('public'));

const HISTORY_FILE = 'chat_history.json';
let chatHistory = { general: [], gaming: [], random: [] };

// Load history from file if it exists
if (fs.existsSync(HISTORY_FILE)) {
    const savedData = fs.readFileSync(HISTORY_FILE, 'utf8');
    chatHistory = JSON.parse(savedData);
    console.log("Chat history loaded from disk.");
}

// Helper function to save history to disk
function saveHistory() {
    fs.writeFile(HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
        if (err) console.error("Failed to save history:", err);
    });
}

wss.on('connection', (ws) => {
    ws.currentChannel = 'general';

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            ws.currentChannel = data.channel;
            ws.send(JSON.stringify({
                type: 'history',
                channel: data.channel,
                messages: chatHistory[data.channel]
            }));
            
        } else if (data.type === 'message') {
            const msgObj = { 
                id: Date.now().toString() + Math.floor(Math.random() * 1000),
                user: data.user, 
                text: data.text,
                media: data.media, // Changed from 'image' to 'media'
                mediaType: data.mediaType, // 'image' or 'video'
                likes: 0
            };
            
            chatHistory[data.channel].push(msgObj);
            
            // Keep the last 100 messages to prevent the JSON file from getting too massive
            if (chatHistory[data.channel].length > 100) chatHistory[data.channel].shift();
            
            saveHistory(); // Save to hard drive!

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && client.currentChannel === data.channel) {
                    client.send(JSON.stringify({ type: 'message', ...msgObj }));
                }
            });
            
        } else if (data.type === 'like') {
            const msg = chatHistory[data.channel].find(m => m.id === data.messageId);
            if (msg) {
                msg.likes++;
                saveHistory(); // Save the new like to the hard drive
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.currentChannel === data.channel) {
                        client.send(JSON.stringify({ type: 'updateLikes', id: msg.id, likes: msg.likes }));
                    }
                });
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ultimate Chat Server running on port ${PORT}`);
});