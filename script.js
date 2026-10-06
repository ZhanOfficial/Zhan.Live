// ============================================
// ZhanOfficial Live — Video to Live Photo
// with AI Assistant 🤖 (Sidebar Layout)
// ============================================

// ============================================
// WELCOME SCREEN
// ============================================
const welcomeScreen = document.getElementById('welcome-screen');
const enterBtn = document.getElementById('enter-btn');
const app = document.getElementById('app');

enterBtn.addEventListener('click', () => {
    welcomeScreen.classList.add('exit');
    app.classList.remove('hidden');
    
    setTimeout(() => {
        app.classList.add('visible');
    }, 100);
    
    setTimeout(() => {
        welcomeScreen.style.display = 'none';
    }, 800);
    
    showToast('👋 Selamat datang di ZhanOfficial Live!');
    
    // AI sapa
    setTimeout(() => {
        addAIMessage('Yo! 🤖 Gue Zhan AI. Upload video kamu, nanti otomatis gue ubah jadi Live Photo. Butuh bantuan? Tanya aja!');
    }, 1500);
});

// ============================================
// DOM
// ============================================
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const uploadStep = document.getElementById('upload-step');
const processingStep = document.getElementById('processing-step');
const resultStep = document.getElementById('result-step');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const processingStatus = document.getElementById('processing-status');
const procSteps = document.querySelectorAll('.proc-step');
const resultImg = document.getElementById('result-img');
const resultVideo = document.getElementById('result-video');
const livePhotoCard = document.getElementById('live-photo-card');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const toast = document.getElementById('toast');

// AI
const aiMessages = document.getElementById('ai-messages');
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send');
const aiSuggestions = document.querySelectorAll('.ai-suggest');

// STATE
let sourceFileURL = null;
let livePhotoResult = null;
const LIVE_DURATION = 3;

// ============================================
// UPLOAD
// ============================================
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        processVideoAuto(file);
    } else {
        showToast('❌ File harus video!');
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processVideoAuto(file);
});

// ============================================
// AUTO PROCESS
// ============================================
async function processVideoAuto(file) {
    uploadStep.classList.add('hidden');
    processingStep.classList.remove('hidden');
    resultStep.classList.add('hidden');
    
    updateProgress(0);
    resetProcSteps();
    
    addAIMessage('📥 Video diterima! Gue mulai proses ya...');
    
    try {
        // STEP 1
        activateProcStep(1);
        processingStatus.textContent = 'Memuat video...';
        
        if (sourceFileURL) URL.revokeObjectURL(sourceFileURL);
        sourceFileURL = URL.createObjectURL(file);
        
        const hiddenVideo = document.createElement('video');
        hiddenVideo.src = sourceFileURL;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        hiddenVideo.preload = 'auto';
        
        await new Promise((resolve, reject) => {
            hiddenVideo.onloadedmetadata = () => resolve();
            hiddenVideo.onerror = () => reject(new Error('Video error'));
        });
        
        await waitForCanPlay(hiddenVideo);
        updateProgress(15);
        markProcStepDone(1);
        
        // STEP 2
        activateProcStep(2);
        processingStatus.textContent = '🤖 AI menganalisis video...';
        const aiPick = await aiPickBestMoment(hiddenVideo);
        await sleep(600);
        updateProgress(35);
        markProcStepDone(2);
        
        // STEP 3
        activateProcStep(3);
        processingStatus.textContent = '📸 Mengambil frame terbaik...';
        
        hiddenVideo.currentTime = aiPick.time;
        await new Promise((r) => { hiddenVideo.onseeked = () => r(); });
        
        const imageDataURL = captureFrame(hiddenVideo);
        updateProgress(55);
        await sleep(300);
        
        processingStatus.textContent = '🎥 Merekam 3 detik video...';
        const videoBlob = await recordSegment(hiddenVideo, LIVE_DURATION, (progress) => {
            updateProgress(55 + progress * 30);
        });
        
        const videoURL = URL.createObjectURL(videoBlob);
        updateProgress(88);
        markProcStepDone(3);
        
        // STEP 4
        activateProcStep(4);
        processingStatus.textContent = '✨ Finalisasi Live Photo...';
        await sleep(700);
        updateProgress(100);
        markProcStepDone(4);
        
        livePhotoResult = {
            imageDataURL,
            videoBlob,
            videoURL,
            aiTime: aiPick.time,
            aiReason: aiPick.reason
        };
        
        await sleep(400);
        showResult();
        
    } catch (err) {
        console.error(err);
        showToast('❌ Gagal proses: ' + err.message);
        addAIMessage('❌ Wah, ada error nih: ' + err.message + '. Coba upload video lain ya.');
        
        processingStep.classList.add('hidden');
        uploadStep.classList.remove('hidden');
    }
}

function waitForCanPlay(videoEl) {
    return new Promise((resolve) => {
        if (videoEl.readyState >= 3) return resolve();
        videoEl.oncanplaythrough = () => resolve();
        setTimeout(resolve, 2000);
    });
}

