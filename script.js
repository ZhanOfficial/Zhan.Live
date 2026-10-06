// ============================================
// VIDEO TO LIVE PHOTO
// ZhanOfficial Edition 🗿
// "Video in, photos out. Simple."
// ============================================

// ----- DOM -----
const video = document.getElementById('video');
const canvas = document.getElementById('snapshot-canvas');
const ctx = canvas.getContext('2d');
const startCamBtn = document.getElementById('start-cam-btn');
const cameraOffMsg = document.getElementById('camera-off-msg');
const liveIndicator = document.getElementById('live-indicator');
const statusBadge = document.getElementById('status-badge');
const intervalSelect = document.getElementById('interval-select');
const filterSelect = document.getElementById('filter-select');
const autoToggleBtn = document.getElementById('auto-toggle-btn');
const manualCaptureBtn = document.getElementById('manual-capture-btn');
const gallery = document.getElementById('gallery');
const photoCount = document.getElementById('photo-count');
const downloadAllBtn = document.getElementById('download-all-btn');
const clearBtn = document.getElementById('clear-btn');
const toast = document.getElementById('toast');

// Upload mode
const videoInput = document.getElementById('video-input');
const dropZone = document.getElementById('drop-zone');
const uploadPreview = document.getElementById('upload-preview');
const uploadedVideo = document.getElementById('uploaded-video');
const seekSlider = document.getElementById('seek-slider');
const seekTime = document.getElementById('seek-time');
const uploadInterval = document.getElementById('upload-interval');
const extractFrameBtn = document.getElementById('extract-frame-btn');
const extractAllBtn = document.getElementById('extract-all-btn');
const resetUploadBtn = document.getElementById('reset-upload-btn');

// Preview modal
const previewModal = document.getElementById('preview-modal');
const previewImg = document.getElementById('preview-img');
const previewInfo = document.getElementById('preview-info');
const downloadOneBtn = document.getElementById('download-one-btn');
const closePreviewBtn = document.getElementById('close-preview-btn');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const liveMode = document.getElementById('live-mode');
const uploadMode = document.getElementById('upload-mode');

// ----- STATE -----
let stream = null;
let autoCaptureTimer = null;
let isAutoCapturing = false;
let photos = []; // {dataURL, timestamp, index, source}
let currentFilter = 'none';

// ============================================
// TAB SWITCHING
// ============================================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.dataset.mode;
        if (mode === 'live') {
            liveMode.classList.remove('hidden');
            uploadMode.classList.add('hidden');
            stopAutoCapture();
        } else {
            liveMode.classList.add('hidden');
            uploadMode.classList.remove('hidden');
            stopAutoCapture();
        }
    });
});

// ============================================
// MODE 1: LIVE CAMERA
// ============================================

startCamBtn.addEventListener('click', startCamera);

async function startCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        video.srcObject = stream;
        video.classList.add('active');
        cameraOffMsg.classList.add('hidden');
        statusBadge.textContent = '● READY';
        statusBadge.classList.remove('recording');
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        };

        showToast('📷 Kamera aktif! Siap capture');
    } catch (err) {
        console.error(err);
        showToast('❌ Kamera gagal diakses: ' + err.name);
        cameraOffMsg.classList.remove('hidden');
    }
}

// Filter change
filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    video.style.filter = currentFilter;
    showToast('🎨 Filter: ' + e.target.options[e.target.selectedIndex].text);
});

// Auto capture toggle
autoToggleBtn.addEventListener('click', () => {
    if (!stream) {
        showToast('❌ Nyalakan kamera dulu!');
        return;
    }
    
    if (isAutoCapturing) {
        stopAutoCapture();
    } else {
        startAutoCapture();
    }
});

function startAutoCapture() {
    isAutoCapturing = true;
    const interval = parseInt(intervalSelect.value);
    
    autoToggleBtn.textContent = '⏹️ STOP AUTO-CAPTURE';
    autoToggleBtn.classList.add('recording');
    liveIndicator.classList.remove('hidden');
    statusBadge.textContent = '● RECORDING';
    statusBadge.classList.add('recording');
    
    // First capture immediately
    captureFrame();
    
    // Then repeat
    autoCaptureTimer = setInterval(captureFrame, interval);
    showToast(`▶️ Auto-capture tiap ${interval / 1000}s`);
}

function stopAutoCapture() {
    if (autoCaptureTimer) {
        clearInterval(autoCaptureTimer);
        autoCaptureTimer = null;
    }
    isAutoCapturing = false;
    
    autoToggleBtn.textContent = '▶️ MULAI AUTO-CAPTURE';
    autoToggleBtn.classList.remove('recording');
    liveIndicator.classList.add('hidden');
    statusBadge.textContent = stream ? '● READY' : '● READY';
    statusBadge.classList.remove('recording');
}

// Manual capture
manualCaptureBtn.addEventListener('click', () => {
    if (!stream) {
        showToast('❌ Nyalakan kamera dulu!');
        return;
    }
    captureFrame();
});

