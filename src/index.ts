let ws: WebSocket;
let myName = "";
let currentChannel = "general";
let pendingMediaBase64: string | null = null;
let pendingMediaType: "image" | "video" | null = null;
let channels: string[] = [];

const chat = document.getElementById("chat") as HTMLElement;
const msgInput = document.getElementById("msg") as HTMLInputElement;
const chatHeader = document.getElementById("chat-header") as HTMLElement;

window.onload = () => {
  const savedName = localStorage.getItem("chatUsername");
  if (savedName) {
    myName = savedName;
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) loginScreen.style.display = "none";
    const appLayout = document.getElementById("app-layout");
    if (appLayout) appLayout.style.display = "flex";
    joinChat();
  }
};

function authenticate(action: "login" | "register") {
  const u = (document.getElementById("auth-user") as HTMLInputElement).value.trim();
  const p = (document.getElementById("auth-pass") as HTMLInputElement).value.trim();
  if (!u || !p) return alert("Enter both username and password.");
  localStorage.setItem("tempUser", u);
  localStorage.setItem("tempPass", p);

  const wsUrl = import.meta.env.DEV ? "ws://localhost:3000" : `ws://${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: action, user: u, pass: p }));
  };

  ws.onmessage = async (e) => {
    const rawText = e.data instanceof Blob ? await e.data.text() : e.data;
    const data = JSON.parse(rawText);

    if (data.type === "auth_success") {
      console.log("[DEBUG] auth_success received");
      myName = data.user;
      localStorage.setItem("chatUsername", myName);
      const loginScreen = document.getElementById("login-screen");
      if (loginScreen) loginScreen.style.display = "none";
      const appLayout = document.getElementById("app-layout");
      if (appLayout) appLayout.style.display = "flex";
      ws.send(JSON.stringify({ type: "join", channel: currentChannel }));
    } else if (data.type === "auth_error") {
      console.log("[DEBUG] auth_error:", data.msg);
      const errorDiv = document.getElementById("auth-error");
      if (errorDiv) errorDiv.innerText = data.msg;
    } else if (data.type === "channels") {
      console.log("[DEBUG] channels received:", data.channels);
      channels = data.channels;
      renderChannels(channels);
    } else if (data.type === "channelCreated") {
      console.log("[DEBUG] channelCreated received:", data.name);
      switchChannel(data.name);
    } else if (data.type === "channelDeleted") {
      console.log("[DEBUG] channelDeleted received:", data.name);
      if (currentChannel === data.name) {
        currentChannel = channels.find((c) => c !== data.name) || "general";
        chatHeader.innerText = `# ${currentChannel}`;
        msgInput.placeholder = `Message #${currentChannel}...`;
      }
      channels = channels.filter((c) => c !== data.name);
      renderChannels(channels);
    } else if (data.type === "history") {
      console.log("[DEBUG] history received, message count:", data.messages?.length);
      chat.innerHTML = "";
      data.messages.forEach((msg: { id: string; user: string; text: string; media?: string; mediaType?: string; likes: number }) => appendMessage(msg));
    } else if (data.type === "message") {
      console.log("[DEBUG] message received from:", data.user);
      appendMessage(data);
    } else if (data.type === "updateLikes") {
      console.log("[DEBUG] updateLikes received for msg:", data.id, "likes:", data.likes);
      const likeBtn = document.getElementById("like-" + data.id);
      if (likeBtn) likeBtn.innerText = `❤️ ${data.likes}`;
    } else {
      console.log("[DEBUG] unknown message type:", data.type);
    }
  };
}

function signOut() {
  localStorage.clear();
  location.reload();
}

function changePassword() {
  const newPass = (document.getElementById("new-password") as HTMLInputElement).value.trim();
  if (!newPass) return alert("Enter a new password!");
  ws.send(
    JSON.stringify({
      type: "change_password",
      user: myName,
      newPass: newPass,
    }),
  );
  localStorage.setItem("chatPass", newPass);
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) settingsModal.style.display = "none";
}

function playPingSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function joinChat() {
  if (!myName) {
    myName = (document.getElementById("auth-user") as HTMLInputElement)?.value?.trim();
  }
  if (!myName) return alert("Please enter a username!");

  localStorage.setItem("chatUsername", myName);
  const loginScreen = document.getElementById("login-screen");
  if (loginScreen) loginScreen.style.display = "none";

  const wsUrl = import.meta.env.DEV ? "ws://localhost:3000" : `ws://${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", channel: currentChannel }));
  };

  ws.onmessage = async (e) => {
    const rawText = e.data instanceof Blob ? await e.data.text() : e.data;
    const data = JSON.parse(rawText);

    if (data.type === "channels") {
      console.log("[DEBUG joinChat] channels received:", data.channels);
      channels = data.channels;
      renderChannels(channels);
    } else if (data.type === "channelCreated") {
      console.log("[DEBUG joinChat] channelCreated received:", data.name);
      switchChannel(data.name);
    } else if (data.type === "channelDeleted") {
      console.log("[DEBUG joinChat] channelDeleted received:", data.name);
      if (currentChannel === data.name) {
        currentChannel = channels.find((c) => c !== data.name) || "general";
        chatHeader.innerText = `# ${currentChannel}`;
        msgInput.placeholder = `Message #${currentChannel}...`;
      }
      channels = channels.filter((c) => c !== data.name);
      renderChannels(channels);
    } else if (data.type === "history") {
      console.log("[DEBUG joinChat] history received, message count:", data.messages?.length);
      chat.innerHTML = "";
      data.messages.forEach((msg: { id: string; user: string; text: string; media?: string; mediaType?: string; likes: number }) => appendMessage(msg));
    } else if (data.type === "message") {
      console.log("[DEBUG joinChat] message received from:", data.user);
      appendMessage(data);
    } else if (data.type === "updateLikes") {
      console.log("[DEBUG joinChat] updateLikes received for msg:", data.id, "likes:", data.likes);
      const likeBtn = document.getElementById("like-" + data.id);
      if (likeBtn) likeBtn.innerText = `❤️ ${data.likes}`;
    } else {
      console.log("[DEBUG joinChat] unknown message type:", data.type);
    }
  };
}

function switchChannel(channelName: string, element?: HTMLElement) {
  console.log("[DEBUG] switchChannel called:", channelName);
  currentChannel = channelName;
  document
    .querySelectorAll(".channel")
    .forEach((el) => el.classList.remove("active"));
  if (element) element.classList.add("active");
  chatHeader.innerText = `# ${channelName}`;
  msgInput.placeholder = `Message #${channelName}...`;

  console.log("[DEBUG] ws readyState:", ws?.readyState, "OPEN:", WebSocket.OPEN);
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("[DEBUG] sending join message for channel:", channelName);
    ws.send(JSON.stringify({ type: "join", channel: currentChannel }));
  } else {
    console.log("[DEBUG] ws not ready, skipping join message");
  }
}

let channelToDelete: string | null = null;

function renderChannels(channels: string[]) {
  console.log("[DEBUG] renderChannels called with:", channels);
  const channelsList = document.getElementById("channel-list");
  console.log("[DEBUG] channelsList found:", !!channelsList);
  if (!channelsList) return;
  channelsList.innerHTML = "";

  channels.forEach((channelName) => {
    const channelDiv = document.createElement("div");
    channelDiv.className =
      "channel" + (currentChannel === channelName ? " active" : "");

    const channelNameSpan = document.createElement("span");
    channelNameSpan.innerText = `# ${channelName}`;
    channelNameSpan.style.flex = "1";
    channelNameSpan.onclick = function () {
      switchChannel(channelName, channelDiv);
    };
    channelDiv.appendChild(channelNameSpan);

    if (channelName !== "general") {
      const deleteBtn = document.createElement("span");
      deleteBtn.innerText = "✕";
      deleteBtn.className = "channel-delete-btn";
      deleteBtn.onclick = function (e) {
        e.stopPropagation();
        openDeleteChannelModal(channelName);
      };
      channelDiv.appendChild(deleteBtn);
    }

    channelsList.appendChild(channelDiv);
  });
  console.log("[DEBUG] renderChannels done, rendered", channels.length, "channels");
}

function openAddChannelModal() {
  console.log("[DEBUG] openAddChannelModal called");
  const newChannelNameInput = document.getElementById("add-channel-name-input") as HTMLInputElement;
  console.log("[DEBUG] newChannelNameInput found:", !!newChannelNameInput);
  if (newChannelNameInput) newChannelNameInput.value = "";
  const addChannelModal = document.getElementById("add-channel-modal");
  console.log("[DEBUG] addChannelModal found:", !!addChannelModal);
  if (addChannelModal) addChannelModal.style.display = "flex";
  console.log("[DEBUG] modal display set to flex");
}

function openDeleteChannelModal(channelName: string) {
  console.log("[DEBUG] openDeleteChannelModal called for:", channelName);
  channelToDelete = channelName;
  const deleteChannelName = document.getElementById("delete-channel-name");
  console.log("[DEBUG] deleteChannelName element found:", !!deleteChannelName);
  if (deleteChannelName) deleteChannelName.innerText = channelName;
  const deleteChannelModal = document.getElementById("delete-channel-modal");
  console.log("[DEBUG] deleteChannelModal found:", !!deleteChannelModal);
  if (deleteChannelModal) deleteChannelModal.style.display = "flex";
}

function confirmDeleteChannel() {
  console.log("[DEBUG] confirmDeleteChannel called, channelToDelete:", channelToDelete);
  if (channelToDelete) {
    console.log("[DEBUG] sending deleteChannel ws message");
    ws.send(JSON.stringify({ type: "deleteChannel", name: channelToDelete }));
    channelToDelete = null;
  }
  const deleteChannelModal = document.getElementById("delete-channel-modal");
  if (deleteChannelModal) deleteChannelModal.style.display = "none";
}

