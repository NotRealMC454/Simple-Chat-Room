import fs from "fs";

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  media?: string;
  mediaType?: string;
  likes?: number;
}

export type ChatHistory = Record<string, ChatMessage[]>;

const HISTORY_FILE = "chat_history.json";
export const chatHistory: ChatHistory = {};

export function getChannels(): string[] {
  return Object.keys(chatHistory);
}

export function createChannel(name: string): boolean {
  const channelName = name.toLowerCase().trim();
  if (!channelName || chatHistory[channelName]) {
    return false;
  }
  chatHistory[channelName] = [];
  saveHistory();
  return true;
}

export function deleteChannel(name: string): boolean {
  const channelName = name.toLowerCase().trim();
  if (!channelName || channelName === "general" || !chatHistory[channelName]) {
    return false;
  }
  delete chatHistory[channelName];
  saveHistory();
  return true;
}

export function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    console.log("History file does not exist. Creating 'general' channel.");
    chatHistory.general = [];
    saveHistory();
    return;
  }

  try {
    const savedData = fs.readFileSync(HISTORY_FILE, "utf8");
    if (!savedData.trim()) {
      console.log("History file is empty. Creating 'general' channel.");
      chatHistory.general = [];
      saveHistory();
      return;
    }
    const parsed = JSON.parse(savedData);

    if (typeof parsed !== "object" || parsed === null) {
      console.error("Invalid history file format. Creating 'general' channel.");
      chatHistory.general = [];
      return;
    }

    for (const channel in parsed) {
      if (Array.isArray(parsed[channel])) {
        chatHistory[channel] = parsed[channel];
      }
    }

    if (Object.keys(chatHistory).length === 0) {
      chatHistory.general = [];
      saveHistory();
    }

    console.log(
      `Chat history loaded from disk: ${Object.keys(chatHistory).join(", ")}`,
    );
  } catch (error) {
    console.error("There was an error.", error);
    chatHistory.general = [];
  }
}

export function saveHistory() {
  try {
    fs.writeFile(HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
      if (err) console.error("Failed to save history:", err);
    });
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}