function captureFrame() {
    if (!stream || !video.videoWidth) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror because video is mirrored via CSS
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Apply filter if any
    if (currentFilter !== 'none') {
        applyFilterToCanvas(ctx, canvas.width, canvas.height, currentFilter);
    }
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.85);
    
    addPhoto({
        dataURL,
        timestamp: Date.now(),
        source: 'live',
        filter: currentFilter
    });
    
    // Flash effect
    flashEffect();
    playShutterSound();
}

// ============================================
// MODE 2: UPLOAD VIDEO
// ============================================

dropZone.addEventListener('click', () => videoInput.click());

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
        loadVideoFile(file);
    } else {
        showToast('❌ File bukan video!');
    }
});

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadVideoFile(file);
});

function loadVideoFile(file) {
    const url = URL.createObjectURL(file);
    uploadedVideo.src = url;
    document.getElementById('upload-area').style.display = 'none';
    uploadPreview.classList.remove('hidden');
    
    showToast('✅ Video dimuat: ' + file.name);
    
    uploadedVideo.addEventListener('loadedmetadata', () => {
        seekSlider.max = 100;
        updateSeekTime();
    });
}

// Seek slider
seekSlider.addEventListener('input', () => {
    if (uploadedVideo.duration) {
        uploadedVideo.currentTime = (seekSlider.value / 100) * uploadedVideo.duration;
        updateSeekTime();
    }
});

uploadedVideo.addEventListener('timeupdate', () => {
    if (uploadedVideo.duration) {
        seekSlider.value = (uploadedVideo.currentTime / uploadedVideo.duration) * 100;
        updateSeekTime();
    }
});

function updateSeekTime() {
    const cur = uploadedVideo.currentTime || 0;
    const dur = uploadedVideo.duration || 0;
    seekTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Extract single frame
extractFrameBtn.addEventListener('click', () => {
    if (!uploadedVideo.videoWidth) {
        showToast('❌ Video belum siap!');
        return;
    }
    
    const w = uploadedVideo.videoWidth;
    const h = uploadedVideo.videoHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(uploadedVideo, 0, 0, w, h);
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    
    addPhoto({
        dataURL,
        timestamp: Date.now(),
        source: 'upload',
        videoTime: uploadedVideo.currentTime
    });
    
    flashEffect();
    playShutterSound();
});

// Extract ALL frames (every X seconds)
extractAllBtn.addEventListener('click', async () => {
    if (!uploadedVideo.videoWidth || !uploadedVideo.duration) {
        showToast('❌ Video belum siap!');
        return;
    }
    
    const interval = parseInt(uploadInterval.value) / 1000;
    const duration = uploadedVideo.duration;
    const totalFrames = Math.floor(duration / interval);
    
    if (totalFrames > 200) {
        if (!confirm(`Akan extract ${totalFrames} frame. Lanjut? (bisa lambat)`)) return;
    }
    
    showToast(`⚡ Extracting ${totalFrames} frame...`);
    extractAllBtn.disabled = true;
    extractAllBtn.textContent = '⏳ Processing...';
    
    // Save current time to restore later
    const originalTime = uploadedVideo.currentTime;
    const wasPaused = uploadedVideo.paused;
    
    for (let i = 0; i < totalFrames; i++) {
        const time = i * interval;
        
        await seekVideoTo(time);
        
        const w = uploadedVideo.videoWidth;
        const h = uploadedVideo.videoHeight;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(uploadedVideo, 0, 0, w, h);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.85);
        
        addPhoto({
            dataURL,
            timestamp: Date.now() + i,
            source: 'upload',
            videoTime: time
        });
        
        // Update progress
        extractAllBtn.textContent = `⏳ ${i + 1}/${totalFrames}`;
        
        // Small delay to not freeze UI
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
    }
    
    // Restore
    uploadedVideo.currentTime = originalTime;
    
    extractAllBtn.disabled = false;
    extractAllBtn.textContent = '⚡ Extract Semua Frame';
    
    flashEffect();
    showToast(`✅ ${totalFrames} frame berhasil di-extract!`);
});

function seekVideoTo(time) {
    return new Promise(resolve => {
        const onSeeked = () => {
            uploadedVideo.removeEventListener('seeked', onSeeked);
            resolve();
        };
        uploadedVideo.addEventListener('seeked', onSeeked);
        uploadedVideo.currentTime = time;
    });
}

// Reset upload
resetUploadBtn.addEventListener('click', () => {
    uploadedVideo.pause();
    uploadedVideo.src = '';
    videoInput.value = '';
    document.getElementById('upload-area').style.display = 'block';
    uploadPreview.classList.add('hidden');
    showToast('🔄 Video direset');
});

// ============================================
// GALLERY
// ============================================

