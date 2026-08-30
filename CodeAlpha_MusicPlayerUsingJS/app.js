// Default Preloaded Playlist
const defaultSongs = [
    {
        title: "Neon Horizon",
        artist: "Helix Waves",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        cover: "assets/cover1.png"
    },
    {
        title: "Rainy Cafe",
        artist: "Lofi Dreamer",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        cover: "assets/cover2.png"
    },
    {
        title: "Fluid Gold",
        artist: "Cosmic Mind",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        cover: "assets/cover3.png"
    }
];

let playlist = [...defaultSongs];
let currentSongIndex = 0;
let isPlaying = false;
let isMuted = false;
let isShuffle = false;
let isRepeat = 0; // 0 = no repeat, 1 = repeat playlist, 2 = repeat single song
let prevVolume = 0.7;

// DOM Elements
const audio = new Audio();
audio.volume = 0.7;

const albumArt = document.getElementById("album-art");
const songTitle = document.getElementById("song-title");
const songArtist = document.getElementById("song-artist");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");
const volumeSlider = document.getElementById("volume-slider");
const volumeFill = document.getElementById("volume-fill");
const muteBtn = document.getElementById("mute-btn");
const playlistToggle = document.getElementById("playlist-toggle");
const playlistSidebar = document.getElementById("playlist-sidebar");
const closeSidebar = document.getElementById("close-sidebar");
const trackList = document.getElementById("track-list");
const searchInput = document.getElementById("search-tracks");
const fileUpload = document.getElementById("file-upload");
const dropZone = document.getElementById("drop-zone");
const canvas = document.getElementById("visualizer");
const canvasCtx = canvas.getContext("2d");

// Web Audio API Variables
let audioCtx;
let analyser;
let sourceNode;
let visualizerInitialized = false;

// Initialize Web Audio Visualizer
function initVisualizer() {
    if (visualizerInitialized) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        // Connect Audio Element to Analyser
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        visualizerInitialized = true;
        drawVisualizer();
    } catch (e) {
        console.error("Failed to initialize AudioContext", e);
    }
}

// Render dynamic circular visualizer
function drawVisualizer() {
    if (!visualizerInitialized) return;
    requestAnimationFrame(drawVisualizer);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 105; // Matches the album art outline
    const barCount = 60;
    
    // Draw circular audio wave bars radiating outward
    for (let i = 0; i < barCount; i++) {
        // Map frequency data index
        const dataIndex = Math.floor((i / barCount) * bufferLength * 0.7);
        const value = dataArray[dataIndex] || 0;
        
        const barHeight = (value / 255) * 45; // Max 45px visualizer bars
        const angle = (i / barCount) * Math.PI * 2;
        
        const startX = centerX + Math.cos(angle) * baseRadius;
        const startY = centerY + Math.sin(angle) * baseRadius;
        const endX = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const endY = centerY + Math.sin(angle) * (baseRadius + barHeight);
        
        // Define color gradient for visualizer bars based on index
        const alpha = isPlaying ? 0.3 + (value / 255) * 0.7 : 0.15;
        canvasCtx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
        canvasCtx.lineWidth = 3;
        canvasCtx.lineCap = "round";
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(startX, startY);
        canvasCtx.lineTo(endX, endY);
        canvasCtx.stroke();
    }
}