// ============================================
// AI PICK BEST MOMENT
// ============================================
async function aiPickBestMoment(videoEl) {
    const duration = videoEl.duration;
    let time = 0;
    let reason = '';
    
    if (duration <= 3.5) {
        time = 0;
        reason = 'video pendek';
    } else if (duration <= 10) {
        time = duration / 4;
        reason = 'awal video';
    } else {
        time = duration * 0.3;
        reason = 'momen tengah';
    }
    
    if (time + LIVE_DURATION > duration) {
        time = Math.max(0, duration - LIVE_DURATION);
    }
    
    return { time, reason };
}

// ============================================
// CAPTURE & RECORD
// ============================================
function captureFrame(videoEl) {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
}

function recordSegment(videoEl, duration, onProgress) {
    return new Promise(async (resolve, reject) => {
        try {
            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4'
            ];
            let mimeType = '';
            for (const t of mimeTypes) {
                if (MediaRecorder.isTypeSupported(t)) {
                    mimeType = t;
                    break;
                }
            }
            
            if (!mimeType) throw new Error('Browser tidak support MediaRecorder');
            
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0);
            
            const canvasStream = canvas.captureStream(30);
            
            const recorder = new MediaRecorder(canvasStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000
            });
            
            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            recorder.onstop = () => {
                resolve(new Blob(chunks, { type: mimeType }));
            };
            
            recorder.onerror = (e) => reject(e);
            
            const startTime = videoEl.currentTime;
            videoEl.currentTime = startTime;
            
            await new Promise((r) => { videoEl.onseeked = () => r(); });
            
            recorder.start();
            videoEl.play();
            
            let recording = true;
            const startTimestamp = performance.now();
            
            function drawLoop() {
                if (!recording) return;
                
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                
                const elapsed = (performance.now() - startTimestamp) / 1000;
                if (onProgress) onProgress(Math.min(elapsed / duration, 1));
                
                if (elapsed >= duration || videoEl.ended) {
                    recording = false;
                    videoEl.pause();
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                }
                
                requestAnimationFrame(drawLoop);
            }
            
            drawLoop();
            
            setTimeout(() => {
                if (recording) {
                    recording = false;
                    videoEl.pause();
                    if (recorder.state === 'recording') recorder.stop();
                }
            }, (duration + 1) * 1000);
            
        } catch (err) {
            reject(err);
        }
    });
}

// ============================================
// PROGRESS UI
// ============================================
function updateProgress(percent) {
    progressFill.style.width = percent + '%';
    progressPercent.textContent = Math.round(percent) + '%';
}

function resetProcSteps() {
    procSteps.forEach(s => s.classList.remove('active', 'done'));
}

function activateProcStep(n) {
    procSteps.forEach(s => {
        const step = parseInt(s.dataset.step);
        if (step === n) s.classList.add('active');
        else if (step < n) s.classList.add('done');
        else s.classList.remove('active', 'done');
    });
}

function markProcStepDone(n) {
    procSteps.forEach(s => {
        if (parseInt(s.dataset.step) === n) {
            s.classList.remove('active');
            s.classList.add('done');
        }
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ============================================
// SHOW RESULT
// ============================================
function showResult() {
    resultImg.src = livePhotoResult.imageDataURL;
    resultVideo.src = livePhotoResult.videoURL;
    
    processingStep.classList.add('hidden');
    resultStep.classList.remove('hidden');
    
    livePhotoCard.classList.remove('playing');
    
    showToast('✅ Live Photo siap!');
    addAIMessage(`✅ Live Photo kamu udah jadi! Gue pilih momen di detik ${livePhotoResult.aiTime.toFixed(1)} (${livePhotoResult.aiReason}). Tekan & tahan foto buat mainkan videonya! 🎬`);
}

// ============================================
// PRESS & HOLD
// ============================================
livePhotoCard.addEventListener('mousedown', startPlaying);
livePhotoCard.addEventListener('mouseup', stopPlaying);
livePhotoCard.addEventListener('mouseleave', stopPlaying);

livePhotoCard.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startPlaying();
}, { passive: false });

livePhotoCard.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopPlaying();
});

livePhotoCard.addEventListener('touchcancel', stopPlaying);

function startPlaying() {
    if (!livePhotoResult) return;
    livePhotoCard.classList.add('playing');
    resultVideo.currentTime = 0;
    resultVideo.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(15);
}

function stopPlaying() {
    livePhotoCard.classList.remove('playing');
    resultVideo.pause();
    resultVideo.currentTime = 0;
}

// ============================================
// DOWNLOAD & RESET
// ============================================
downloadBtn.addEventListener('click', () => {
    if (!livePhotoResult) return;
    
    const a1 = document.createElement('a');
    a1.href = livePhotoResult.imageDataURL;
    a1.download = `live-photo-${Date.now()}.jpg`;
    a1.click();
    
    setTimeout(() => {
        const a2 = document.createElement('a');
        a2.href = livePhotoResult.videoURL;
        a2.download = `live-photo-${Date.now()}.webm`;
        a2.click();
    }, 400);
    
    showToast('⬇️ Foto + Video didownload');
});

