import fs from "fs";

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  media?: string;
  mediaType?: string;
  likes: number;
}

export type ChannelName = "general" | "gaming" | "random";

export type ChatHistory = {
  [key in ChannelName]: ChatMessage[];
};

const HISTORY_FILE = "chat_history.json";
export const chatHistory: ChatHistory = {
  general: [],
  gaming: [],
  random: [],
};

export function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    console.log("History file does not exist. Creating new file.");
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory));
  }

  chatHistory.general = [];
  chatHistory.gaming = [];
  chatHistory.random = [];

  try {
    const savedData = fs.readFileSync(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(savedData);

    if (!parsed.general || !parsed.gaming || !parsed.random) {
      console.error("Invalid history file format.");
      throw new Error("Invalid history file format.");
    }

    chatHistory.general = parsed.general;
    chatHistory.gaming = parsed.gaming;
    chatHistory.random = parsed.random;

    console.log("Chat history loaded from disk.");
  } catch (error) {
    console.error("There was an error.", error);
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