// Populate playlist UI
function renderPlaylist(filter = "") {
    trackList.innerHTML = "";
    const filteredSongs = playlist.filter(song => 
        song.title.toLowerCase().includes(filter.toLowerCase()) ||
        song.artist.toLowerCase().includes(filter.toLowerCase())
    );
    
    filteredSongs.forEach((song) => {
        // Find real index in original playlist
        const originalIndex = playlist.findIndex(s => s.src === song.src);
        
        const trackItem = document.createElement("div");
        trackItem.classList.add("track-item");
        if (originalIndex === currentSongIndex) {
            trackItem.classList.add("active");
            if (isPlaying) {
                trackItem.classList.add("playing-state");
            }
        }
        
        trackItem.innerHTML = `
            <img src="${song.cover}" alt="${song.title}" class="track-item-img">
            <div class="track-item-info">
                <div class="track-item-title">${song.title}</div>
                <div class="track-item-artist">${song.artist}</div>
            </div>
            <div class="track-item-duration">0:00</div>
            <div class="wave-icon">
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
            </div>
        `;
        
        // Dynamically get the duration of the audio once metadata loads
        const tempAudio = new Audio(song.src);
        tempAudio.addEventListener("loadedmetadata", () => {
            const min = Math.floor(tempAudio.duration / 60);
            const sec = Math.floor(tempAudio.duration % 60);
            const durationText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
            const durationEl = trackItem.querySelector(".track-item-duration");
            if (durationEl) durationEl.textContent = durationText;
        });
        
        trackItem.addEventListener("click", () => {
            loadSong(originalIndex);
            playSong();
        });
        
        trackList.appendChild(trackItem);
    });
}

// Load Song Details
function loadSong(index) {
    currentSongIndex = index;
    const song = playlist[currentSongIndex];
    
    // Update player card details
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    albumArt.src = song.cover;
    audio.src = song.src;
    
    // Reset seek progress bar
    progressBar.value = 0;
    progressFill.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    
    // Update active state in playlist sidebar
    const items = trackList.querySelectorAll(".track-item");
    items.forEach((item, idx) => {
        if (idx === currentSongIndex) {
            item.classList.add("active");
            if (isPlaying) item.classList.add("playing-state");
        } else {
            item.classList.remove("active", "playing-state");
        }
    });
    
    // Change Mesh Background Accent Dynamically
    updateDynamicBackground(index);
}

// Shift mesh backgrounds depending on the track
function updateDynamicBackground(index) {
    const bgColors = [
        ["rgba(168, 85, 247, 0.4)", "rgba(99, 102, 241, 0.4)"],
        ["rgba(14, 165, 233, 0.4)", "rgba(16, 185, 129, 0.4)"],
        ["rgba(239, 68, 68, 0.4)", "rgba(245, 158, 11, 0.4)"]
    ];
    const picked = bgColors[index % bgColors.length];
    document.querySelector(".circle-1").style.background = `radial-gradient(circle, ${picked[0]} 0%, rgba(99,102,241,0) 70%)`;
    document.querySelector(".circle-2").style.background = `radial-gradient(circle, ${picked[1]} 0%, rgba(236,72,153,0) 70%)`;
}

// Play Song
function playSong() {
    isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    albumArt.classList.add("playing");
    
    // Initialize & resume audio visualizer context
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    } else {
        initVisualizer();
    }
    
    audio.play().catch(err => {
        console.log("Audio playback user gesture requirement or load failure:", err);
    });
    
    // Update playlist visual wave indicators
    const activeItem = trackList.querySelector(".track-item.active");
    if (activeItem) activeItem.classList.add("playing-state");
}

// Pause Song
function pauseSong() {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    albumArt.classList.remove("playing");
    audio.pause();
    
    // Pause playlist wave animations
    const activeItem = trackList.querySelector(".track-item.active");
    if (activeItem) activeItem.classList.remove("playing-state");
}

// Previous Song
function prevSong() {
    let index = currentSongIndex - 1;
    if (index < 0) {
        index = playlist.length - 1;
    }
    loadSong(index);
    if (isPlaying) playSong();
}

// Next Song
function nextSong() {
    if (isShuffle) {
        loadSong(Math.floor(Math.random() * playlist.length));
    } else {
        let index = currentSongIndex + 1;
        if (index >= playlist.length) {
            index = 0;
        }
        loadSong(index);
    }
    if (isPlaying) playSong();
}

// Play/Pause Action
playBtn.addEventListener("click", () => {
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

// Controls Action Events
prevBtn.addEventListener("click", prevSong);
nextBtn.addEventListener("click", nextSong);

// Shuffle mode toggle
shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
});

