// --- GAME STATE ---
let state = {
    gold: 0,
    tapPower: 1,
    goldPerSecond: 0,
    pickaxeLevel: 1, // Legacy backup
    pickaxeCost: 10,  // Legacy backup
    minerCount: 0,    // Legacy backup
    minerCost: 50,    // Legacy backup
    totalTaps: 0,
    audioEnabled: true,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    totalXp: 0,
    
    // Prestige properties
    diamonds: 0,
    prestigeCount: 0,
    prestigeMight: 0,
    prestigeOverclock: 0,
    prestigeCritical: 0,
    
    // Core Vein properties
    vein: {
        health: 0,
        maxHealth: 300,
        tier: 1,
        fractures: 0,
        infiniteCycle: 0
    },

    // MMORPG Hero Classes levels
    classes: {
        dwarf: 1, // Dwarf Demolisher (Level 1 start)
        goblin: 0, // Goblin Engineer
        sage: 0    // Crystal Sage
    },

    // Active Skills & Cooldowns state (in seconds)
    skills: {
        cooldowns: {
            demolish: 0,
            overclock: 0,
            focus: 0
        },
        activeSkills: {
            demolish: 0,
            overclock: 0,
            focus: 0,
            ultimate: 0
        }
    },
    
    // Expeditions properties
    expeditions: [
        { id: 'shallow_dig', active: false, endTime: 0, duration: 60 * 1000, requiredMiners: 1, rewardGold: 1000, rewardDiamondChance: 0, rewardArtifactChance: 0, name: 'Мелкая выработка' },
        { id: 'crystal_caves', active: false, endTime: 0, duration: 30 * 60 * 1000, requiredMiners: 3, rewardGold: 10000, rewardDiamondChance: 0.10, rewardArtifactChance: 0, name: 'Кристальные пещеры' },
        { id: 'ancient_core', active: false, endTime: 0, duration: 2 * 60 * 60 * 1000, requiredMiners: 5, rewardGold: 50000, rewardDiamondChance: 0, rewardArtifactChance: 0.25, name: 'Древнее ядро' }
    ],
    
    // Artifacts inventory
    artifacts: {
        ancestral_pickaxe: false,
        miner_provisions: false,
        clover_luck: false
    },
    
    // Achievements status
    achievements: {
        taps_claimed: 0,
        miners_claimed: 0,
        rushes_claimed: 0,
        prestige_claimed: 0
    },
    
    // Statistics
    totalGoldenRushes: 0,
    lastSaveTime: 0
};

// --- BOOST STATE ---
let boost = {
    active: false,
    duration: 30, // 30 seconds boost
    timeRemaining: 0,
    cooldownDuration: 60, // 60 seconds cooldown
    cooldownRemaining: 0,
    multiplier: 3 // Triples the income
};

// Audio Context (initialized on first user interaction)
let audioCtx = null;

// Particle Engine Array
let particles = [];

// Track last touch time to prevent simulated mouse clicks on touch devices
let lastTouchTime = 0;

// Canvas elements
let canvas, ctx;

// --- DOM ELEMENTS ---
const elGoldAmount = document.getElementById('gold-amount');
const elGpsDisplay = document.getElementById('gps-display');
const elBaseGpsDisplay = document.getElementById('base-gps-display');
const elTapPowerDisplay = document.getElementById('tap-power-display');
const elTotalTapsDisplay = document.getElementById('total-taps-display');
const elMinersCountDisplay = document.getElementById('miners-count-display');

// Hero classes buy buttons
const elBuyDwarf = document.getElementById('buy-dwarf');
const elDwarfLvl = document.getElementById('dwarf-lvl');
const elDwarfCost = document.getElementById('dwarf-cost');
const elDwarfBenefitCurr = document.getElementById('dwarf-benefit-curr');
const elDwarfBenefitNext = document.getElementById('dwarf-benefit-next');

const elBuyGoblin = document.getElementById('buy-goblin');
const elGoblinLvl = document.getElementById('goblin-lvl');
const elGoblinCost = document.getElementById('goblin-cost');
const elGoblinBenefitCurr = document.getElementById('goblin-benefit-curr');
const elGoblinBenefitNext = document.getElementById('goblin-benefit-next');

const elBuySage = document.getElementById('buy-sage');
const elSageLvl = document.getElementById('sage-lvl');
const elSageCost = document.getElementById('sage-cost');
const elSageBenefitCurr = document.getElementById('sage-benefit-curr');
const elSageBenefitNext = document.getElementById('sage-benefit-next');

const elMineViewport = document.getElementById('mine-viewport');
const elOreNode = document.getElementById('ore-node');
const elMinerCrewVisual = document.getElementById('miner-crew-visual');

const elBoostBtn = document.getElementById('boost-btn');
const elBoostBanner = document.getElementById('boost-banner');
const elBoostProgress = document.getElementById('boost-progress');
const elBoostTimer = document.getElementById('boost-timer');
const elBoostCooldownText = document.getElementById('boost-cooldown-text');

const elAudioToggle = document.getElementById('audio-toggle');
const elAudioIcon = document.getElementById('audio-icon');
const elResetGameBtn = document.getElementById('reset-game-btn');
const elToastContainer = document.getElementById('toast-container');

// Leveling DOM Elements
const elHudLevelBadge = document.getElementById('hud-level-badge');
const elHudLevelTitle = document.getElementById('hud-level-title');
const elXpBarFill = document.getElementById('xp-bar-fill');
const elXpText = document.getElementById('xp-text');
const elLevelUpModal = document.getElementById('level-up-modal');
const elModalLevelBadge = document.getElementById('modal-level-badge');
const elModalLevelTitle = document.getElementById('modal-level-title');
const elRewardGoldAmount = document.getElementById('reward-gold-amount');
const elModalClaimBtn = document.getElementById('modal-claim-btn');
const elLevelMultDisplay = document.getElementById('level-mult-display');
const elMinerRankDisplay = document.getElementById('miner-rank-display');

// RPG Core Vein elements
const elHealthBarFill = document.getElementById('health-bar-fill');
const elHealthText = document.getElementById('health-bar-text');
const elVeinName = document.getElementById('vein-name');
const elVeinTierText = document.getElementById('vein-tier-text');
const elCritChanceDisplay = document.getElementById('crit-chance-display');
const elFracturesCountDisplay = document.getElementById('fractures-count-display');

// --- DATA: VEIN TIERS CONFIG ---
const VEIN_TIERS = [
    { name: "Медная жила", maxHealth: 300, color: "#cd7f32" },
    { name: "Серебряный пласт", maxHealth: 1500, color: "#c0c0c0" },
    { name: "Золотое месторождение", maxHealth: 6000, color: "#ffd700" },
    { name: "Изумрудное ядро", maxHealth: 25000, color: "#50c878" },
    { name: "Сапфировый нексус", maxHealth: 100000, color: "#0f52ba" },
    { name: "Рубиновый очаг", maxHealth: 400000, color: "#e0115f" },
    { name: "Обсидиановая бездна", maxHealth: 1500000, color: "#3a125c" },
    { name: "Титановый хребет", maxHealth: 6000000, color: "#00f0ff" },
    { name: "Эфирный разлом", maxHealth: 25000000, color: "#d000ff" },
    { name: "Ядро Титана", maxHealth: 100000000, color: "#ff4500" }
];

