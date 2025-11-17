// Konfigurasi Game
const MAX_LEVEL = 10; // Tujuan akhir: Capai level 10
const TIME_LIMIT = 90; // Durasi waktu dalam detik
const LEVEL_STEP_PERCENT = 8; // Persentase kenaikan/penurunan posisi monyet per level (disesuaikan dengan visual pohon)
const START_BOTTOM_PERCENT = 5; // Posisi awal monyet
const TOTAL_QUESTIONS_PER_PLAYER = 10;


// State Game
let playerLevels = { p1: 0, p2: 0 };
let playerScores = { p1: 0, p2: 0 };
let currentQuestions = { p1: null, p2: null };
let questionsCompleted = { p1: 0, p2: 0 };
let availableQuestions = [];
let gameTimer;
let timeLeft = TIME_LIMIT;
let gameActive = false;
let availableQuestionsP1 = []; // <-- Pool soal khusus untuk Pemain 1
let availableQuestionsP2 = []; // <-- Pool soal khusus untuk Pemain 2
let masterQuestionPool = [];   // <-- Pool utama yang dimuat dari JSON

// Elemen DOM
const startOverlay = document.getElementById('start-overlay');
const resultOverlay = document.getElementById('result-overlay');
const startGameBtn = document.getElementById('start-game-btn');
const timer = document.getElementById('timer');

const monkeyP1 = document.getElementById('monkey-p1');
const monkeyP2 = document.getElementById('monkey-p2');
const scoreP1El = document.querySelector('#score-p1 .score-val');
const scoreP2El = document.querySelector('#score-p2 .score-val');

const qDisplayP1 = document.getElementById('q-p1');
const optionsContainerP1 = document.getElementById('options-p1');
const qDisplayP2 = document.getElementById('q-p2');
const optionsContainerP2 = document.getElementById('options-p2');

const lessonTopicSelect = document.getElementById('lesson-topic');

// Audio Elements
const audioBGM = document.getElementById('audio-bgm');
const audioCorrect = document.getElementById('audio-correct');
const audioWrong = document.getElementById('audio-wrong');
const audioWin = document.getElementById('audio-win');
const audioDraw = document.getElementById('audio-draw');
const audioTimeout = document.getElementById('audio-timeout');

/**
 * 🔊 Memainkan efek suara
 * @param {HTMLAudioElement} audioEl - Elemen audio yang akan dimainkan
 */
function playSound(audioEl) {
    audioEl.currentTime = 0; // Reset ke awal
    audioEl.play().catch(e => console.error("Error playing audio:", e));
}

/**
 * 💾 Mengambil dan memuat data soal dari questions.json
 */
async function loadQuestions() {
  try {
        const response = await fetch('questions.json');
        const data = await response.json();
        
        masterQuestionPool = data;

        availableQuestionsP1 = [...masterQuestionPool]; 
        availableQuestionsP2 = [...masterQuestionPool];
    } catch (error) {
        console.error('Gagal memuat soal:', error);
        qDisplayP1.innerHTML = 'Gagal memuat soal. Cek console.';
    }
}

/**
 * 🔀 Mengambil soal secara acak tanpa pengulangan untuk pemain.
 * @param {string} player - 'p1' atau 'p2'
 */
function getNewQuestion(player) {
    // Tentukan pool soal yang akan digunakan
    const playerPool = player === 'p1' ? availableQuestionsP1 : availableQuestionsP2;
    
    // Cek apakah soal di pool pemain masih ada
    if (playerPool.length === 0) {
        // Ini seharusnya tidak terjadi jika soal sudah selesai, 
        // tapi sebagai safety net:
        console.warn(`${player} telah menyelesaikan semua soal!`);
        return; 
    }

    // Pilih soal secara acak dari pool pemain
    const randomIndex = Math.floor(Math.random() * playerPool.length);
    const question = playerPool[randomIndex];

    // Hapus soal dari daftar pool pemain
    playerPool.splice(randomIndex, 1); // <--- HANYA MENGHAPUS DARI POOL PEMAIN ITU

    // Simpan soal yang sedang aktif
    currentQuestions[player] = question; 

    // Tampilkan soal di UI
    displayQuestion(player, question);
}

/**
 * 🖥️ Menampilkan soal dan pilihan jawaban di UI
 * @param {string} player - 'p1' atau 'p2'
 * @param {Object} question - Objek soal
 */