function addPhoto(photo) {
    photo.index = photos.length + 1;
    photos.push(photo);
    
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.index = photo.index;
    
    const img = document.createElement('img');
    img.src = photo.dataURL;
    img.alt = 'Photo ' + photo.index;
    
    const time = document.createElement('div');
    time.className = 'timestamp';
    const d = new Date(photo.timestamp);
    time.textContent = photo.source === 'upload' && photo.videoTime !== undefined
        ? `Video @ ${formatTime(photo.videoTime)}`
        : d.toLocaleTimeString('id-ID');
    
    item.appendChild(img);
    item.appendChild(time);
    item.addEventListener('click', () => openPreview(photo));
    
    gallery.appendChild(item);
    photoCount.textContent = photos.length;
}

function openPreview(photo) {
    previewImg.src = photo.dataURL;
    downloadOneBtn.href = photo.dataURL;
    downloadOneBtn.download = `photo-${photo.index}-${photo.timestamp}.jpg`;
    
    const d = new Date(photo.timestamp);
    previewInfo.textContent = `Foto #${photo.index} • ${d.toLocaleString('id-ID')} • Source: ${photo.source}`;
    
    previewModal.classList.remove('hidden');
}

closePreviewBtn.addEventListener('click', () => {
    previewModal.classList.add('hidden');
});

previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.classList.add('hidden');
});

// Clear all
clearBtn.addEventListener('click', () => {
    if (photos.length === 0) {
        showToast('📭 Gallery kosong');
        return;
    }
    if (confirm(`Hapus semua ${photos.length} foto?`)) {
        photos = [];
        gallery.innerHTML = '';
        photoCount.textContent = '0';
        showToast('🗑️ Semua foto dihapus');
    }
});

// Download all as ZIP
downloadAllBtn.addEventListener('click', async () => {
    if (photos.length === 0) {
        showToast('📭 Belum ada foto');
        return;
    }
    
    showToast('📦 Membuat ZIP...');
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = '⏳ Zipping...';
    
    try {
        const zip = new JSZip();
        const folder = zip.folder('live-photos');
        
        for (const photo of photos) {
            const base64 = photo.dataURL.split(',')[1];
            folder.file(`photo-${String(photo.index).padStart(3, '0')}.jpg`, base64, { base64: true });
        }
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `live-photos-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast(`✅ ${photos.length} foto di-download!`);
    } catch (err) {
        console.error(err);
        showToast('❌ Gagal buat ZIP');
    }
    
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = '⬇️ Download Semua';
});

// ============================================
// HELPERS
// ============================================

function applyFilterToCanvas(ctx, w, h, filter) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    const isGray = filter.includes('grayscale');
    const isSepia = filter.includes('sepia');
    const isInvert = filter.includes('invert');
    const isBright = filter.match(/brightness\(([\d.]+)\)/);
    const isContrast = filter.match(/contrast\(([\d.]+)\)/);
    const isSat = filter.match(/saturate\(([\d.]+)\)/);
    
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        
        if (isGray) {
            const gray = 0.299*r + 0.587*g + 0.114*b;
            r = g = b = gray;
        } else if (isSepia) {
            const tr = 0.393*r + 0.769*g + 0.189*b;
            const tg = 0.349*r + 0.686*g + 0.168*b;
            const tb = 0.272*r + 0.534*g + 0.131*b;
            r = Math.min(255, tr);
            g = Math.min(255, tg);
            b = Math.min(255, tb);
        } else if (isInvert) {
            r = 255 - r; g = 255 - g; b = 255 - b;
        } else if (isBright) {
            const f = parseFloat(isBright[1]);
            r = Math.min(255, r * f);
            g = Math.min(255, g * f);
            b = Math.min(255, b * f);
        } else if (isContrast) {
            const f = parseFloat(isContrast[1]);
            r = Math.min(255, Math.max(0, (r - 128) * f + 128));
            g = Math.min(255, Math.max(0, (g - 128) * f + 128));
            b = Math.min(255, Math.max(0, (b - 128) * f + 128));
        } else if (isSat) {
            const f = parseFloat(isSat[1]);
            const gray = 0.299*r + 0.587*g + 0.114*b;
            r = Math.min(255, gray + (r - gray) * f);
            g = Math.min(255, gray + (g - gray) * f);
            b = Math.min(255, gray + (b - gray) * f);
        }
        
        data[i] = r;
        data[i+1] = g;
        data[i+2] = b;
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function flashEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: #fff;
        z-index: 9999;
        pointer-events: none;
        animation: flashAnim 0.25s ease-out;
    `;
    document.body.appendChild(flash);
    
    const style = document.createElement('style');
    style.textContent = `@keyframes flashAnim { 0% { opacity: 0; } 30% { opacity: 0.9; } 100% { opacity: 0; } }`;
    document.head.appendChild(style);
    
    setTimeout(() => {
        flash.remove();
        style.remove();
    }, 300);
}

function playShutterSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
}

let toastTimeout;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stopAutoCapture();
});

console.log('🎥➡️📸 VIDEO TO LIVE PHOTO loaded! ZhanOfficial 🗿');