function createChannel() {
  console.log("[DEBUG] createChannel called");
  const nameInput = document.getElementById("add-channel-name-input") as HTMLInputElement;
  console.log("[DEBUG] nameInput found:", !!nameInput);
  const name = nameInput?.value.trim() || "";
  console.log("[DEBUG] channel name:", name);
  if (!name) {
    console.log("[DEBUG] empty name, returning");
    return;
  }
  console.log("[DEBUG] sending createChannel ws message");
  ws.send(JSON.stringify({ type: "createChannel", name }));
  const addChannelModal = document.getElementById("add-channel-modal");
  if (addChannelModal) addChannelModal.style.display = "none";
  console.log("[DEBUG] createChannel done");
}

function deleteChannel(name: string) {
  console.log("[DEBUG] deleteChannel called:", name);
  ws.send(JSON.stringify({ type: "deleteChannel", name }));
}

interface Message {
  id: string;
  user: string;
  text: string;
  media?: string;
  mediaType?: string;
  likes: number;
}

function appendMessage(msg: Message) {
  let decodedText: string;
  try {
    decodedText = atob(msg.text);
  } catch {
    decodedText = msg.text;
  }
  let isPinged = false;
  if (decodedText.includes(`@${myName}`)) {
    isPinged = true;
    if (msg.user !== myName) playPingSound();
  }

  let mediaHtml = "";
  if (msg.media) {
    if (msg.mediaType === "video") {
      mediaHtml = `<video src="${msg.media}" class="msg-media" controls></video>`;
    } else {
      mediaHtml = `<img src="${msg.media}" class="msg-media">`;
    }
  }

  chat.innerHTML += `
                <div class="msg-block ${isPinged ? "highlight" : ""}" id="msg-${msg.id}">
                    <span class="msg-user">${msg.user}</span>
                    <div class="msg-text">${decodedText}</div>
                    ${mediaHtml}
                    <div class="msg-actions">
                        <button class="action-btn" id="like-${msg.id}" onclick="likeMessage('${msg.id}')">❤️ ${msg.likes}</button>
                        <button class="action-btn" onclick="replyTo('${msg.user}')">↩️ Reply</button>
                    </div>
                </div>
            `;
  chat.scrollTop = chat.scrollHeight;
}

function openSettings() {
  const newUsernameInput = document.getElementById("new-username") as HTMLInputElement;
  if (newUsernameInput) newUsernameInput.value = myName;
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) settingsModal.style.display = "flex";
}

function saveSettings() {
  const newName = (document.getElementById("new-username") as HTMLInputElement).value.trim();
  if (newName) {
    myName = newName;
    localStorage.setItem("chatUsername", myName);
    const settingsModal = document.getElementById("settings-modal");
    if (settingsModal) settingsModal.style.display = "none";
  }
}

function likeMessage(msgId: string) {
  if (ws)
    ws.send(
      JSON.stringify({
        type: "like",
        channel: currentChannel,
        messageId: msgId,
      }),
    );
}

function replyTo(user: string) {
  msgInput.value = `@${user} ` + msgInput.value;
  msgInput.focus();
}

(document.getElementById("file-upload") as HTMLInputElement).addEventListener("change", function () {
  const file = this.files?.[0];
  if (!file) return;

  if (file.size > 52428800)
    return alert("File is too large! Max limit is 50MB.");

  const reader = new FileReader();
  reader.onload = function (e) {
    pendingMediaBase64 = e.target?.result as string;
    pendingMediaType = file.type.startsWith("video") ? "video" : "image";
    msgInput.placeholder = `[${pendingMediaType} attached] Add a message...`;
  };
  reader.readAsDataURL(file);
});

msgInput.addEventListener("keypress", function (e) {
  if (
    e.key === "Enter" &&
    (msgInput.value.trim() || pendingMediaBase64) &&
    ws
  ) {
    if (pendingMediaType === "video") {
      msgInput.placeholder = "Uploading video... please wait.";
    }

    ws.send(
      JSON.stringify({
        type: "message",
        channel: currentChannel,
        user: myName,
        text: btoa(msgInput.value),
        media: pendingMediaBase64,
        mediaType: pendingMediaType,
      }),
    );

    msgInput.value = "";
    msgInput.placeholder = `Message #${currentChannel}...`;
    pendingMediaBase64 = null;
    pendingMediaType = null;
    (document.getElementById("file-upload") as HTMLInputElement).value = "";
  }
});

(window as any).authenticate = authenticate;
(window as any).signOut = signOut;
(window as any).changePassword = changePassword;
(window as any).joinChat = joinChat;
(window as any).switchChannel = switchChannel;
(window as any).renderChannels = renderChannels;
(window as any).openAddChannelModal = openAddChannelModal;
(window as any).openDeleteChannelModal = openDeleteChannelModal;
(window as any).confirmDeleteChannel = confirmDeleteChannel;
(window as any).createChannel = createChannel;
(window as any).deleteChannel = deleteChannel;
(window as any).appendMessage = appendMessage;
(window as any).openSettings = openSettings;
(window as any).saveSettings = saveSettings;
(window as any).likeMessage = likeMessage;
(window as any).replyTo = replyTo;