function displayQuestion(player, question) {
    const qDisplay = player === 'p1' ? qDisplayP1 : qDisplayP2;
    const optionsContainer = player === 'p1' ? optionsContainerP1 : optionsContainerP2;

    qDisplay.innerHTML = `${question.question}`;
    optionsContainer.innerHTML = '';

    // Buat tombol untuk setiap pilihan
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.dataset.player = player;
        button.addEventListener('click', handleAnswer);
        optionsContainer.appendChild(button);
    });
}

/**
 * 👆 Menangani klik jawaban dari pemain
 * @param {Event} event - Event klik
 */
function handleAnswer(event) {
    if (!gameActive) return;

    const button = event.target;
    const player = button.dataset.player;
    const selectedAnswer = button.textContent.trim();
    const currentQ = currentQuestions[player];

    if (!currentQ) return;

    // Nonaktifkan semua tombol untuk pemain ini setelah menjawab
    const options = player === 'p1' ? optionsContainerP1 : optionsContainerP2;
    Array.from(options.children).forEach(btn => btn.disabled = true);

    // LOGIKA SKOR DAN LEVEL (tetap sama)
    if (selectedAnswer === currentQ.answer) {
        playerLevels[player]++;
        playerScores[player]++;
        updateMonkeyPosition(player);
        updateScoreUI(player);
        playSound(audioCorrect);
        button.style.backgroundColor = '#6aa84f';
    } else {
        playerLevels[player] = Math.max(0, playerLevels[player] - 1);
        updateMonkeyPosition(player);
        playSound(audioWrong);
        button.style.backgroundColor = '#cc0000';
    }

    // --- LOGIKA BARU UNTUK PELACAKAN SOAL ---
    questionsCompleted[player]++;

    // Cek Kemenangan Langsung (Mencapai puncak)
    if (playerLevels[player] >= MAX_LEVEL) {
        endGame(player);
        return;
    }
    
    // Cek Apakah Pemain Sudah Menyelesaikan Semua Soal (10 soal)
    if (questionsCompleted[player] >= TOTAL_QUESTIONS_PER_PLAYER) {
        const playerBox = document.getElementById(`player-${player.slice(-1)}-box`);
        const qDisplay = player === 'p1' ? qDisplayP1 : qDisplayP2;
        const optionsContainer = player === 'p1' ? optionsContainerP1 : optionsContainerP2;
        
        qDisplay.innerHTML = `✅ Soal Selesai!`;
        optionsContainer.innerHTML = `<p class="waiting-message">Silakan menunggu pemain lawan selesai mengerjakan ${TOTAL_QUESTIONS_PER_PLAYER} soal.</p>`;
        
        // Cek apakah kedua pemain sudah selesai
        if (questionsCompleted.p1 >= TOTAL_QUESTIONS_PER_PLAYER && questionsCompleted.p2 >= TOTAL_QUESTIONS_PER_PLAYER) {
            // Jika kedua pemain selesai, akhiri game dan tentukan pemenang berdasarkan level
            endGame('draw_by_completion');
        }
        
        return; // Hentikan proses jika soal sudah selesai
    }
    // ------------------------------------------

    // Tunda sebentar sebelum memuat soal baru
    setTimeout(() => {
        getNewQuestion(player);
    }, 800);
}

/**
 * 📈 Memperbarui posisi monyet di pohon
 * @param {string} player - 'p1' atau 'p2'
 */
function updateMonkeyPosition(player) {
    const monkeyEl = player === 'p1' ? monkeyP1 : monkeyP2;
    // Hitung posisi bottom baru berdasarkan level
    const newBottom = START_BOTTOM_PERCENT + (playerLevels[player] * LEVEL_STEP_PERCENT);
    monkeyEl.style.bottom = `${newBottom}%`;
}

/**
 * 📊 Memperbarui tampilan skor di header
 * @param {string} player - 'p1' atau 'p2'
 */
function updateScoreUI(player) {
    const scoreEl = player === 'p1' ? scoreP1El : scoreP2El;
    scoreEl.textContent = playerScores[player];
}


/**
 * ⏳ Mengelola timer permainan
 */
 function startTimer() {
        let timeLeft = TIME_LIMIT;
        const timerEl = document.getElementById('timer');
        
        const updateTimerDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        updateTimerDisplay(); // Tampilkan waktu awal

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
             if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endGame('timeout'); // Akhiri karena waktu habis
            }
             
        }, 1000);
    }

/**
 * 🛑 Mengakhiri permainan dan menampilkan hasil
 * @param {string} winner - 'p1', 'p2', 'draw', atau 'timeout'
 */