const ACHIEVEMENTS_DATA = [
    {
        id: 'taps',
        name: 'Рука копателя',
        desc: 'Сделать тапы по жиле',
        tiers: [100, 1000, 10000],
        rewards: [500, 5000, 50000],
        rewardType: 'gold'
    },
    {
        id: 'miners',
        name: 'Команда героев',
        desc: 'Прокачать Гоблина-инженера',
        tiers: [5, 15, 50],
        rewards: [1000, 8000, 100000],
        rewardType: 'gold'
    },
    {
        id: 'rushes',
        name: 'Золотая лихорадка',
        desc: 'Запустить режим лихорадки',
        tiers: [1, 5, 20],
        rewards: [1500, 10000, 75000],
        rewardType: 'gold'
    },
    {
        id: 'prestige',
        name: 'Глубокий бурильщик',
        desc: 'Сделать сброс на Алтаре',
        tiers: [1, 3, 10],
        rewards: [5, 15, 50],
        rewardType: 'diamonds'
    }
];

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    loadGame();
    setupEventListeners();
    updateUI();
    
    // Combat log welcome message
    writeLog("Добро пожаловать в Gold Miner MMORPG! Рубите центральное ядро и прокачивайте героев.", "log-system");
    
    // Start active loops
    setInterval(gameLoop, 100); // 10 FPS for mechanics & logic
    requestAnimationFrame(renderLoop); // 60 FPS for particle canvas
});

// --- CANVAS SETUP ---
function initCanvas() {
    canvas = document.getElementById('particle-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

def_api = null; // mcp target

function resizeCanvas() {
    if (canvas && elMineViewport) {
        canvas.width = elMineViewport.clientWidth;
        canvas.height = elMineViewport.clientHeight;
    }
}

// --- SOUND SYNTHESIZER (WEB AUDIO API) ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Metallic Pickaxe hit clink sound
function playHitSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
}

// Critical Strike Metallic Double Clink
function playCritSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(2200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.06);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2600, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.12);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start(now);
    osc2.start(now + 0.04);
    
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
}

// Heavy Rock Crushing synthesized rumbling explosion
function playFractureSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    
    // Swept lowpass white noise to create rumbling crush
    const bufferSize = audioCtx.sampleRate * 0.8;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.7);
    
    const peakFilter = audioCtx.createBiquadFilter();
    peakFilter.type = 'peaking';
    peakFilter.frequency.setValueAtTime(300, now);
    peakFilter.Q.value = 10;
    peakFilter.gain.setValueAtTime(15, now);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    
    noiseNode.connect(filter);
    filter.connect(peakFilter);
    peakFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + 0.8);
    
    // Low frequency boom oscillator
    const boomOsc = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(120, now);
    boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    
    boomGain.gain.setValueAtTime(0.5, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    boomOsc.connect(boomGain);
    boomGain.connect(audioCtx.destination);
    
    boomOsc.start(now);
    boomOsc.stop(now + 0.6);
}

// Retro Coin bell chime sound
function playCoinSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    
    const osc1 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5 note
    gainNode1.gain.setValueAtTime(0.1, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    
    const osc2 = audioCtx.createOscillator();
    const gainNode2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now); // E6 note
    gainNode2.gain.setValueAtTime(0.1, now + 0.05); 
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);
    
    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.35);
}

// Boost fanfare sound
function playBoostSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)
    
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gainNode.gain.setValueAtTime(0.06, now + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
    });
}

// Level up fanfare sound
function playLevelUpSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        
        gainNode.gain.setValueAtTime(0.08, now + idx * 0.07);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 200;
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.4);
    });
}

// --- PARTICLE SYSTEM ENGINE ---
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = -Math.random() * 8 - 4;
        this.gravity = 0.35;
        this.size = Math.random() * 5 + 3;
        this.color = Math.random() > 0.4 ? '#ffd700' : '#ffa500';
        this.alpha = 1;
        this.life = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.decay;
        this.life -= this.decay;
    }

    draw(cContext) {
        cContext.save();
        cContext.globalAlpha = this.alpha;
        cContext.fillStyle = this.color;
        cContext.beginPath();
        cContext.moveTo(this.x, this.y - this.size);
        cContext.lineTo(this.x + this.size, this.y);
        cContext.lineTo(this.x, this.y + this.size);
        cContext.lineTo(this.x - this.size, this.y);
        cContext.closePath();
        cContext.fill();
        cContext.restore();
    }
}

function spawnSparks(x, y, isCrit = false) {
    const count = isCrit ? 20 : (Math.floor(Math.random() * 5) + 8);
    for (let i = 0; i < count; i++) {
        const p = new Particle(x, y);
        if (isCrit) {
            p.color = Math.random() > 0.3 ? '#e056fd' : '#00f0ff'; // Neon pink/cyan sparks for critical hits!
            p.size *= 1.4;
            p.vx *= 1.3;
            p.vy *= 1.3;
        }
        particles.push(p);
    }
}

// --- RPG STATS CALCULATORS ---

function getMinersOnExpeditions() {
    return state.expeditions.reduce((acc, exp) => exp.active ? acc + exp.requiredMiners : acc, 0);
}

function getIdleMiners() {
    return Math.max(0, state.classes.goblin - getMinersOnExpeditions());
}

function getActiveGps() {
    const activeGoblinMiners = getIdleMiners();
    // Dwarf is click only, Goblin produces base 1 GPS, Sage produces base 5 GPS
    const baseGps = (activeGoblinMiners * 1) + (state.classes.sage * 5);
    
    const levelMult = 1 + (state.level - 1) * 0.1;
    const overclockMult = 1 + state.prestigeOverclock * 1.0; 
    const provisionsMult = state.artifacts.miner_provisions ? 1.15 : 1.0;
    
    let multiplier = levelMult * overclockMult * provisionsMult;
    
    // Active skill overclock triples speed
    if (state.skills.activeSkills.overclock > 0) multiplier *= 3;
    // Ultimate combo multiplies all damage/speed by 5
    if (state.skills.activeSkills.ultimate > 0) multiplier *= 5;
    
    return baseGps * multiplier;
}

function getActiveTapPower() {
    // Dwarf Demolisher levels increase base tap power by +2 per level
    const baseTap = 1 + (state.classes.dwarf - 1) * 2;
    const mightMult = 1 + state.prestigeMight * 0.5;
    const pickaxeMult = state.artifacts.ancestral_pickaxe ? 1.25 : 1.0;
    
    let multiplier = mightMult * pickaxeMult;
    
    // Active skill demolish doubles tap power
    if (state.skills.activeSkills.demolish > 0) multiplier *= 2;
    // Ultimate combo multiplies tap power by 5
    if (state.skills.activeSkills.ultimate > 0) multiplier *= 5;
    
    return baseTap * multiplier;
}

function getCritChance() {
    // Active skill Focus forces 100% crit chance
    if (state.skills.activeSkills.focus > 0) return 1.0;
    
    const base = 0.01; // 1% default base
    const sageBonus = state.classes.sage * 0.01; // +1% per Crystal Sage level
    const cloverBonus = state.artifacts.clover_luck ? 0.05 : 0; // +5% Clover
    
    return base + sageBonus + cloverBonus;
}

function getClassCost(classId) {
    // Goblin Engineer reduces all class cost by 1.5% per level, capped at 50% discount
    const discount = Math.max(0.5, 1 - (state.classes.goblin * 0.015));
    if (classId === 'dwarf') {
        return Math.round(10 * Math.pow(1.6, state.classes.dwarf - 1) * discount);
    } else if (classId === 'goblin') {
        const lvl = Math.max(1, state.classes.goblin);
        return Math.round(50 * Math.pow(1.6, lvl - 1) * discount);
    } else if (classId === 'sage') {
        const lvl = Math.max(1, state.classes.sage);
        return Math.round(250 * Math.pow(1.7, lvl - 1) * discount);
    }
    return 999999999;
}

// --- LIVE COMBAT LOG SYSTEM ---
function writeLog(message, colorClass = "log-system") {
    const elCombatLog = document.getElementById("combat-log");
    if (!elCombatLog) return;
    
    const line = document.createElement("div");
    line.className = `log-line ${colorClass}`;
    
    const time = new Date();
    const timeStr = `[${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}]`;
    
    line.textContent = `${timeStr} ${message}`;
    elCombatLog.appendChild(line);
    
    elCombatLog.scrollTop = elCombatLog.scrollHeight;
    
    while (elCombatLog.children.length > 50) {
        elCombatLog.removeChild(elCombatLog.firstChild);
    }
}