resetBtn.addEventListener('click', () => {
    if (livePhotoResult) {
        URL.revokeObjectURL(livePhotoResult.videoURL);
        livePhotoResult = null;
    }
    if (sourceFileURL) {
        URL.revokeObjectURL(sourceFileURL);
        sourceFileURL = null;
    }
    
    resultImg.src = '';
    resultVideo.removeAttribute('src');
    resultVideo.load();
    
    fileInput.value = '';
    
    uploadStep.classList.remove('hidden');
    processingStep.classList.add('hidden');
    resultStep.classList.add('hidden');
    
    updateProgress(0);
    resetProcSteps();
    
    showToast('🔄 Siap upload video lagi');
});

// ============================================
// AI ASSISTANT
// ============================================
const aiKnowledge = {
    'live photo': 'Live Photo itu kayak di iPhone — foto statis + video 3 detik. Pas kamu tap & tahan, videonya main. Website ini bikin Live Photo dari video yang kamu upload! 📸',
    'cara pakai': 'Gampang banget bro! 1) Klik/drag video ke halaman, 2) AI otomatis pilih momen terbaik, 3) Tunggu proses, 4) Live Photo siap! Tekan & tahan buat mainkan. 🎬',
    'tips': 'Tips video bagus: pilih video yang gerakannya halus, durasi 5-30 detik, resolusi minimal 720p. AI bakal pilih momen paling stabil! 🎥',
    'apa itu': 'Website ZhanOfficial Live ini ngubah video jadi Live Photo ala iPhone. Ada AI yang bantu pilih momen terbaik dari video kamu. 🤖',
    'siapa': 'Gue Zhan AI, asisten virtual di website ini. Tugas gue bantu kamu pakai website ini + jawab pertanyaan seputar Live Photo! 🤖🗿',
    'download': 'Klik tombol "⬇️ Download" di bawah Live Photo. Nanti dapet 2 file: JPG (foto) + WEBM (video). Simpan di folder yang sama biar bisa dipasangkan. 💾',
    'ai': 'Gue AI yang bantu pilih momen terbaik dari video kamu! Analisis gerakan & stabilitas frame, terus pilih titik optimal buat Live Photo. 🤖✨',
    'hello': 'Yo bro! 👋 Ada yang bisa gue bantu? Tanya soal Live Photo, cara pakai, atau tips video!',
    'hai': 'Hai juga bro! 👋 Mau tanya apa? Gue siap bantu!',
    'error': 'Kalau ada error, coba: 1) Pastikan browser Chrome/Edge/Safari versi terbaru, 2) Video format MP4/WebM, 3) Refresh halaman. Kalau masih error, kabarin ya! 🔧',
    'zhan': 'ZhanOfficial 🗿 — dev yang bikin website ini. Gokil kan? Kalau mau bikin project lain, tinggal DM aja! 🔥'
};

aiSend.addEventListener('click', sendAIMessage);
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIMessage();
});

aiSuggestions.forEach(btn => {
    btn.addEventListener('click', () => {
        aiInput.value = btn.textContent;
        sendAIMessage();
    });
});

function sendAIMessage() {
    const msg = aiInput.value.trim();
    if (!msg) return;
    
    addAIMessage(msg, 'user');
    aiInput.value = '';
    
    const typingMsg = document.createElement('div');
    typingMsg.className = 'ai-msg bot typing';
    typingMsg.textContent = 'Zhan AI lagi mikir';
    aiMessages.appendChild(typingMsg);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    
    setTimeout(() => {
        typingMsg.remove();
        const reply = getAIReply(msg);
        addAIMessage(reply, 'bot');
    }, 900 + Math.random() * 600);
}

function addAIMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `ai-msg ${sender}`;
    msg.textContent = text;
    aiMessages.appendChild(msg);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function getAIReply(input) {
    const lower = input.toLowerCase();
    
    for (const [key, value] of Object.entries(aiKnowledge)) {
        if (lower.includes(key)) return value;
    }
    
    const fallbacks = [
        'Hmm, gue kurang ngerti pertanyaan itu. Coba tanya soal "Live Photo", "cara pakai", atau "tips video" ya! 🤖',
        'Wah, itu di luar pengetahuan gue. Tapi gue bisa bantu soal Live Photo, video, atau website ini! 🎬',
        'Bisa jelasin lebih detail? Atau coba kata kunci: Live Photo, cara pakai, tips, download, AI 🤖'
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================
// TOAST & HELPERS
// ============================================
let toastTimeout;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (sourceFileURL) URL.revokeObjectURL(sourceFileURL);
    if (livePhotoResult) URL.revokeObjectURL(livePhotoResult.videoURL);
});

console.log('🎬 ZhanOfficial Live loaded! 🤖');