// Repeat modes: 0 -> 1 (Repeat All) -> 2 (Repeat Single) -> 0
repeatBtn.addEventListener("click", () => {
    isRepeat = (isRepeat + 1) % 3;
    if (isRepeat === 0) {
        repeatBtn.classList.remove("active");
        repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        repeatBtn.title = "Repeat Off";
    } else if (isRepeat === 1) {
        repeatBtn.classList.add("active");
        repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        repeatBtn.title = "Repeat Playlist";
    } else {
        repeatBtn.classList.add("active");
        repeatBtn.innerHTML = '<i class="fa-solid fa-repeat-1"></i>';
        repeatBtn.title = "Repeat Current Song";
    }
});

// Track ended event
audio.addEventListener("ended", () => {
    if (isRepeat === 2) {
        loadSong(currentSongIndex);
        playSong();
    } else if (isRepeat === 1 || currentSongIndex < playlist.length - 1) {
        nextSong();
    } else {
        pauseSong();
    }
});

// Track seek progress tracking
audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent;
        progressFill.style.width = `${percent}%`;
        
        // Update Time displays
        const curMin = Math.floor(audio.currentTime / 60);
        const curSec = Math.floor(audio.currentTime % 60);
        currentTimeEl.textContent = `${curMin}:${curSec < 10 ? '0' : ''}${curSec}`;
        
        const durMin = Math.floor(audio.duration / 60);
        const durSec = Math.floor(audio.duration % 60);
        durationTimeEl.textContent = `${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
    }
});

// Seeking manually on trackbar
progressBar.addEventListener("input", () => {
    if (audio.duration) {
        const seekTime = (progressBar.value / 100) * audio.duration;
        audio.currentTime = seekTime;
    }
});

// Volume control
volumeSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    audio.volume = val;
    volumeFill.style.width = `${val * 100}%`;
    
    if (val === 0) {
        isMuted = true;
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else {
        isMuted = false;
        muteBtn.innerHTML = val < 0.4 ? '<i class="fa-solid fa-volume-low"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    }
});

// Mute/Unmute Quick Toggle
muteBtn.addEventListener("click", () => {
    if (isMuted) {
        audio.volume = prevVolume;
        volumeSlider.value = prevVolume;
        volumeFill.style.width = `${prevVolume * 100}%`;
        isMuted = false;
        muteBtn.innerHTML = prevVolume < 0.4 ? '<i class="fa-solid fa-volume-low"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    } else {
        prevVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
        volumeFill.style.width = "0%";
        isMuted = true;
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }
});

// Sidebar drawer animations / toggle
playlistToggle.addEventListener("click", () => {
    playlistSidebar.classList.toggle("open");
});

closeSidebar.addEventListener("click", () => {
    playlistSidebar.classList.remove("open");
});

// Close sidebar on pressing outside the player container
document.addEventListener("click", (e) => {
    if (!playlistSidebar.contains(e.target) && !playlistToggle.contains(e.target) && playlistSidebar.classList.contains("open")) {
        playlistSidebar.classList.remove("open");
    }
});

// Search tracks functionality
searchInput.addEventListener("input", (e) => {
    renderPlaylist(e.target.value);
});

// File uploader & drag-and-drop playlist creation
function handleAudioFiles(files) {
    Array.from(files).forEach((file) => {
        if (file.type.startsWith("audio/")) {
            const objectUrl = URL.createObjectURL(file);
            const songName = file.name.replace(/\.[^/.]+$/, ""); // Strip file extension
            
            // Push local uploaded song to library playlist
            const newSong = {
                title: songName,
                artist: "Local Upload",
                src: objectUrl,
                cover: "assets/cover1.png" // Default cover for custom audio files
            };
            
            playlist.push(newSong);
        }
    });
    
    // Rerender and select the latest added custom track
    renderPlaylist();
    loadSong(playlist.length - 1);
    playSong();
    
    // Scroll to the bottom of the playlist to show new song
    trackList.scrollTop = trackList.scrollHeight;
}

fileUpload.addEventListener("change", (e) => {
    handleAudioFiles(e.target.files);
});

// Drag and drop zone actions
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleAudioFiles(e.dataTransfer.files);
    }
});

// Initialize first state
renderPlaylist();
loadSong(0);