// --- CORE GAME ACTIONS ---

function processTap(x, y) {
    elOreNode.classList.remove('shake');
    void elOreNode.offsetWidth; 
    elOreNode.classList.add('shake');
    
    animatePickaxe(x, y);
    
    const currentMultiplier = boost.active ? boost.multiplier : 1;
    const baseTapPower = getActiveTapPower();
    
    // Critical Strike check
    const critChance = getCritChance();
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? 10 : 1;
    
    const earned = baseTapPower * currentMultiplier * critMult;
    state.gold += earned;
    state.totalTaps++;
    
    // Mine Core damage
    damageVein(earned);
    
    // Sound Synth
    if (isCrit) {
        playCritSound();
        writeLog(`🎯 КРИТ! Нанесено ${Math.floor(earned).toLocaleString()} урона по жиле!`, "log-crit");
    } else {
        playHitSound();
    }
    
    // Floating Text & Sparks
    createFloatingText(x, y, `+${Math.floor(earned)}`, boost.active, isCrit);
    spawnSparks(x, y, isCrit);
    
    updateUI();
    saveGame();
}

function handleMineClick(e) {
    if (Date.now() - lastTouchTime < 600) {
        return;
    }
    
    const rect = elMineViewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    processTap(x, y);
}

function handleMineTouch(e) {
    e.preventDefault();
    lastTouchTime = Date.now();
    
    const rect = elMineViewport.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        processTap(x, y);
    }
}

function animatePickaxe(x, y) {
    const pick = document.createElement('div');
    pick.className = 'pickaxe-tool';
    pick.innerHTML = '<i class="fa-solid fa-hammer"></i>';
    pick.style.left = `${x - 20}px`;
    pick.style.top = `${y - 45}px`;
    
    elMineViewport.appendChild(pick);
    pick.classList.add('swinging');
    
    setTimeout(() => {
        pick.remove();
    }, 150);
}

function createFloatingText(x, y, text, isBoosted, isCrit = false) {
    const span = document.createElement('span');
    span.className = `floating-text ${isBoosted ? 'boosted' : ''} ${isCrit ? 'critical-text' : ''}`;
    span.textContent = isCrit ? `CRIT! ${text}` : text;
    
    const driftX = (Math.random() - 0.5) * 40;
    span.style.left = `${x - 15 + driftX}px`;
    span.style.top = `${y - 30}px`;
    
    elMineViewport.appendChild(span);
    
    span.addEventListener('animationend', () => {
        span.remove();
    });
}

// --- CORE VEIN DAMAGE AND FRACTURING SYSTEM ---

function damageVein(amount) {
    state.vein.health += amount;
    
    // 1. Update visual cracks opacity matching damage percentage
    const pct = state.vein.health / state.vein.maxHealth;
    const cracks = document.getElementById('vein-cracks');
    if (cracks) {
        cracks.style.opacity = Math.min(1.0, pct).toFixed(2);
    }
    
    // 2. Dynamic shaking based on core damage ratio
    const wrapper = document.getElementById('ore-node-wrapper');
    if (wrapper) {
        if (pct >= 0.8) {
            wrapper.style.animation = 'portalHeavyRumble 0.15s infinite';
        } else if (pct >= 0.5) {
            wrapper.style.animation = 'portalHeavyRumble 0.3s infinite';
        } else {
            wrapper.style.animation = 'none';
        }
    }
    
    // 3. Handle Vein splitting on health max
    if (state.vein.health >= state.vein.maxHealth) {
        fractureVein();
    }
}

function romanize(num) {
    const lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function fractureVein() {
    const tierConfig = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)];
    const goldReward = tierConfig.maxHealth * 0.5;
    const xpReward = tierConfig.maxHealth * 0.25;
    
    state.gold += goldReward;
    state.vein.health = 0;
    
    // Count stats
    state.vein.fractures = (state.vein.fractures || 0) + 1;
    
    // Shift Tier
    state.vein.tier++;
    if (state.vein.tier > VEIN_TIERS.length) {
        state.vein.tier = 1;
        state.vein.infiniteCycle = (state.vein.infiniteCycle || 0) + 1;
    }
    
    const nextTierConfig = VEIN_TIERS[state.vein.tier - 1];
    const multiplier = Math.pow(10, state.vein.infiniteCycle || 0);
    state.vein.maxHealth = nextTierConfig.maxHealth * multiplier;
    
    // Audio Sweep
    playFractureSound();
    
    // Transition flash
    const flash = document.getElementById('prestige-flash');
    if (flash) {
        flash.classList.remove('hidden');
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.classList.add('hidden');
            }, 1200);
        }, 200);
    }
    
    const wrapper = document.getElementById('ore-node-wrapper');
    if (wrapper) wrapper.style.animation = 'none';
    
    writeLog(`💥 Жила разрушена! Награда: +${Math.floor(goldReward).toLocaleString()} Золота, +${Math.floor(xpReward).toLocaleString()} XP!`, "log-fracture");
    writeLog(`Обнаружен новый пласт: ${nextTierConfig.name} (${state.vein.maxHealth.toLocaleString()} HP)`, "log-system");
    
    gainXp(xpReward);
    
    saveGame();
    updateUI();
}

// --- ACTIVE SKILLS TIMING AND TRIGGERS ---

function triggerSkill(skillId) {
    if (skillId === 'demolish' && state.classes.dwarf < 1) return;
    if (skillId === 'overclock' && state.classes.goblin < 1) return;
    if (skillId === 'focus' && state.classes.sage < 1) return;
    
    if (state.skills.activeSkills[skillId] > 0 || state.skills.cooldowns[skillId] > 0) return;
    
    if (skillId === 'demolish') {
        state.skills.activeSkills.demolish = 10.0;
        state.skills.cooldowns.demolish = 30.0;
        writeLog("Дварф-подрывник применил 'Взрывные заряды'! (x2 урон клика на 10с)", "log-skill");
    } else if (skillId === 'overclock') {
        state.skills.activeSkills.overclock = 10.0;
        state.skills.cooldowns.overclock = 40.0;
        writeLog("Гоблин-инженер активировал 'Сверхразгон'! (x3 скорость героев на 10с)", "log-skill");
    } else if (skillId === 'focus') {
        state.skills.activeSkills.focus = 8.0;
        state.skills.cooldowns.focus = 45.0;
        writeLog("Кристальный мудрец наложил 'Кристальный фокус'! (100% шанс крита на 8с)", "log-skill");
    }
    
    // Check combo
    checkUltimateCombo();
    
    playBoostSound();
    updateUI();
    saveGame();
}
window.triggerSkill = triggerSkill;

function checkUltimateCombo() {
    // Trigger if all 3 skills are active simultaneously
    if (state.skills.activeSkills.demolish > 0 &&
        state.skills.activeSkills.overclock > 0 &&
        state.skills.activeSkills.focus > 0) {
        
        if ((state.skills.activeSkills.ultimate || 0) <= 0) {
            state.skills.activeSkills.ultimate = 5.0; // 5 seconds combo duration
            writeLog("🌌 КОМБО: АБСОЛЮТНЫЙ БУР АКТИВИРОВАН! (+500% урон/золото на 5с)", "log-ultimate");
            
            // Visual glow rumble
            elMineViewport.classList.add('ultimate-glow-shake');
            playLevelUpSound();
        }
    }
}

// --- LEVELING PROGRESSION LOGIC ---

