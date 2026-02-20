// ==========================================
// SPACE SHOOTER GAME LOGIC (Single Player)
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let gameLoopId;

let player, bullets, enemies, score;
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  " ": false,
};

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

function startGame(mode) {
  document.getElementById("game-menu").style.display = "none";
  player = {
    x: 400,
    y: 500,
    width: 30,
    height: 30,
    speed: 5,
    cooldown: 0,
  };
  bullets = [];
  enemies = [];
  score = 0;
  gameLoop();
}

function exitGame() {
  cancelAnimationFrame(gameLoopId);
  switchChannel("general"); // Kick back to general chat
}

function toggleFullScreenGame() {
  if (!document.fullscreenElement) {
    document
      .getElementById("game-view")
      .requestFullscreen()
      .catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
  } else {
    document.exitFullscreen();
  }
}

function gameLoop() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player movement
  if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
  if (keys.ArrowRight && player.x < canvas.width - player.width)
    player.x += player.speed;
  if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
  if (keys.ArrowDown && player.y < canvas.height - player.height)
    player.y += player.speed;

  // Shooting
  if (keys[" "] && player.cooldown <= 0) {
    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 10,
      speed: 7,
    });
    player.cooldown = 15;
  }
  if (player.cooldown > 0) player.cooldown--;

  // Draw Player (Ship)
  ctx.fillStyle = "#5865F2";
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.fill();

  // Handle Bullets
  ctx.fillStyle = "#faa61a";
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;
    ctx.fillRect(
      bullets[i].x,
      bullets[i].y,
      bullets[i].width,
      bullets[i].height,
    );
    if (bullets[i].y < 0) bullets.splice(i, 1);
  }

  // Handle Enemies
  if (Math.random() < 0.03) {
    enemies.push({
      x: Math.random() * (canvas.width - 30),
      y: -30,
      width: 30,
      height: 30,
      speed: 2 + Math.random() * 2,
    });
  }

  ctx.fillStyle = "#ed4245";
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].y += enemies[i].speed;
    ctx.fillRect(
      enemies[i].x,
      enemies[i].y,
      enemies[i].width,
      enemies[i].height,
    );

    // Collision detection
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (
        bullets[j].x < enemies[i].x + enemies[i].width &&
        bullets[j].x + bullets[j].width > enemies[i].x &&
        bullets[j].y < enemies[i].y + enemies[i].height &&
        bullets[j].y + bullets[j].height > enemies[i].y
      ) {
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        break;
      }
    }

    // Remove off screen
    if (enemies[i] && enemies[i].y > canvas.height) enemies.splice(i, 1);
  }

  // Score UI
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);

  gameLoopId = requestAnimationFrame(gameLoop);
}
