let ws;
let myName = "";
let currentChannel = "general";
let pendingMediaBase64 = null;
let pendingMediaType = null; // 'image' or 'video'

const chat = document.getElementById("chat");
const msgInput = document.getElementById("msg");
const chatHeader = document.getElementById("chat-header");

window.onload = () => {
  const savedName = localStorage.getItem("chatUsername");
  if (savedName) {
    document.getElementById("username").value = savedName;
    joinChat();
  }
};

function playPingSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function joinChat() {
  myName = document.getElementById("username").value.trim();
  if (!myName) return alert("Please enter a username!");

  localStorage.setItem("chatUsername", myName);
  document.getElementById("login-screen").style.display = "none";

  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", channel: currentChannel }));
  };

  ws.onmessage = async (e) => {
    const rawText = e.data instanceof Blob ? await e.data.text() : e.data;
    const data = JSON.parse(rawText);

    if (data.type === "history") {
      chat.innerHTML = "";
      data.messages.forEach((msg) => appendMessage(msg));
    } else if (data.type === "message") {
      appendMessage(data);
    } else if (data.type === "updateLikes") {
      const likeBtn = document.getElementById("like-" + data.id);
      if (likeBtn) likeBtn.innerText = `❤️ ${data.likes}`;
    }
  };
}

function switchChannel(channelName, element) {
  currentChannel = channelName;
  document
    .querySelectorAll(".channel")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
  chatHeader.innerText = `# ${channelName}`;
  msgInput.placeholder = `Message #${channelName}...`;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "join", channel: currentChannel }));
  }
}

function appendMessage(msg) {
  let isPinged = false;
  if (msg.text.includes(`@${myName}`)) {
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
                    <div class="msg-text">${msg.text}</div>
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
  document.getElementById("new-username").value = myName;
  document.getElementById("settings-modal").style.display = "flex";
}

function saveSettings() {
  const newName = document.getElementById("new-username").value.trim();
  if (newName) {
    myName = newName;
    localStorage.setItem("chatUsername", myName);
    document.getElementById("settings-modal").style.display = "none";
  }
}

function likeMessage(msgId) {
  if (ws)
    ws.send(
      JSON.stringify({
        type: "like",
        channel: currentChannel,
        messageId: msgId,
      }),
    );
}

function replyTo(user) {
  msgInput.value = `@${user} ` + msgInput.value;
  msgInput.focus();
}

// Handle Image/Video Selection
document.getElementById("file-upload").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  // Limit to 50MB (50 * 1024 * 1024 bytes)
  if (file.size > 52428800)
    return alert("File is too large! Max limit is 50MB.");

  const reader = new FileReader();
  reader.onload = function (e) {
    pendingMediaBase64 = e.target.result;
    pendingMediaType = file.type.startsWith("video") ? "video" : "image";
    msgInput.placeholder = `[${pendingMediaType} attached] Add a message...`;
  };
  reader.readAsDataURL(file);
});

// Send Message
msgInput.addEventListener("keypress", function (e) {
  if (
    e.key === "Enter" &&
    (msgInput.value.trim() || pendingMediaBase64) &&
    ws
  ) {
    // Show a loading indicator if uploading a big video
    if (pendingMediaType === "video") {
      msgInput.placeholder = "Uploading video... please wait.";
    }

    ws.send(
      JSON.stringify({
        type: "message",
        channel: currentChannel,
        user: myName,
        text: msgInput.value,
        media: pendingMediaBase64,
        mediaType: pendingMediaType,
      }),
    );

    msgInput.value = "";
    msgInput.placeholder = `Message #${currentChannel}...`;
    pendingMediaBase64 = null;
    pendingMediaType = null;
    document.getElementById("file-upload").value = "";
  }
});