function gainXp(amount, suppressUI = false) {
    state.xp += amount;
    state.totalXp += amount;
    
    let leveled = false;
    while (state.xp >= state.xpNeeded) {
        levelUp();
        leveled = true;
    }
    
    if (!suppressUI || leveled) {
        updateUI();
    }
}

function levelUp() {
    state.level++;
    state.xp -= state.xpNeeded;
    state.xpNeeded = Math.round(100 * Math.pow(state.level, 1.6));
    
    const rewardGold = state.level * 150;
    state.gold += rewardGold;
    
    playLevelUpSound();
    showLevelUpModal(state.level, getTitleRu(state.level), rewardGold);
    writeLog(`🎉 Уровень повышен! Достигнут уровень ${state.level}!`, "log-system");
}

function getTitleRu(level) {
    if (level < 5) return "Новичок-копатель";
    if (level < 10) return "Мастер кирки";
    if (level < 15) return "Старатель";
    if (level < 20) return "Смотритель шахты";
    if (level < 30) return "Золотой магнат";
    return "Король подземелий";
}

function showLevelUpModal(lvl, title, rewardGold) {
    elModalLevelBadge.textContent = `LEVEL ${lvl}`;
    elModalLevelTitle.textContent = `New Title: ${title}`;
    elRewardGoldAmount.textContent = rewardGold;
    elLevelUpModal.classList.remove('hidden');
}

function hideLevelUpModal() {
    elLevelUpModal.classList.add('hidden');
    playCoinSound();
}

// --- EXPEDITIONS SYSTEM LOGIC ---

function startExpedition(id) {
    const exp = state.expeditions.find(e => e.id === id);
    if (!exp || exp.active) return;
    
    const idle = getIdleMiners();
    if (idle < exp.requiredMiners) {
        showToast("Недостаточно свободных шахтеров!", true);
        return;
    }
    
    exp.active = true;
    
    // Scale expedition durations using Crystal Sage speed passive: -2% time per level
    const speedReduction = Math.max(0.5, 1 - (state.classes.sage * 0.02)); // caps at 50% speedup
    const actualDuration = exp.duration * speedReduction;
    
    exp.endTime = Date.now() + actualDuration;
    
    writeLog(`⚔️ Отряд отправлен в подземелье: "${exp.name}"!`, "log-system");
    updateUI();
    saveGame();
}
window.startExpedition = startExpedition;

function claimExpedition(id) {
    const exp = state.expeditions.find(e => e.id === id);
    if (!exp || !exp.active || Date.now() < exp.endTime) return;
    
    state.gold += exp.rewardGold;
    let resultsMsg = `Собрано: +${exp.rewardGold.toLocaleString()} Золота`;
    let logMsg = `Рейд "${exp.name}" завершен! Получено: +${exp.rewardGold.toLocaleString()} Золота`;
    
    // Diamond roll
    if (exp.rewardDiamondChance > 0 && Math.random() < exp.rewardDiamondChance) {
        state.diamonds += 1;
        resultsMsg += `, +1 Древний Алмаз`;
        logMsg += `, +1 Алмаз`;
    }
    
    // Artifact roll
    if (exp.rewardArtifactChance > 0 && Math.random() < exp.rewardArtifactChance) {
        const unowned = Object.keys(state.artifacts).filter(k => !state.artifacts[k]);
        if (unowned.length > 0) {
            const choice = unowned[Math.floor(Math.random() * unowned.length)];
            state.artifacts[choice] = true;
            
            let artName = '';
            if (choice === 'ancestral_pickaxe') artName = 'Кирка предков';
            else if (choice === 'miner_provisions') artName = 'Сухпаек рудокопа';
            else if (choice === 'clover_luck') artName = 'Клевер удачи';
            
            resultsMsg += `. Найдена реликвия: "${artName}"!`;
            logMsg += `. Найдена древняя реликвия: "${artName}"!`;
        }
    }
    
    exp.active = false;
    
    playBoostSound();
    showToast(resultsMsg);
    writeLog(logMsg, "log-ultimate");
    updateUI();
    saveGame();
}
window.claimExpedition = claimExpedition;

// --- PRESTIGE SYSTEM LOGIC ---

function doPrestige() {
    if (state.level < 20) return;
    if (!confirm("Вы уверены, что хотите запустить глубокое бурение? Все ваше текущее золото, уровни и герои будут сброшены, но вы получите Древние Алмазы!")) return;
    
    const claimable = (state.level - 19) * 2;
    
    // Save safety 1
    saveGame();
    
    // Apply reset
    state.diamonds += claimable;
    state.prestigeCount++;
    
    state.gold = 0;
    state.tapPower = 1;
    state.goldPerSecond = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 100;
    state.totalXp = 0;
    
    state.classes.dwarf = 1;
    state.classes.goblin = 0;
    state.classes.sage = 0;
    
    state.vein.health = 0;
    state.vein.tier = 1;
    state.vein.infiniteCycle = 0;
    const nextTierConfig = VEIN_TIERS[0];
    state.vein.maxHealth = nextTierConfig.maxHealth;
    
    state.expeditions.forEach(exp => {
        exp.active = false;
        exp.endTime = 0;
    });
    
    // Save safety 2
    saveGame();
    
    playBoostSound();
    
    elMineViewport.classList.add('prestige-shake');
    setTimeout(() => {
        elMineViewport.classList.remove('prestige-shake');
    }, 1000);
    
    const flash = document.getElementById('prestige-flash');
    if (flash) {
        flash.classList.remove('hidden');
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.classList.add('hidden');
            }, 1200);
        }, 300);
    }
    
    writeLog(`🌌 Сброс совершен! Запущено глубокое бурение! Получено +${claimable} Алмазов!`, "log-ultimate");
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === 'mineshaft') {
            btn.click();
        }
    });
    
    updateUI();
}

function buyAltarMight() {
    const cost = (state.prestigeMight + 1) * 2;
    if (state.diamonds >= cost) {
        state.diamonds -= cost;
        state.prestigeMight++;
        playCoinSound();
        writeLog(`Алтарь: разблокировано благословение Древней мощи Lvl ${state.prestigeMight}!`, "log-ultimate");
        updateUI();
        saveGame();
    }
}

function buyAltarOverclock() {
    const cost = (state.prestigeOverclock + 1) * 4;
    if (state.diamonds >= cost) {
        state.diamonds -= cost;
        state.prestigeOverclock++;
        playCoinSound();
        writeLog(`Алтарь: разблокировано благословение Разгона ядра Lvl ${state.prestigeOverclock}!`, "log-ultimate");
        updateUI();
        saveGame();
    }
}

function buyAltarCritical() {
    const cost = (state.prestigeCritical + 1) * 3;
    if (state.diamonds >= cost) {
        state.diamonds -= cost;
        state.prestigeCritical++;
        playCoinSound();
        writeLog(`Алтарь: разблокировано благословение Критических ударов Lvl ${state.prestigeCritical}!`, "log-ultimate");
        updateUI();
        saveGame();
    }
}

// --- GUILD CLASSES BUY MODULE ---

function buyClassUpgrade(classId) {
    const cost = getClassCost(classId);
    if (state.gold >= cost) {
        state.gold -= cost;
        if (classId === 'dwarf') {
            state.classes.dwarf++;
            state.tapPower = 1 + (state.classes.dwarf - 1) * 2;
            playCoinSound();
            writeLog(`Дварф-подрывник повышен до уровня ${state.classes.dwarf}!`, "log-system");
        } else if (classId === 'goblin') {
            state.classes.goblin++;
            playCoinSound();
            writeLog(`Гоблин-инженер нанят/повышен до уровня ${state.classes.goblin}!`, "log-system");
        } else if (classId === 'sage') {
            state.classes.sage++;
            playCoinSound();
            writeLog(`Кристальный мудрец нанят/повышен до уровня ${state.classes.sage}!`, "log-system");
        }
        updateUI();
        saveGame();
    } else {
        showToast("Недостаточно золота!", true);
    }
}
window.buyClassUpgrade = buyClassUpgrade;