function endGame(winner) {
    gameActive = false;
    clearInterval(gameTimer);

    const resultMessageEl = document.getElementById('result-message');
    const finalScoreP1El = document.getElementById('final-score-p1');
    const finalScoreP2El = document.getElementById('final-score-p2');

    let message = '';
    let finalSound = null;

    if (winner === 'p1') {
        message = 'SELAMAT! Pemain 1 Berhasil Mencapai Puncak dan Mendapatkan Pisang Emas! 🏆🍌';
        finalSound = audioWin;
    } else if (winner === 'p2') {
        message = 'SELAMAT! Pemain 2 Berhasil Mencapai Puncak dan Mendapatkan Pisang Emas! 🏆🍌';
        finalSound = audioWin;
    } else if (winner === 'timeout') {
        playSound(audioTimeout);
        // Tentukan pemenang berdasarkan skor/level tertinggi saat timeout
        if (playerLevels.p1 > playerLevels.p2) {
            message = 'WAKTU HABIS! Pemain 1 Menang Berdasarkan Posisi Tertinggi! 🥇';
            finalSound = audioWin;
        } else if (playerLevels.p2 > playerLevels.p1) {
            message = 'WAKTU HABIS! Pemain 2 Menang Berdasarkan Posisi Tertinggi! 🥇';
            finalSound = audioWin;
        } else {
            message = 'WAKTU HABIS! Permainan Berakhir SERI! 🤝';
            finalSound = audioDraw;
        }
    } else if (winner === 'draw_by_completion') { // <--- KASUS BARU
        
        if (playerLevels.p1 > playerLevels.p2) {
            message = `SEMUA SOAL SELESAI! Pemain 1 Menang Berdasarkan Posisi Tertinggi (${playerLevels.p1} tingkat)! 🥇`;
            finalSound = audioWin;
        } else if (playerLevels.p2 > playerLevels.p1) {
            message = `SEMUA SOAL SELESAI! Pemain 2 Menang Berdasarkan Posisi Tertinggi (${playerLevels.p2} tingkat)! 🥇`;
            finalSound = audioWin;
        } else {
            message = 'SEMUA SOAL SELESAI! Permainan Berakhir SERI! 🤝';
            finalSound = audioDraw;
        }
    }else if (winner === 'draw') {
        message = 'Permainan Berakhir SERI! 🤝';
        finalSound = audioDraw;
    }

    resultMessageEl.textContent = message;
    finalScoreP1El.textContent = `Pemain 1: ${playerScores.p1} Jawaban Benar | Level: ${playerLevels.p1}/${MAX_LEVEL}`;
    finalScoreP2El.textContent = `Pemain 2: ${playerScores.p2} Jawaban Benar | Level: ${playerLevels.p2}/${MAX_LEVEL}`;

    if (finalSound) {
        playSound(finalSound);
    }
    
    audioBGM.pause();
    audioBGM.currentTime = 0;

    // Tampilkan overlay hasil
    resultOverlay.classList.add('active');
}


/**
 * 🚀 Fungsi utama untuk memulai permainan
 */
function startGame() {
    startOverlay.classList.remove('active');
    gameActive = true;
    timeLeft = TIME_LIMIT;
    
    // Reset posisi dan skor
    playerLevels = { p1: 0, p2: 0 };
    playerScores = { p1: 0, p2: 0 };
    updateMonkeyPosition('p1');
    updateMonkeyPosition('p2');
    updateScoreUI('p1');
    updateScoreUI('p2');
    questionsCompleted = { p1: 0, p2: 0 }; // <--- RESET BARU

    // --- LOGIKA BGM BARU ---
    audioBGM.volume = 0.5; // Atur volume agar tidak terlalu keras
    audioBGM.play().catch(e => console.warn("Background music play failed:", e)); // Mulai BGM

    availableQuestionsP1 = [...masterQuestionPool]; 
    availableQuestionsP2 = [...masterQuestionPool];
    // Jika masterQuestionPool belum terisi, panggil loadQuestions() lagi.
    if (masterQuestionPool.length === 0) {
        loadQuestions().then(startGame); // Muat soal, lalu panggil startGame lagi.
        return;
    }
    // Mulai timer
    startTimer();
    
    // Muat 2 soal pertama untuk masing-masing pemain
    getNewQuestion('p1');
    getNewQuestion('p2');
}

// Event listener untuk tombol Mulai Game
startGameBtn.addEventListener('click', startGame);

// Inisialisasi: Muat soal saat halaman dimuat
loadQuestions();