// Konfigurasi Game
const MAX_LEVEL = 10; // Tujuan akhir: Capai level 10
const TIME_LIMIT = 90; // Durasi waktu dalam detik
const LEVEL_STEP_PERCENT = 8; // Persentase kenaikan/penurunan posisi monyet per level (disesuaikan dengan visual pohon)
const START_BOTTOM_PERCENT = 5; // Posisi awal monyet

// State Game
let playerLevels = { p1: 0, p2: 0 };
let playerScores = { p1: 0, p2: 0 };
let currentQuestions = { p1: null, p2: null };
let availableQuestions = [];
let gameTimer;
let timeLeft = TIME_LIMIT;
let gameActive = false;

// Elemen DOM
const startOverlay = document.getElementById('start-overlay');
const resultOverlay = document.getElementById('result-overlay');
const startGameBtn = document.getElementById('start-game-btn');
const timeLeftEl = document.getElementById('time-left');

const monkeyP1 = document.getElementById('monkey-p1');
const monkeyP2 = document.getElementById('monkey-p2');
const scoreP1El = document.querySelector('#score-p1 .score-val');
const scoreP2El = document.querySelector('#score-p2 .score-val');

const qDisplayP1 = document.getElementById('q-p1');
const optionsContainerP1 = document.getElementById('options-p1');
const qDisplayP2 = document.getElementById('q-p2');
const optionsContainerP2 = document.getElementById('options-p2');

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
        availableQuestions = data;
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
    if (availableQuestions.length === 0) {
        // Jika soal habis, ulangi soal dari awal (opsional)
        loadQuestions(); 
        return;
    }

    // Pilih soal secara acak
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];

    // Hapus soal dari daftar agar tidak diulang
    availableQuestions.splice(randomIndex, 1); 

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

    if (selectedAnswer === currentQ.answer) {
        // Jawaban Benar: Monyet naik 1 tingkat
        playerLevels[player]++;
        playerScores[player]++;
        updateMonkeyPosition(player);
        updateScoreUI(player);
        playSound(audioCorrect);

        // Beri umpan balik visual singkat
        button.style.backgroundColor = '#6aa84f'; // Hijau

        // Cek Kemenangan
        if (playerLevels[player] >= MAX_LEVEL) {
            endGame(player);
            return;
        }

    } else {
        // Jawaban Salah: Monyet turun 1 tingkat
        playerLevels[player] = Math.max(0, playerLevels[player] - 1); // Tidak bisa turun di bawah 0
        updateMonkeyPosition(player);
        playSound(audioWrong);

        // Beri umpan balik visual singkat
        button.style.backgroundColor = '#cc0000'; // Merah
    }

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
    /** Memulai countdown timer. */
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
                // Waktu habis, cek pemenang
                checkWinCondition(true); 
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
    } else if (winner === 'draw') {
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

    // --- LOGIKA BGM BARU ---
    audioBGM.volume = 0.5; // Atur volume agar tidak terlalu keras
    audioBGM.play().catch(e => console.warn("Background music play failed:", e)); // Mulai BGM

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