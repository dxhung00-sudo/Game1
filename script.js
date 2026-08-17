document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const GROUND_Y = 600;
  let gameOver = false;
  let isPaused = false;
  let gameStarted = false;
  let lives = 3;
  let currentScore = 0;
  let flashEffectTimer = 0;

  // --- 1. TẠO NÚT TẠM DỪNG ---
  const container = canvas.parentElement || document.body;
  const pauseBtn = document.createElement("button");
  pauseBtn.id = "pause-btn";
  pauseBtn.innerText = "⏸️ Tạm dừng";
  pauseBtn.style.cssText = `
    display: block; margin: 8px auto; padding: 6px 16px; font-size: 14px;
    font-weight: bold; color: #00f0ff; background: #1e293b;
    border: 1px solid #00f0ff; border-radius: 6px; cursor: pointer;
    box-shadow: 0 0 10px rgba(0,240,255,0.3);
  `;
  container.insertBefore(pauseBtn, canvas);

  pauseBtn.addEventListener("click", () => {
    if (!gameStarted) return;
    togglePause();
  });

  function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng";
    if (!isPaused) gameLoop();
  }

  // --- 2. ÂM THANH (BGM & HIỆU ỨNG) & PHÁT ÂM ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let bgmInterval = null;

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function startBGM() {
    if (bgmInterval) return;
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    let noteIdx = 0;

    bgmInterval = setInterval(() => {
      if (!audioCtx || isPaused || gameOver || !gameStarted) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[noteIdx], audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      noteIdx = (noteIdx + 1) % notes.length;
    }, 400);
  }

  function speakEnglishWord(word) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === "en-US" || v.lang === "en_US");
    if (usVoice) utterance.voice = usVoice;
    window.speechSynthesis.speak(utterance);
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
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    }
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // --- 3. DỮ LIỆU TỪ VỰNG ---
  const PACKS = [
    { id: 1, name: "Beginner (A1-A2)", levels: 10, targetPerLevel: 15, baseSpeed: 2.0 },
    { id: 2, name: "Intermediate (B1)", levels: 25, targetPerLevel: 20, baseSpeed: 2.6 },
    { id: 3, name: "Advanced (B2)", levels: 126, targetPerLevel: 25, baseSpeed: 3.2 }
  ];

  let currentPackIdx = 0;
  let currentLevel = 1;

  const rawVocabulary = {
    pack1: [
      { en: "Always", vi: "Luôn luôn" }, { en: "Family", vi: "Gia đình" }, { en: "Friend", vi: "Bạn bè" },
      { en: "School", vi: "Trường học" }, { en: "Morning", vi: "Buổi sáng" }, { en: "Weather", vi: "Thời tiết" },
      { en: "Happy", vi: "Vui vẻ" }, { en: "Travel", vi: "Du lịch" }, { en: "Market", vi: "Chợ" },
      { en: "Breakfast", vi: "Bữa sáng" }, { en: "Kitchen", vi: "Nhà bếp" }, { en: "Doctor", vi: "Bác sĩ" },
      { en: "Teacher", vi: "Giáo viên" }, { en: "Animal", vi: "Động vật" }, { en: "Clothes", vi: "Quần áo" },
      { en: "Money", vi: "Tiền bạc" }, { en: "Water", vi: "Nước" }, { en: "House", vi: "Ngôi nhà" },
      { en: "Time", vi: "Thời gian" }, { en: "Music", vi: "Âm nhạc" }, { en: "Health", vi: "Sức khỏe" },
      { en: "Apple", vi: "Quả táo" }, { en: "Book", vi: "Quyển sách" }, { en: "Cat", vi: "Con mèo" },
      { en: "Dog", vi: "Con chó" }, { en: "Car", vi: "Ô tô" }, { en: "Bicycle", vi: "Xe đạp" },
      { en: "City", vi: "Thành phố" }, { en: "Village", vi: "Ngôi làng" }, { en: "Tree", vi: "Cái cây" },
      { en: "Flower", vi: "Bông hoa" }, { en: "Sun", vi: "Mặt trời" }, { en: "Moon", vi: "Mặt trăng" },
      { en: "Star", vi: "Ngôi sao" }, { en: "Sky", vi: "Bầu trời" }, { en: "Cloud", vi: "Đám mây" },
      { en: "Rain", vi: "Cơn mưa" }, { en: "Snow", vi: "Tuyết" }, { en: "Wind", vi: "Cơn gió" },
      { en: "Fire", vi: "Ngọn lửa" }, { en: "Earth", vi: "Trái đất" }, { en: "River", vi: "Dòng sông" },
      { en: "Lake", vi: "Hồ nước" }, { en: "Ocean", vi: "Đại dương" }, { en: "Mountain", vi: "Ngọn núi" },
      { en: "Hill", vi: "Ngọn đồi" }, { en: "Forest", vi: "Khu rừng" }, { en: "Field", vi: "Cánh đồng" },
      { en: "Road", vi: "Con đường" }, { en: "Bridge", vi: "Cây cầu" }
    ],
    pack2: [
      { en: "Schedule", vi: "Lịch trình" }, { en: "Opinion", vi: "Ý kiến" }, { en: "Decision", vi: "Quyết định" },
      { en: "Experience", vi: "Kinh nghiệm" }, { en: "Education", vi: "Giáo dục" }, { en: "Community", vi: "Cộng đồng" }
    ],
    pack3: [
      { en: "Challenge", vi: "Thử thách" }, { en: "Strategy", vi: "Chiến lược" }, { en: "Innovation", vi: "Sự đổi mới" },
      { en: "Persuade", vi: "Thuyết phục" }, { en: "Analyze", vi: "Phân tích" }, { en: "Efficient", vi: "Hiệu quả" }
    ]
  };

  function expandBeginnerPack() {
    const baseP1 = rawVocabulary.pack1;
    let count = baseP1.length;
    let index = 0;
    while (count < 200) {
      baseP1.push({ en: baseP1[index].en, vi: baseP1[index].vi });
      index = (index + 1) % 50;
      count++;
    }
  }
  expandBeginnerPack();

  // --- 4. QUẢN LÝ TỪ VỰNG KHI LÊN LEVEL ---
  let previousLevelWords = [];
  let currentLevelPool = [];
  let wordsUsedInThisLevel = new Set();

  function prepareLevelPool() {
    const fullList = rawVocabulary[`pack${currentPackIdx + 1}`];
    let pool = [];

    if (previousLevelWords.length > 0) {
      const keepCount = Math.floor(Math.random() * 3) + 2;
      const shuffledPrev = [...previousLevelWords].sort(() => Math.random() - 0.5);
      const keptWords = shuffledPrev.slice(0, keepCount);
      pool.push(...keptWords);

      const keptEnSet = new Set(keptWords.map(w => w.en));
      const unusedWords = fullList.filter(w => !keptEnSet.has(w.en));
      pool.push(...unusedWords);
    } else {
      pool = [...fullList];
    }

    currentLevelPool = pool;
    wordsUsedInThisLevel.clear();
  }

  function getRandomWord() {
    if (currentLevelPool.length === 0) prepareLevelPool();

    let available = currentLevelPool.filter(w => !wordsUsedInThisLevel.has(w.en));

    if (available.length === 0) {
      wordsUsedInThisLevel.clear();
      available = currentLevelPool;
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    wordsUsedInThisLevel.add(selected.en);
    return selected;
  }

  let currentTarget = null;

  function setNextTargetWord() {
    currentTarget = getRandomWord();
    const targetEl = document.getElementById("target-word");
    if (targetEl) {
      targetEl.innerHTML = `${currentTarget.en} <span id="speak-btn" style="cursor:pointer; font-size: 22px; margin-left:8px;">🔊</span>`;
      const speakBtn = document.getElementById("speak-btn");
      if (speakBtn) {
        speakBtn.onclick = (e) => {
          e.stopPropagation();
          initAudio();
          speakEnglishWord(currentTarget.en);
        };
      }
    }
    if (gameStarted) speakEnglishWord(currentTarget.en);
  }

  // --- 5. ĐỐI TƯỢNG TỪ RƠI ---
  class FallingWord {
    constructor(text, xPos, startY, speed) {
      this.text = text;
      this.width = 95;
      this.height = 36;
      this.x = xPos;
      this.y = startY;
      this.speed = speed;
    }
    update() { this.y += this.speed; }
    draw() {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.5;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeRect(this.x, this.y, this.width, this.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    }
    containsPoint(px, py) {
      return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
    }
  }

  let fallingWords = [];

  // Thuật toán sinh từ chống chồng lấp theo hộp AABB (Axis-Aligned Bounding Box)
  function spawnWords() {
    if (!currentTarget) setNextTargetWord();

    const list = rawVocabulary[`pack${currentPackIdx + 1}`];
    const numWords = Math.floor(Math.random() * 6) + 5; // 5-10 từ

    let options = [currentTarget.vi];
    while (options.length < numWords) {
      let randomWrong = list[Math.floor(Math.random() * list.length)].vi;
      if (!options.includes(randomWrong)) {
        options.push(randomWrong);
      }
    }
    options.sort(() => Math.random() - 0.5);

    const packSpeed = PACKS[currentPackIdx].baseSpeed + (currentLevel * 0.25);
    const wordWidth = 95;
    const wordHeight = 36;
    const margin = 12; // Khoảng cách an toàn giữa các thẻ từ

    const placedBoxes = [];

    for (let i = 0; i < numWords; i++) {
      let posX = 0;
      let posY = 0;
      let overlap = false;
      let attempts = 0;

      do {
        overlap = false;
        posX = Math.random() * (canvas.width - wordWidth);
        // Rải vị trí xuất phát theo chiều dọc phía trên khung hình
        posY = -(Math.random() * 350 + 50);

        // Kiểm tra xem vị trí mới có đè lên thẻ từ nào đã tạo không
        for (const box of placedBoxes) {
          if (
            posX < box.x + box.w + margin &&
            posX + wordWidth + margin > box.x &&
            posY < box.y + box.h + margin &&
            posY + wordHeight + margin > box.y
          ) {
            overlap = true;
            break;
          }
        }
        attempts++;
      } while (overlap && attempts < 100);

      placedBoxes.push({ x: posX, y: posY, w: wordWidth, h: wordHeight });

      // Cùng chung tốc độ trong 1 đợt để các thẻ giữ nguyên khoảng cách, không đâm vào nhau khi rơi
      fallingWords.push(new FallingWord(options[i], posX, posY, packSpeed));
    }
  }

  // --- 6. XỬ LÝ SỰ KIỆN CLICK / TOUCH ---
  function handleSelectPoint(clientX, clientY) {
    if (!gameStarted) {
      gameStarted = true;
      initAudio();
      startBGM();
      prepareLevelPool();
      setNextTargetWord();
      return;
    }

    if (isPaused || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    for (let i = fallingWords.length - 1; i >= 0; i--) {
      const w = fallingWords[i];
      if (w.containsPoint(clickX, clickY)) {
        if (w.text === currentTarget.vi) {
          currentScore++;
          playSound("correct");
          flashEffectTimer = 10;
          checkLevelProgress();
          setNextTargetWord();
          fallingWords = [];
          updateUI();
        } else {
          lives--;
          playSound("wrong");
          fallingWords.splice(i, 1);
          if (lives <= 0) {
            alert("Game Over! Bạn chọn sai từ.");
            location.reload();
            return;
          }
          updateUI();
        }
        break;
      }
    }
  }

  canvas.addEventListener("click", (e) => handleSelectPoint(e.clientX, e.clientY));
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleSelectPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (!gameStarted) {
      gameStarted = true;
      initAudio();
      startBGM();
      prepareLevelPool();
      setNextTargetWord();
    } else if (e.code === "KeyP") togglePause();
  });

  function checkLevelProgress() {
    if (currentScore >= PACKS[currentPackIdx].targetPerLevel) {
      currentScore = 0;
      currentLevel++;
      lives++;

      previousLevelWords = Array.from(wordsUsedInThisLevel).map(en => {
        const full = rawVocabulary[`pack${currentPackIdx + 1}`];
        return full.find(w => w.en === en);
      }).filter(Boolean);

      prepareLevelPool();

      if (currentLevel > PACKS[currentPackIdx].levels) {
        currentLevel = 1;
        currentPackIdx++;
        previousLevelWords = [];
        if (currentPackIdx >= PACKS.length) {
          alert("Chúc mừng! Bạn đã hoàn thành toàn bộ cấp độ!");
          gameOver = true;
          return;
        }
      }
      updateUI();
    }
  }

  function updateUI() {
    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const livesEl = document.getElementById("lives");
    if (scoreEl) scoreEl.textContent = currentScore;
    if (levelEl) levelEl.textContent = currentLevel;
    if (livesEl) livesEl.textContent = Math.max(0, lives);
  }

  // --- 7. VÒNG LẶP GAME ---
  function gameLoop() {
    if (gameOver) return;

    if (!gameStarted) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("CHẠM MÀN HÌNH ĐỂ BẮT ĐẦU", canvas.width / 2, canvas.height / 2);
      requestAnimationFrame(gameLoop);
      return;
    }

    if (isPaused) {
      requestAnimationFrame(gameLoop);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (flashEffectTimer > 0) {
      ctx.fillStyle = `rgba(0, 240, 255, ${flashEffectTimer / 20})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      flashEffectTimer--;
    }

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    if (fallingWords.length === 0) spawnWords();

    for (let i = fallingWords.length - 1; i >= 0; i--) {
      const w = fallingWords[i];
      w.update();
      w.draw();

      const isCorrectWord = (w.text === currentTarget.vi);

      if (w.y + w.height >= GROUND_Y) {
        if (isCorrectWord) {
          lives--;
          playSound("wrong");
          if (lives <= 0) {
            alert("Game Over! Bạn để từ đúng rơi mất.");
            location.reload();
            return;
          }
          setNextTargetWord();
          fallingWords = [];
          updateUI();
          break;
        } else {
          fallingWords.splice(i, 1);
        }
      }
    }

    requestAnimationFrame(gameLoop);
  }

  updateUI();
  gameLoop();
});