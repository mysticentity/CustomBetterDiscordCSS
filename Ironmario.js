// IronMario Tracker Script for Project64 JavaScript API
// This script tracks attempts, stars, warp mapping, and more by reading emulator memory
// and rendering an on-screen overlay.

const trackerVersion = "1.1.1";
const fontFace = "Lucida Console";
let showSongTitle = false; // Toggle song title display

// File paths
const files = {
    attempts: "usr/attempts.txt",
    attemptData: "usr/attempts_data.csv",
    pbCount: "usr/pb_stars.txt",
    songInfo: "usr/song_info.txt",
    warpLog: "usr/warp_log.json"
};

// Memory addresses
const mem = {
    marioBase: 0x1A0340,
    hudBase: 0x1A0330,
    currentLevelId: 0x18FD78,
    currentSeed: 0x1CDF80,
    delayedWarpOp: 0x1A031C,
    intendedLevelId: 0x19F0CC,
    currentSongId: 0x19485E,
    mario: {
        input: 0x1A0342,
        action: 0x1A034C,
        pos: 0x1A0380,
        hurtCounter: 0x1A03F2
    },
    hud: {
        stars: 0x1A0334,
        health: 0x1A0336
    }
};

// User state
let user = {
    attempts: 0,
    pbStars: 0
};

// Function to read memory
function readMemory() {
    return {
        levelId: RdramRead16(mem.currentLevelId),
        stars: RdramRead16(mem.hud.stars),
        health: RdramRead16(mem.hud.health),
        action: RdramRead32(mem.mario.action),
        input: RdramRead16(mem.mario.input),
        songId: RdramRead16(mem.currentSongId),
        seed: RdramRead32(mem.currentSeed)
    };
}

// Initialize attempt file if missing
function initAttemptDataFile() {
    if (!FileExists(files.attemptData)) {
        WriteFile(files.attemptData, "AttemptNumber,SeedKey,TimeStamp,Stars,TimeTaken,EndLevel,EndCause,StarsCollected\n");
    }
}

// Read user attempt count
function readAttemptsFile() {
    if (FileExists(files.attempts)) {
        let content = ReadFile(files.attempts);
        user.attempts = content ? parseInt(content.trim()) || 0 : 0;
    } else {
        user.attempts = 0;
    }
}

// Read PB stars count
function readPbStarsFile() {
    if (FileExists(files.pbCount)) {
        let content = ReadFile(files.pbCount);
        user.pbStars = content ? parseInt(content.trim()) || 0 : 0;
    } else {
        user.pbStars = 0;
    }
}

// Write attempts to file
function writeAttemptsFile() {
    WriteFile(files.attempts, user.attempts.toString());
}

// Write PB stars to file
function writePbStarsFile() {
    WriteFile(files.pbCount, user.pbStars.toString());
}

// Update overlay display
function updateOverlay() {
    let gameState = readMemory();
    let levelName = getLevelName(gameState.levelId);
    let songName = getSongName(gameState.songId);

    OSDText("IronMario Tracker", 10, 10, fontFace, 0xFFFFFF);
    OSDText(`Level: ${levelName}`, 10, 30, fontFace, 0xFFFFFF);
    OSDText(`Stars: ${gameState.stars}`, 10, 50, fontFace, 0xFFFFFF);
    OSDText(`Health: ${gameState.health}`, 10, 70, fontFace, 0xFFFFFF);
    
    if (showSongTitle) {
        OSDText(`Song: ${songName}`, 10, 90, fontFace, 0xFFFF00);
    }
}

// Get level name by ID
function getLevelName(levelId) {
    const levels = {
        1: "Menu",
        10: "Snowman's Land",
        11: "Wet Dry World",
        12: "Jolly Roger Bay",
        15: "Rainbow Ride",
        30: "Bowser Fight 1",
        36: "Tall Tall Mountain",
        3626007: "Bowser in the Sky"
    };
    return levels[levelId] || "Unknown";
}

// Get song name by ID
function getSongName(songId) {
    const songs = {
        12: "Endless Stairs",
        15: "Bob-omb Battlefield",
        16: "Inside Castle",
        18: "Lethal Lava Land",
        27: "Koopa Road",
        30: "Bowser Battle",
        37: "Wii Shop Channel"
    };
    return songs[songId] || "Unknown";
}

// Run script every frame
function mainLoop() {
    updateOverlay();
    setTimeout(mainLoop, 33); // Approx 30 FPS
}

// Initialization
initAttemptDataFile();
readAttemptsFile();
readPbStarsFile();
mainLoop();