// --- ADS BOOST MODULE ---

function activateBoost() {
    if (boost.active || boost.cooldownRemaining > 0) return;
    
    boost.active = true;
    boost.timeRemaining = boost.duration;
    state.totalGoldenRushes = (state.totalGoldenRushes || 0) + 1;
    
    playBoostSound();
    writeLog("⚡ Активирован режим Золотой лихорадки! (x3 урон/добыча на 30с)", "log-fracture");
    
    elBoostBanner.classList.add('active');
    elBoostBtn.disabled = true;
    
    updateUI();
}

function showToast(message, isWarning = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isWarning) {
        toast.style.background = 'rgba(255, 59, 48, 0.95)';
        toast.style.borderColor = 'rgba(255, 59, 48, 0.5)';
    } else {
        toast.style.background = 'rgba(0, 240, 255, 0.85)';
        toast.style.borderColor = 'rgba(0, 240, 255, 0.5)';
    }
    toast.textContent = message;
    elToastContainer.appendChild(toast);
    
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// --- GAME LOOPS ---

function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        } else {
            p.draw(ctx);
        }
    }
    
    requestAnimationFrame(renderLoop);
}

function gameLoop() {
    // 1. Accumulate Passive Income (DPS Damage directly applied to Core Vein)
    const activeGps = getActiveGps();
    if (activeGps > 0) {
        const currentMultiplier = boost.active ? boost.multiplier : 1;
        const passiveEarned = (activeGps * currentMultiplier) / 10;
        
        state.gold += passiveEarned;
        
        // Damage core vein passively
        damageVein(passiveEarned);
        
        // Accumulate passive XP
        gainXp(passiveEarned, true);
        
        const activeMiners = getIdleMiners();
        if (Math.random() < 0.05 * activeMiners) {
            const rx = Math.random() * (canvas.width - 100) + 50;
            const ry = Math.random() * (canvas.height - 100) + 50;
            spawnSparks(rx, ry);
        }
    }
    
    // 2. Handle Boost timer
    if (boost.active) {
        boost.timeRemaining -= 0.1;
        if (boost.timeRemaining <= 0) {
            boost.active = false;
            boost.cooldownRemaining = boost.cooldownDuration;
            elBoostBanner.classList.remove('active');
            writeLog("Режим Золотой лихорадки завершен.", "log-system");
        }
    } else if (boost.cooldownRemaining > 0) {
        boost.cooldownRemaining -= 0.1;
        if (boost.cooldownRemaining <= 0) {
            boost.cooldownRemaining = 0;
            elBoostBtn.disabled = false;
        }
    }
    
    // 3. Tick active skill durations and cooldown timers
    tickSkills();
    
    // 4. Tick active expeditions
    updateExpeditionTimers();
    
    // 5. Update HUD numbers
    updateUINumbersOnly();
}

function tickSkills() {
    const skills = ['demolish', 'overclock', 'focus'];
    skills.forEach(s => {
        // Cooldown ticks
        if (state.skills.cooldowns[s] > 0) {
            state.skills.cooldowns[s] = Math.max(0, state.skills.cooldowns[s] - 0.1);
        }
        // Active buff duration ticks
        if (state.skills.activeSkills[s] > 0) {
            state.skills.activeSkills[s] = Math.max(0, state.skills.activeSkills[s] - 0.1);
            if (state.skills.activeSkills[s] <= 0) {
                writeLog(`Эффект умения '${s === 'demolish' ? 'Demolish' : (s === 'overclock' ? 'Overclock' : 'Focus')}' закончился.`, "log-system");
            }
        }
    });
    
    // Ultimate combo duration tick
    if ((state.skills.activeSkills.ultimate || 0) > 0) {
        state.skills.activeSkills.ultimate = Math.max(0, state.skills.activeSkills.ultimate - 0.1);
        if (state.skills.activeSkills.ultimate <= 0) {
            elMineViewport.classList.remove('ultimate-glow-shake');
            writeLog("Эффект комбо 'Абсолютный бур' закончился.", "log-system");
        }
    }
    
    // Repaint Skill Buttons
    updateSkillsUI();
}

function updateSkillsUI() {
    const skills = ['demolish', 'overclock', 'focus'];
    skills.forEach(s => {
        const btn = document.getElementById(`skill-${s}`);
        const cdText = document.getElementById(`cd-${s}`);
        const overlay = document.getElementById(`overlay-${s}`);
        
        if (!btn || !cdText || !overlay) return;
        
        let lvl = 0;
        if (s === 'demolish') lvl = state.classes.dwarf;
        else if (s === 'overclock') lvl = state.classes.goblin;
        else if (s === 'focus') lvl = state.classes.sage;
        
        if (lvl < 1) {
            btn.disabled = true;
            cdText.textContent = "LOCKED";
            overlay.style.height = "100%";
            btn.classList.remove('active-buff');
            return;
        }
        
        const activeDur = state.skills.activeSkills[s] || 0;
        const cd = state.skills.cooldowns[s] || 0;
        
        if (activeDur > 0) {
            btn.disabled = true;
            cdText.textContent = `BUFF: ${activeDur.toFixed(1)}s`;
            overlay.style.height = "0%";
            btn.classList.add('active-buff');
        } else if (cd > 0) {
            btn.disabled = true;
            cdText.textContent = `CD: ${cd.toFixed(1)}s`;
            const maxCD = s === 'demolish' ? 30.0 : (s === 'overclock' ? 40.0 : 45.0);
            overlay.style.height = `${(cd / maxCD) * 100}%`;
            btn.classList.remove('active-buff');
        } else {
            btn.disabled = false;
            cdText.textContent = "READY";
            overlay.style.height = "0%";
            btn.classList.remove('active-buff');
        }
    });
}

