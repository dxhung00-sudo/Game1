document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const GROUND_Y = 600;
  let gameOver = false;
  let lives = 3;
  let currentScore = 0;

  // --- HỆ THỐNG ÂM THANH (Mở khóa trên Android) ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "levelUp") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  // Cấu hình Gói & Cấp độ
  const PACKS = [
    { id: 1, name: "Beginner", levels: 10, targetPerLevel: 15, baseSpeed: 1.5 },
    { id: 2, name: "Intermediate", levels: 25, targetPerLevel: 20, baseSpeed: 2.2 },
    { id: 3, name: "Advanced", levels: 126, targetPerLevel: 25, baseSpeed: 3.0 }
  ];

  let currentPackIdx = 0;
  let currentLevel = 1;

  const sampleWords = [
    { en: "Hello", vi: "Xin chào" }, { en: "Cat", vi: "Con mèo" }, { en: "Dog", vi: "Con chó" },
    { en: "Apple", vi: "Quả táo" }, { en: "Water", vi: "Nước" }, { en: "Book", vi: "Sách" },
    { en: "School", vi: "Trường học" }, { en: "Friend", vi: "Bạn bè" }, { en: "Develop", vi: "Phát triển" },
    { en: "Environment", vi: "Môi trường" }, { en: "Challenge", vi: "Thử thách" }, { en: "Opportunity", vi: "Cơ hội" },
    { en: "Meticulous", vi: "Tỉ mỉ" }, { en: "Pragmatic", vi: "Thực dụng" }, { en: "Ubiquitous", vi: "Phổ biến" }
  ];

  function generateVocabularyDB() {
    const db = { pack1: [], pack2: [], pack3: [] };
    for (let p = 1; p <= 3; p++) {
      const count = p === 1 ? 150 : p === 2 ? 500 : 3150;
      for (let i = 0; i < count; i++) {
        const base = sampleWords[i % sampleWords.length];
        db[`pack${p}`].push({ en: base.en, vi: base.vi });
      }
    }
    return db;
  }

  const vocabularyDB = generateVocabularyDB();
  let currentTarget = null;
  const keys = {};

  // Biến điều khiển cảm ứng
  let touchMoveTargetX = null;
  let isTouchingLeft = false;
  let isTouchingRight = false;

  // Lắng nghe sự kiện Bàn phím
  window.addEventListener("keydown", (e) => {
    initAudio();
    keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  // --- XỬ LÝ CẢM ỨNG TRÊN ĐIỆN THOẠI ANDROID ---
  function getCanvasCoords(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    initAudio();
    
    for (let i = 0; i < e.touches.length; i++) {
      const pos = getCanvasCoords(e.touches[i]);
      if (pos.y > GROUND_Y) {
        // Chạm vào vùng nút ảo dưới mặt đất
        if (pos.x < canvas.width / 2) isTouchingLeft = true;
        else isTouchingRight = true;
      } else {
        // Vuốt di chuyển trực tiếp
        touchMoveTargetX = pos.x;
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
      const pos = getCanvasCoords(e.touches[i]);
      if (pos.y <= GROUND_Y) {
        touchMoveTargetX = pos.x;
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      touchMoveTargetX = null;
      isTouchingLeft = false;
      isTouchingRight = false;
    }
  }, { passive: false });

  function getRandomWord() {
    const packKey = `pack${currentPackIdx + 1}`;
    const list = vocabularyDB[packKey];
    return list[Math.floor(Math.random() * list.length)];
  }

  function setNextTargetWord() {
    currentTarget = getRandomWord();
    const targetEl = document.getElementById("target-word");
    if (targetEl) targetEl.textContent = currentTarget.en;
  }

  // --- HỆ THỐNG HIỆU ỨNG HẠT ---
  let particles = [];
  let floatTexts = [];
  let screenFlashAlpha = 0;

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 5 + 2;
      this.speedX = (Math.random() - 0.5) * 8;
      this.speedY = (Math.random() - 0.5) * 8;
      this.color = color || `hsl(${Math.random() * 60 + 170}, 100%, 50%)`;
      this.alpha = 1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.alpha -= 0.03;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(text, x, y, color) {
      this.text = text;
      this.x = x;
      this.y = y;
      this.color = color;
      this.alpha = 1;
    }
    update() {
      this.y -= 1.5;
      this.alpha -= 0.02;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  function createScoreEffect(x, y) {
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(x, y));
    }
    floatTexts.push(new FloatingText("+1", x, y, "#00ffcc"));
  }

  function triggerDamageEffect() {
    playSound("wrong");
    screenFlashAlpha = 0.4;
  }

  // --- LỚP NGƯỜI CHƠI (PHI THUYỀN) ---
  class Player {
    constructor() {
      this.width = 60;
      this.height = 40;
      this.x = canvas.width / 2 - this.width / 2;
      this.y = GROUND_Y - this.height;
      this.speed = 8;
    }

    update() {
      let moving = false;

      // Xử lý di chuyển bằng bàn phím hoặc nút chạm ảo
      if (keys["KeyA"] || keys["ArrowLeft"] || isTouchingLeft) {
        this.x -= this.speed;
        moving = true;
      }
      if (keys["KeyD"] || keys["ArrowRight"] || isTouchingRight) {
        this.x += this.speed;
        moving = true;
      }

      // Xử lý vuốt trực tiếp trên màn hình Android
      if (touchMoveTargetX !== null) {
        const playerCenterX = this.x + this.width / 2;
        const diff = touchMoveTargetX - playerCenterX;
        if (Math.abs(diff) > 5) {
          this.x += Math.sign(diff) * Math.min(this.speed * 1.2, Math.abs(diff));
          moving = true;
        }
      }

      if (this.x < 0) this.x = 0;
      if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

      if (moving || Math.random() > 0.3) {
        particles.push(new Particle(this.x + this.width / 2, this.y + this.height, "#ff007f"));
      }
    }

    draw() {
      ctx.save();
      ctx.fillStyle = "#00f0ff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00f0ff";

      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.8);
      ctx.lineTo(this.x + this.width * 0.3, this.y + this.height * 0.8);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff007f";
      ctx.fillRect(this.x + this.width * 0.35, this.y + this.height * 0.8, this.width * 0.3, 6);
      ctx.restore();
    }
  }

  class FallingWord {
    constructor(text) {
      this.text = text;
      this.width = 130;
      this.height = 40;
      this.x = Math.random() * (canvas.width - this.width);
      this.y = 80;

      const packSpeed = PACKS[currentPackIdx].baseSpeed;
      this.speed = packSpeed + (currentLevel * 0.15);
    }

    update() {
      this.y += this.speed;
    }

    draw() {
      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00f0ff";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeRect(this.x, this.y, this.width, this.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
      ctx.restore();
    }
  }

  const player = new Player();
  let fallingWords = [];
  let spawnTimer = 0;

  function spawnSingleWord() {
    if (!currentTarget) setNextTargetWord();

    const hasCorrectOnScreen = fallingWords.some(w => w.text === currentTarget.vi);
    let wordText = "";

    if (!hasCorrectOnScreen && Math.random() > 0.5) {
      wordText = currentTarget.vi;
    } else {
      let wrongWord = getRandomWord().vi;
      while (wrongWord === currentTarget.vi) {
        wrongWord = getRandomWord().vi;
      }
      wordText = wrongWord;
    }

    fallingWords.push(new FallingWord(wordText));
  }

  function checkLevelProgress() {
    const currentPackConfig = PACKS[currentPackIdx];

    if (currentScore >= currentPackConfig.targetPerLevel) {
      currentScore = 0;
      currentLevel++;
      lives++;
      playSound("levelUp");

      if (currentLevel > currentPackConfig.levels) {
        currentLevel = 1;
        currentPackIdx++;
        if (currentPackIdx >= PACKS.length) {
          alert("Chúc mừng! Bạn đã hoàn thành toàn bộ kho từ vựng!");
          gameOver = true;
          return;
        }
        alert(`LÊN GÓI MỚI: ${PACKS[currentPackIdx].name}!`);
      }
      updateUI();
    }
  }

  function updateUI() {
    const packEl = document.getElementById("pack-name");
    const levelEl = document.getElementById("level");
    const scoreEl = document.getElementById("score");
    const targetScoreEl = document.getElementById("target-score");
    const livesEl = document.getElementById("lives");

    if (packEl) packEl.textContent = `${PACKS[currentPackIdx].id} (${PACKS[currentPackIdx].name})`;
    if (levelEl) levelEl.textContent = currentLevel;
    if (scoreEl) scoreEl.textContent = currentScore;
    if (targetScoreEl) targetScoreEl.textContent = PACKS[currentPackIdx].targetPerLevel;
    if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, lives));
  }

  function drawTouchControls() {
    // Vẽ vùng nút bấm ảo hỗ trợ chơi bằng 2 tay bên dưới mặt đất
    ctx.save();
    ctx.fillStyle = isTouchingLeft ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, GROUND_Y, canvas.width / 2, canvas.height - GROUND_Y);

    ctx.fillStyle = isTouchingRight ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(canvas.width / 2, GROUND_Y, canvas.width / 2, canvas.height - GROUND_Y);

    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("◀ SANG TRÁI", canvas.width * 0.25, GROUND_Y + 35);
    ctx.fillText("SANG PHẢI ▶", canvas.width * 0.75, GROUND_Y + 35);
    ctx.restore();
  }

  function gameLoop() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Màn hình mặt đất
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Vẽ điều khiển ảo Android
    drawTouchControls();

    player.update();
    player.draw();

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      floatTexts[i].update();
      floatTexts[i].draw();
      if (floatTexts[i].alpha <= 0) floatTexts.splice(i, 1);
    }

    spawnTimer++;
    if (spawnTimer % 75 === 0) {
      spawnSingleWord();
    }

    for (let i = fallingWords.length - 1; i >= 0; i--) {
      const w = fallingWords[i];
      w.update();
      w.draw();

      const isCorrectWord = (w.text === currentTarget.vi);

      if (
        player.x < w.x + w.width &&
        player.x + player.width > w.x &&
        player.y < w.y + w.height &&
        player.y + player.height > w.y
      ) {
        if (isCorrectWord) {
          currentScore += 1;
          playSound("correct");
          createScoreEffect(w.x + w.width / 2, w.y);
          checkLevelProgress();
          setNextTargetWord();
        } else {
          lives--;
          triggerDamageEffect();
          if (lives <= 0) {
            alert("Game Over! Bạn đã chọn sai từ.");
            location.reload();
            return;
          }
        }
        fallingWords.splice(i, 1);
        updateUI();
        continue;
      }

      if (w.y + w.height >= GROUND_Y) {
        if (isCorrectWord) {
          lives--;
          triggerDamageEffect();
          if (lives <= 0) {
            alert("Game Over! Bạn đã để từ đúng rơi xuống đất.");
            location.reload();
            return;
          }
          setNextTargetWord();
          updateUI();
        }
        fallingWords.splice(i, 1);
      }
    }

    if (screenFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 0, 0, ${screenFlashAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      screenFlashAlpha -= 0.02;
      ctx.restore();
    }

    requestAnimationFrame(gameLoop);
  }

  setNextTargetWord();
  updateUI();
  gameLoop();
});