function updateExpeditionTimers() {
    state.expeditions.forEach(exp => {
        if (exp.active) {
            const remaining = exp.endTime - Date.now();
            const cardBtn = document.querySelector(`[onclick="claimExpedition('${exp.id}')"]`) || document.querySelector(`[onclick="startExpedition('${exp.id}')"]`);
            const cardTimerText = cardBtn ? cardBtn.closest('.expeditions-card').querySelector('.expedition-time-text') : null;
            const cardBarFill = cardBtn ? cardBtn.closest('.expeditions-card').querySelector('.expedition-progress-bar-fill') : null;
            
            if (remaining <= 0) {
                updateExpeditionsUI();
            } else {
                if (cardTimerText) {
                    const hours = Math.floor(remaining / 3600000);
                    const mins = Math.floor((remaining % 3600000) / 60000);
                    const secs = Math.floor((remaining % 60000) / 1000);
                    cardTimerText.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
                if (cardBarFill) {
                    // Cache duration reduction in mind
                    const speedReduction = Math.max(0.5, 1 - (state.classes.sage * 0.02));
                    const actualDur = exp.duration * speedReduction;
                    const pct = ((actualDur - remaining) / actualDur) * 100;
                    cardBarFill.style.width = `${pct}%`;
                }
            }
        }
    });
}

// --- UI SYNC SYSTEMS ---

function updateUI() {
    updateUINumbersOnly();
    
    // Core Vein details
    const tierConfig = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)];
    const healthMultiplier = Math.pow(10, state.vein.infiniteCycle || 0);
    const calculatedMaxHealth = tierConfig.maxHealth * healthMultiplier;
    
    state.vein.maxHealth = calculatedMaxHealth;
    elVeinName.textContent = tierConfig.name;
    elVeinTierText.textContent = `Tier ${romanize(state.vein.tier)}`;
    
    // Rotate central vein color hue dynamically based on tier (Cycles nicely!)
    const hueRotate = (state.vein.tier - 1) * 36;
    elOreNode.style.filter = `hue-rotate(${hueRotate}deg)`;
    
    // Dwarf upgrade description
    const dwarfCostVal = getClassCost('dwarf');
    elDwarfLvl.textContent = `Lvl ${state.classes.dwarf}`;
    elDwarfCost.textContent = dwarfCostVal.toLocaleString();
    elDwarfBenefitCurr.textContent = `+${1 + (state.classes.dwarf - 1) * 2}/tap`;
    elDwarfBenefitNext.textContent = `+${1 + state.classes.dwarf * 2}/tap`;
    
    // Goblin upgrade description
    const goblinCostVal = getClassCost('goblin');
    elGoblinLvl.textContent = `${state.classes.goblin} Hired`;
    elGoblinCost.textContent = goblinCostVal.toLocaleString();
    elGoblinBenefitCurr.textContent = `+${state.classes.goblin}/s`;
    elGoblinBenefitNext.textContent = `+${state.classes.goblin + 1}/s`;
    
    // Sage upgrade description
    const sageCostVal = getClassCost('sage');
    elSageLvl.textContent = `${state.classes.sage} Hired`;
    elSageCost.textContent = sageCostVal.toLocaleString();
    elSageBenefitCurr.textContent = `+${state.classes.sage * 5}/s`;
    elSageBenefitNext.textContent = `+${(state.classes.sage + 1) * 5}/s`;
    
    // Level Badge & Title
    elHudLevelBadge.textContent = `Lvl ${state.level}`;
    elHudLevelTitle.textContent = getTitleRu(state.level);
    
    // Redraw miners visuals block
    elMinerCrewVisual.innerHTML = '';
    const activeMiners = getIdleMiners();
    for (let i = 0; i < activeMiners; i++) {
        spawnMinerVisual();
    }
    
    // Re-render subpanels
    updateAchievements();
    updateExpeditionsUI();
    updateArtifactsUI();
    checkPrestigeStatus();
}

function updateUINumbersOnly() {
    // Current Gold
    elGoldAmount.textContent = Math.floor(state.gold).toLocaleString();
    
    // Current Vein Health values
    const pct = (state.vein.health / state.vein.maxHealth) * 100;
    elHealthBarFill.style.width = `${Math.min(100, pct)}%`;
    elHealthText.textContent = `${Math.floor(state.vein.health).toLocaleString()} / ${state.vein.maxHealth.toLocaleString()} HP (${Math.floor(pct)}%)`;
    
    // Core Cracks opacity sync
    const cracks = document.getElementById('vein-cracks');
    if (cracks) {
        cracks.style.opacity = Math.min(1.0, state.vein.health / state.vein.maxHealth).toFixed(2);
    }
    
    // Stats Dashboard update
    const currentMultiplier = boost.active ? boost.multiplier : 1;
    const activeGps = getActiveGps() * currentMultiplier;
    elGpsDisplay.textContent = `+${Math.floor(activeGps).toLocaleString()} /s`;
    elBaseGpsDisplay.textContent = `${Math.floor(getActiveGps()).toLocaleString()} /s`;
    elTapPowerDisplay.textContent = Math.floor(getActiveTapPower() * currentMultiplier).toLocaleString();
    
    // Stats dashboard items
    const levelMult = 1 + (state.level - 1) * 0.1;
    elLevelMultDisplay.textContent = `${levelMult.toFixed(1)}x`;
    elMinerRankDisplay.textContent = getTitleRu(state.level);
    elTotalTapsDisplay.textContent = state.totalTaps.toLocaleString();
    elMinersCountDisplay.textContent = `${getIdleMiners()} / ${state.classes.goblin}`;
    elCritChanceDisplay.textContent = `${Math.round(getCritChance() * 100)}%`;
    elFracturesCountDisplay.textContent = state.vein.fractures.toLocaleString();
    
    // Disabled/Enabled upgrade purchase status
    elBuyDwarf.disabled = (state.gold < getClassCost('dwarf'));
    elBuyGoblin.disabled = (state.gold < getClassCost('goblin'));
    elBuySage.disabled = (state.gold < getClassCost('sage'));
    
    // XP Bar updates
    const xpPct = (state.xp / state.xpNeeded) * 100;
    elXpBarFill.style.width = `${Math.min(100, xpPct)}%`;
    elXpText.textContent = `XP: ${Math.floor(state.xp)} / ${state.xpNeeded}`;
    
    // Active Boost bar updates
    if (boost.active) {
        const bpct = (boost.timeRemaining / boost.duration) * 100;
        elBoostProgress.style.transform = `scaleX(${bpct / 100})`;
        elBoostTimer.textContent = `${Math.ceil(boost.timeRemaining)}s`;
    }
    
    // Boost Button cooling indicator
    if (boost.cooldownRemaining > 0) {
        elBoostCooldownText.classList.remove('hidden');
        elBoostCooldownText.textContent = `CD: ${Math.ceil(boost.cooldownRemaining)}s`;
        elBoostBtn.disabled = true;
    } else if (!boost.active) {
        elBoostCooldownText.classList.add('hidden');
        elBoostBtn.disabled = false;
    }
}

// --- RENDER HEAVY SYSTEM INTERFACES ---

function updateAchievements() {
    const listContainer = document.getElementById('achievements-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    ACHIEVEMENTS_DATA.forEach(ach => {
        const claimed = state.achievements[ach.id + '_claimed'] || 0;
        const nextTierIndex = Math.min(ach.tiers.length - 1, claimed);
        const targetVal = ach.tiers[nextTierIndex];
        
        let curVal = 0;
        if (ach.id === 'taps') curVal = state.totalTaps;
        else if (ach.id === 'miners') curVal = state.classes.goblin;
        else if (ach.id === 'rushes') curVal = state.totalGoldenRushes || 0;
        else if (ach.id === 'prestige') curVal = state.prestigeCount;
        
        const isCompleted = curVal >= targetVal;
        const allClaimed = claimed >= ach.tiers.length;
        const pct = allClaimed ? 100 : Math.min(100, (curVal / targetVal) * 100);
        
        const card = document.createElement('div');
        card.className = `achievement-card ${isCompleted && !allClaimed ? 'completed' : ''} ${allClaimed ? 'claimed' : ''}`;
        
        let iconClass = 'fa-lock';
        if (allClaimed) iconClass = 'fa-check';
        else if (isCompleted) iconClass = 'fa-gift';
        else if (ach.id === 'taps') iconClass = 'fa-hand-pointer';
        else if (ach.id === 'miners') iconClass = 'fa-users-gear';
        else if (ach.id === 'rushes') iconClass = 'fa-bolt';
        else if (ach.id === 'prestige') iconClass = 'fa-dharmachakra';
        
        let rewardLabel = '';
        if (!allClaimed) {
            const rewardVal = ach.rewards[nextTierIndex];
            rewardLabel = ach.rewardType === 'gold' 
                ? `<i class="fa-solid fa-coins"></i> ${rewardVal.toLocaleString()}`
                : `<i class="fa-solid fa-gem"></i> ${rewardVal}`;
        } else {
            rewardLabel = 'CLAIMED';
        }
        
        card.innerHTML = `
            <div class="achievement-icon-box">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="achievement-details">
                <div class="achievement-title-row">
                    <span class="achievement-name">${ach.name}</span>
                    <span class="achievement-tier">${allClaimed ? 'MAX' : 'Tier ' + (claimed + 1)}</span>
                </div>
                <p class="achievement-desc">${ach.desc} (${allClaimed ? 'Выполнено' : targetVal.toLocaleString()})</p>
                <div class="achievement-progress-container">
                    <div class="achievement-progress-track"></div>
                    <div class="achievement-progress-bar" style="width: ${pct}%"></div>
                    <span class="achievement-progress-text">${allClaimed ? '100%' : curVal.toLocaleString() + ' / ' + targetVal.toLocaleString()}</span>
                </div>
            </div>
            <button class="achievement-claim-btn" ${(!isCompleted || allClaimed) ? 'disabled' : ''} onclick="claimAchievement('${ach.id}')">
                ${allClaimed ? 'Done' : rewardLabel}
            </button>
        `;
        
        listContainer.appendChild(card);
    });
}

function updateExpeditionsUI() {
    const listContainer = document.getElementById('expeditions-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const idle = getIdleMiners();
    const speedReduction = Math.max(0.5, 1 - (state.classes.sage * 0.02));
    
    state.expeditions.forEach(exp => {
        const card = document.createElement('div');
        card.className = 'expeditions-card';
        
        let timeText = '';
        let progressPct = 0;
        let isDone = false;
        
        const actualDuration = exp.duration * speedReduction;
        
        if (exp.active) {
            const remaining = exp.endTime - Date.now();
            if (remaining <= 0) {
                timeText = 'Завершена!';
                progressPct = 100;
                isDone = true;
            } else {
                const hours = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timeText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                progressPct = ((actualDuration - remaining) / actualDuration) * 100;
            }
        } else {
            const hours = Math.floor(actualDuration / 3600000);
            const mins = Math.floor((actualDuration % 3600000) / 60000);
            timeText = hours > 0 ? `${hours}ч ${mins}м` : `${mins} мин`;
            if (speedReduction < 1.0) {
                timeText += ` (${Math.round((1 - speedReduction) * 100)}% Быстрее)`;
            }
        }
        
        let buttonHtml = '';
        if (!exp.active) {
            buttonHtml = `<button class="expedition-action-btn" ${idle < exp.requiredMiners ? 'disabled' : ''} onclick="startExpedition('${exp.id}')">
                Начать рейд
            </button>`;
        } else if (isDone) {
            buttonHtml = `<button class="expedition-action-btn collectable" onclick="claimExpedition('${exp.id}')">
                Собрать
            </button>`;
        } else {
            buttonHtml = `<button class="expedition-action-btn" disabled>
                В рейде
            </button>`;
        }
        
        card.innerHTML = `
            <div class="expedition-header">
                <div class="expedition-title-block">
                    <span class="expedition-name">${exp.name}</span>
                    <span class="expedition-reqs">Требуется: <strong>${exp.requiredMiners}</strong> инжен.</span>
                </div>
                <span class="expedition-rewards-badge">Награда</span>
            </div>
            <div class="expedition-footer">
                <div class="expedition-timer-block">
                    <div class="expedition-progress-bar-bg">
                        <div class="expedition-progress-bar-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <span class="expedition-time-text">${timeText}</span>
                </div>
                ${buttonHtml}
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

function updateArtifactsUI() {
    const grid = document.getElementById('artifacts-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const ART_INFO = [
        { key: 'ancestral_pickaxe', name: 'Кирка предков', effect: '+25% к силе тапа', icon: 'fa-hammer' },
        { key: 'miner_provisions', name: 'Сухпаек', effect: '+15% к авто-шахтерам', icon: 'fa-utensils' },
        { key: 'clover_luck', name: 'Клевер удачи', effect: '+5% шанс крита', icon: 'fa-clover' }
    ];
    
    ART_INFO.forEach(art => {
        const owned = state.artifacts[art.key];
        const card = document.createElement('div');
        card.className = `artifact-card ${owned ? 'active' : ''}`;
        card.innerHTML = `
            <div class="artifact-icon"><i class="fa-solid ${art.icon}"></i></div>
            <span class="artifact-name">${art.name}</span>
            <span class="artifact-effect">${owned ? art.effect : 'Не найден'}</span>
        `;
        grid.appendChild(card);
    });
}

// --- PERSISTENCE ---

function saveGame() {
    state.lastSaveTime = Date.now();
    localStorage.setItem('gold_miner_clicker_save', JSON.stringify(state));
}

def_api = null; // mcp target

function loadGame() {
    try {
        const saved = localStorage.getItem('gold_miner_clicker_save');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Merge properties
            state = { ...state, ...parsed };
            
            // Safe restore nested objects
            if (parsed.artifacts) state.artifacts = { ...state.artifacts, ...parsed.artifacts };
            if (parsed.achievements) state.achievements = { ...state.achievements, ...parsed.achievements };
            if (parsed.vein) state.vein = { ...state.vein, ...parsed.vein };
            if (parsed.classes) state.classes = { ...state.classes, ...parsed.classes };
            
            // Handle backwards compatible migrations from old save schema
            state.classes.dwarf = state.classes.dwarf || state.pickaxeLevel || 1;
            state.classes.goblin = state.classes.goblin || state.minerCount || 0;
            state.classes.sage = state.classes.sage || 0;
            
            // Sync tap power directly from dwarf levels
            state.tapPower = 1 + (state.classes.dwarf - 1) * 2;
            
            if (parsed.expeditions) {
                parsed.expeditions.forEach(pExp => {
                    const target = state.expeditions.find(e => e.id === pExp.id);
                    if (target) {
                        target.active = pExp.active;
                        target.endTime = pExp.endTime;
                    }
                });
            }
            
            // Calculate Offline Progression
            const elapsed = Date.now() - (state.lastSaveTime || Date.now());
            if (elapsed > 2000) {
                const maxOffline = 12 * 60 * 60 * 1000;
                const actualOffline = Math.min(elapsed, maxOffline);
                const offlineGps = getActiveGps();
                const offlineEarned = offlineGps * (actualOffline / 1000);
                
                if (offlineEarned > 1) {
                    state.gold += offlineEarned;
                    damageVein(offlineEarned); // Passive offline damage to Core Vein!
                    gainXp(offlineEarned, true);
                    
                    setTimeout(() => {
                        showToast(`Оффлайн-доход: +${Math.floor(offlineEarned).toLocaleString()} Золота!`);
                        writeLog(`💤 За время вашего отсутствия добыто +${Math.floor(offlineEarned).toLocaleString()} Золота и нанесено столько же урона по жиле!`, "log-system");
                    }, 1000);
                }
            }
            
            syncAudioIcon();
        }
    } catch (e) {
        console.error("Failed to load saved state", e);
    }
}

function resetGame() {
    if (confirm("Вы действительно хотите полностью сбросить прогресс? Все ваши классы, золото, алмазы и достижения будут безвозвратно удалены!")) {
        localStorage.removeItem('gold_miner_clicker_save');
        state = {
            gold: 0,
            tapPower: 1,
            goldPerSecond: 0,
            pickaxeLevel: 1,
            pickaxeCost: 10,
            minerCount: 0,
            minerCost: 50,
            totalTaps: 0,
            audioEnabled: true,
            level: 1,
            xp: 0,
            xpNeeded: 100,
            totalXp: 0,
            diamonds: 0,
            prestigeCount: 0,
            prestigeMight: 0,
            prestigeOverclock: 0,
            prestigeCritical: 0,
            vein: {
                health: 0,
                maxHealth: 300,
                tier: 1,
                fractures: 0,
                infiniteCycle: 0
            },
            classes: {
                dwarf: 1,
                goblin: 0,
                sage: 0
            },
            skills: {
                cooldowns: {
                    demolish: 0,
                    overclock: 0,
                    focus: 0
                },
                activeSkills: {
                    demolish: 0,
                    overclock: 0,
                    focus: 0,
                    ultimate: 0
                }
            },
            expeditions: [
                { id: 'shallow_dig', active: false, endTime: 0, duration: 60 * 1000, requiredMiners: 1, rewardGold: 1000, rewardDiamondChance: 0, rewardArtifactChance: 0, name: 'Мелкая выработка' },
                { id: 'crystal_caves', active: false, endTime: 0, duration: 30 * 60 * 1000, requiredMiners: 3, rewardGold: 10000, rewardDiamondChance: 0.10, rewardArtifactChance: 0, name: 'Кристальные пещеры' },
                { id: 'ancient_core', active: false, endTime: 0, duration: 2 * 60 * 60 * 1000, requiredMiners: 5, rewardGold: 50000, rewardDiamondChance: 0, rewardArtifactChance: 0.25, name: 'Древнее ядро' }
            ],
            artifacts: {
                ancestral_pickaxe: false,
                miner_provisions: false,
                clover_luck: false
            },
            achievements: {
                taps_claimed: 0,
                miners_claimed: 0,
                rushes_claimed: 0,
                prestige_claimed: 0
            },
            totalGoldenRushes: 0,
            lastSaveTime: 0
        };
        
        boost.active = false;
        boost.timeRemaining = 0;
        boost.cooldownRemaining = 0;
        elBoostBanner.classList.remove('active');
        elMinerCrewVisual.innerHTML = '';
        elMineViewport.classList.remove('ultimate-glow-shake');
        
        // Clear log
        const elCombatLog = document.getElementById("combat-log");
        if (elCombatLog) elCombatLog.innerHTML = "";
        writeLog("Прогресс сброшен. Начните свое приключение сначала!", "log-system");
        
        // Reset tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === 'mineshaft') {
                btn.click();
            }
        });
        
        updateUI();
        showToast("Прогресс сброшен!");
    }
}

function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    syncAudioIcon();
    saveGame();
}

function syncAudioIcon() {
    if (state.audioEnabled) {
        elAudioIcon.className = 'fa-solid fa-volume-high';
        elAudioToggle.title = 'Mute Sounds';
    } else {
        elAudioIcon.className = 'fa-solid fa-volume-xmark';
        elAudioToggle.title = 'Unmute Sounds';
    }
}

// --- TABS CONTROLLERS ---

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const content = document.getElementById(`tab-${targetTab}`);
            if (content) {
                content.classList.add('active');
            }
            
            playCoinSound();
        });
    });
}

// --- SETUP EVENT LISTENERS ---
function setupEventListeners() {
    elMineViewport.addEventListener('touchstart', handleMineTouch, { passive: false });
    elMineViewport.addEventListener('click', handleMineClick);
    elBoostBtn.addEventListener('click', activateBoost);
    elAudioToggle.addEventListener('click', toggleAudio);
    elResetGameBtn.addEventListener('click', resetGame);
    elModalClaimBtn.addEventListener('click', hideLevelUpModal);
    
    // Guild Hero Upgrades buy listeners
    elBuyDwarf.addEventListener('click', () => buyClassUpgrade('dwarf'));
    elBuyGoblin.addEventListener('click', () => buyClassUpgrade('goblin'));
    elBuySage.addEventListener('click', () => buyClassUpgrade('sage'));
    
    // Altar upgrades buy listeners
    document.getElementById('prestige-trigger-btn').addEventListener('click', doPrestige);
    document.getElementById('buy-altar-might').addEventListener('click', buyAltarMight);
    document.getElementById('buy-altar-overclock').addEventListener('click', buyAltarOverclock);
    document.getElementById('buy-altar-critical').addEventListener('click', buyAltarCritical);
    
    // Hotbar Skills buttons click listeners
    document.getElementById('skill-demolish').addEventListener('click', () => triggerSkill('demolish'));
    document.getElementById('skill-overclock').addEventListener('click', () => triggerSkill('overclock'));
    document.getElementById('skill-focus').addEventListener('click', () => triggerSkill('focus'));
    
    // Q, W, E Keyboard hotkeys
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'q') triggerSkill('demolish');
        else if (key === 'w') triggerSkill('overclock');
        else if (key === 'e') triggerSkill('focus');
    });
    
    setupTabs();
}

function spawnMinerVisual() {
    const minerEl = document.createElement('div');
    minerEl.className = 'miner-visual';
    const rx = Math.random() * 80 + 10;
    const ry = Math.random() * 60 + 20;
    minerEl.style.left = rx + '%';
    minerEl.style.top = ry + '%';
    minerEl.innerHTML = '<i class="fa-solid fa-person-digging"></i>';
    elMinerCrewVisual.appendChild(minerEl);
}

function claimAchievement(id) {
    const ach = ACHIEVEMENTS_DATA.find(a => a.id === id);
    if (!ach) return;
    
    const claimedKey = id + '_claimed';
    const claimed = state.achievements[claimedKey] || 0;
    if (claimed >= ach.tiers.length) return;
    
    const targetVal = ach.tiers[claimed];
    let curVal = 0;
    if (id === 'taps') curVal = state.totalTaps;
    else if (id === 'miners') curVal = state.classes.goblin;
    else if (id === 'rushes') curVal = state.totalGoldenRushes || 0;
    else if (id === 'prestige') curVal = state.prestigeCount;
    
    if (curVal >= targetVal) {
        const rewardVal = ach.rewards[claimed];
        if (ach.rewardType === 'gold') {
            state.gold += rewardVal;
            writeLog(`Награда за достижение "${ach.name}" (уровень ${claimed + 1}) получена: +${rewardVal.toLocaleString()} Золота!`, "log-ultimate");
        } else {
            state.diamonds += rewardVal;
            writeLog(`Награда за достижение "${ach.name}" (уровень ${claimed + 1}) получена: +${rewardVal} Древних Алмазов!`, "log-ultimate");
        }
        
        state.achievements[claimedKey] = claimed + 1;
        playCoinSound();
        showToast("Награда получена!");
        updateUI();
        saveGame();
    }
}
window.claimAchievement = claimAchievement;

function checkPrestigeStatus() {
    const btn = document.getElementById('prestige-trigger-btn');
    const currentLvlEl = document.getElementById('prestige-current-level');
    const claimableCrystalsEl = document.getElementById('prestige-claimable-crystals');
    
    if (!btn) return;
    
    currentLvlEl.textContent = state.level;
    
    if (state.level >= 20) {
        const claimable = (state.level - 19) * 2;
        claimableCrystalsEl.textContent = `+${claimable}`;
        btn.disabled = false;
        btn.querySelector('span').textContent = `Запустить глубокое бурение (+${claimable})`;
        btn.querySelector('i').className = 'fa-solid fa-dharmachakra';
        btn.classList.add('ready-prestige');
    } else {
        claimableCrystalsEl.textContent = `+0`;
        btn.disabled = true;
        btn.querySelector('span').textContent = `Достигните уровня 20`;
        btn.querySelector('i').className = 'fa-solid fa-lock';
        btn.classList.remove('ready-prestige');
    }
    
    const diamondsAmt = document.getElementById('crystals-amount');
    if (diamondsAmt) {
        diamondsAmt.textContent = state.diamonds.toLocaleString();
    }
    
    document.getElementById('altar-might-lvl').textContent = `Lvl ${state.prestigeMight}`;
    document.getElementById('altar-might-cost').textContent = (state.prestigeMight + 1) * 2;
    document.getElementById('buy-altar-might').disabled = (state.diamonds < (state.prestigeMight + 1) * 2);
    
    document.getElementById('altar-overclock-lvl').textContent = `Lvl ${state.prestigeOverclock}`;
    document.getElementById('altar-overclock-cost').textContent = (state.prestigeOverclock + 1) * 4;
    document.getElementById('buy-altar-overclock').disabled = (state.diamonds < (state.prestigeOverclock + 1) * 4);
    
    document.getElementById('altar-critical-lvl').textContent = `Lvl ${state.prestigeCritical}`;
    document.getElementById('altar-critical-cost').textContent = (state.prestigeCritical + 1) * 3;
    document.getElementById('buy-altar-critical').disabled = (state.diamonds < (state.prestigeCritical + 1) * 3);
}

