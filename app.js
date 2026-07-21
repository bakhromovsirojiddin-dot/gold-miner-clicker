// --- GAME STATE ---
let state = {
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
    
    // Prestige properties
    diamonds: 0,
    prestigeCount: 0,
    prestigeMight: 0,
    prestigeOverclock: 0,
    prestigeCritical: 0,
    
    // Expeditions properties
    expeditions: [
        { id: 'shallow_dig', active: false, endTime: 0, duration: 60 * 1000, requiredMiners: 1, rewardGold: 1000, rewardDiamondChance: 0, rewardArtifactChance: 0, name: 'Мелкая выработка' },
        { id: 'crystal_caves', active: false, endTime: 0, duration: 30 * 60 * 1000, requiredMiners: 3, rewardGold: 10000, rewardDiamondChance: 0.10, rewardArtifactChance: 0, name: 'Кристальные пещеры' },
        { id: 'ancient_core', active: false, endTime: 0, duration: 2 * 60 * 60 * 1000, requiredMiners: 5, rewardGold: 50000, rewardDiamondChance: 0, rewardArtifactChance: 0.25, name: 'Древнее ядро' }
    ],
    
    // Artifacts inventory
    artifacts: {
        ancestral_pickaxe: false, // +25% Tap Power
        miner_provisions: false,  // +15% Miners Speed
        clover_luck: false        // +5% Critical Strike Chance
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

const elBuyPickaxe = document.getElementById('buy-pickaxe');
const elPickaxeLvl = document.getElementById('pickaxe-lvl');
const elPickaxeCost = document.getElementById('pickaxe-cost');
const elPickaxeBenefitCurr = document.getElementById('pickaxe-benefit-curr');
const elPickaxeBenefitNext = document.getElementById('pickaxe-benefit-next');

const elBuyMiner = document.getElementById('buy-miner');
const elMinerLvl = document.getElementById('miner-lvl');
const elMinerCost = document.getElementById('miner-cost');
const elMinerBenefitCurr = document.getElementById('miner-benefit-curr');
const elMinerBenefitNext = document.getElementById('miner-benefit-next');

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

// --- DATA: ACHIEVEMENTS CONFIG ---
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
        name: 'Профсоюз',
        desc: 'Нанять команду шахтеров',
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
            p.color = Math.random() > 0.3 ? '#d000ff' : '#00f0ff'; // Neon pink/cyan sparks for critical hits!
            p.size *= 1.4;
            p.vx *= 1.3;
            p.vy *= 1.3;
        }
        particles.push(p);
    }
}

// --- CALCULATORS (DEDUCTING EXPEDITIONS & APPLYING PERSISTENT BUFFS) ---

function getMinersOnExpeditions() {
    return state.expeditions.reduce((acc, exp) => exp.active ? acc + exp.requiredMiners : acc, 0);
}

function getIdleMiners() {
    return Math.max(0, state.minerCount - getMinersOnExpeditions());
}

function getActiveGps() {
    const activeMiners = getIdleMiners();
    const levelMult = 1 + (state.level - 1) * 0.1;
    const overclockMult = 1 + state.prestigeOverclock * 1.0; // +100% per level
    const provisionsMult = state.artifacts.miner_provisions ? 1.15 : 1.0; // +15% provisions
    
    return activeMiners * levelMult * overclockMult * provisionsMult;
}

function getActiveTapPower() {
    const levelMult = 1 + (state.level - 1) * 0.1;
    const mightMult = 1 + state.prestigeMight * 0.5; // +50% per level
    const pickaxeMult = state.artifacts.ancestral_pickaxe ? 1.25 : 1.0; // +25% pickaxe
    
    return state.tapPower * levelMult * mightMult * pickaxeMult;
}

// --- CORE GAME ACTIONS ---

function processTap(x, y) {
    elOreNode.classList.remove('shake');
    void elOreNode.offsetWidth; 
    elOreNode.classList.add('shake');
    
    animatePickaxe(x, y);
    
    // Multipliers & Boosts
    const currentMultiplier = boost.active ? boost.multiplier : 1;
    const tapPower = getActiveTapPower();
    
    // Critical Strike roll
    const critChance = (state.prestigeCritical * 0.05) + (state.artifacts.clover_luck ? 0.05 : 0);
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? 10 : 1;
    
    const earned = tapPower * currentMultiplier * critMult;
    state.gold += earned;
    state.totalTaps++;
    
    // Give XP
    gainXp(earned);
    
    // Sound Synth
    if (isCrit) {
        playCritSound();
    } else {
        playHitSound();
    }
    
    // Floating Text & Sparks
    createFloatingText(x, y, `+${Math.floor(earned)}`, boost.active, isCrit);
    spawnSparks(x, y, isCrit);
    
    // UI Update & Save
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

function getTitleRu(level) {
    if (level < 5) return "Новичок-копатель";
    if (level < 10) return "Мастер кирки";
    if (level < 15) return "Старатель";
    if (level < 20) return "Смотритель шахты";
    if (level < 30) return "Золотой магнат";
    return "Король подземелий";
}

function levelUp() {
    state.level++;
    state.xp -= state.xpNeeded;
    state.xpNeeded = Math.round(100 * Math.pow(state.level, 1.6));
    
    // Reward Gold Burst
    const rewardGold = state.level * 150;
    state.gold += rewardGold;
    
    playLevelUpSound();
    showLevelUpModal(state.level, getTitleRu(state.level), rewardGold);
    showToast(`Level Up! Reached Level ${state.level}`);
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
    exp.endTime = Date.now() + exp.duration;
    
    showToast(`Экспедиция "${exp.name}" началась!`);
    updateUI();
    saveGame();
}
window.startExpedition = startExpedition;

function claimExpedition(id) {
    const exp = state.expeditions.find(e => e.id === id);
    if (!exp || !exp.active || Date.now() < exp.endTime) return;
    
    // Reward base gold
    state.gold += exp.rewardGold;
    let resultsMsg = `Собрано: +${exp.rewardGold.toLocaleString()} Золота`;
    
    // Diamond roll
    if (exp.rewardDiamondChance > 0 && Math.random() < exp.rewardDiamondChance) {
        state.diamonds += 1;
        resultsMsg += `, +1 Древний Алмаз`;
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
            
            resultsMsg += `. Найден артефакт: "${artName}"!`;
        }
    }
    
    exp.active = false;
    
    playBoostSound();
    showToast(resultsMsg);
    updateUI();
    saveGame();
}
window.claimExpedition = claimExpedition;

// --- PRESTIGE SYSTEM LOGIC ---

function checkPrestigeStatus() {
    const claimable = state.level >= 20 ? (state.level - 19) * 2 : 0;
    
    const btn = document.getElementById('prestige-trigger-btn');
    const lvlText = document.getElementById('prestige-current-level');
    const claimText = document.getElementById('prestige-claimable-crystals');
    const crystalsText = document.getElementById('crystals-amount');
    
    if (lvlText) lvlText.textContent = state.level;
    if (claimText) claimText.textContent = `+${claimable}`;
    if (crystalsText) crystalsText.textContent = state.diamonds;
    
    if (btn) {
        if (state.level >= 20) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-skull-crossbones"></i> Начать глубокое бурение`;
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-lock"></i> Требуется 20 уровень`;
        }
    }
    
    // Update Upgrade Cards
    const mightCost = (state.prestigeMight + 1) * 2;
    const overclockCost = (state.prestigeOverclock + 1) * 4;
    const criticalCost = (state.prestigeCritical + 1) * 3;
    
    document.getElementById('altar-might-lvl').textContent = `Lvl ${state.prestigeMight}`;
    document.getElementById('altar-might-cost').textContent = mightCost;
    document.getElementById('buy-altar-might').disabled = (state.diamonds < mightCost);
    
    document.getElementById('altar-overclock-lvl').textContent = `Lvl ${state.prestigeOverclock}`;
    document.getElementById('altar-overclock-cost').textContent = overclockCost;
    document.getElementById('buy-altar-overclock').disabled = (state.diamonds < overclockCost);
    
    document.getElementById('altar-critical-lvl').textContent = `Lvl ${state.prestigeCritical}`;
    document.getElementById('altar-critical-cost').textContent = criticalCost;
    document.getElementById('buy-altar-critical').disabled = (state.diamonds < criticalCost);
}

function doPrestige() {
    if (state.level < 20) return;
    if (!confirm("Вы уверены, что хотите запустить глубокое бурение? Все ваше текущее золото, апгрейды и шахтеры будут обнулены, но вы получите Древние Алмазы!")) return;
    
    const claimable = (state.level - 19) * 2;
    
    // Save safety 1: save before changes
    saveGame();
    
    // Apply prestige changes
    state.diamonds += claimable;
    state.prestigeCount++;
    
    // Reset active values
    state.gold = 0;
    state.tapPower = 1;
    state.goldPerSecond = 0;
    state.pickaxeLevel = 1;
    state.pickaxeCost = 10;
    state.minerCount = 0;
    state.minerCost = 50;
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 100;
    state.totalXp = 0;
    
    // Cancel any active expeditions
    state.expeditions.forEach(exp => {
        exp.active = false;
        exp.endTime = 0;
    });
    
    // Save safety 2: save immediately after changes
    saveGame();
    
    // Visual & Audio effects
    playBoostSound();
    
    // Screen Rumble Shake
    elMineViewport.classList.add('prestige-shake');
    setTimeout(() => {
        elMineViewport.classList.remove('prestige-shake');
    }, 1000);
    
    // White flash transition
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
    
    showToast(`Перерождение завершено! Получено ${claimable} Алмазов!`);
    
    // Swap back to Shop/Upgrade tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === 'shop') {
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
        showToast("Улучшение Древней мощи куплено!");
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
        showToast("Улучшение Разгона ядра куплено!");
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
        showToast("Улучшение Шанса критического удара куплено!");
        updateUI();
        saveGame();
    }
}

// --- STORE UPGRADES LOGIC ---

function buyPickaxeUpgrade() {
    if (state.gold >= state.pickaxeCost) {
        state.gold -= state.pickaxeCost;
        state.pickaxeLevel++;
        state.tapPower = Math.pow(2, state.pickaxeLevel - 1);
        state.pickaxeCost = Math.round(state.pickaxeCost * 1.5);
        
        playCoinSound();
        showToast(`Pickaxe Upgraded! Tap Power doubled.`);
        updateUI();
        saveGame();
    } else {
        showToast("Not enough gold!", true);
    }
}

function buyMinerUpgrade() {
    if (state.gold >= state.minerCost) {
        state.gold -= state.minerCost;
        state.minerCount++;
        state.goldPerSecond += 1; // +1 Base GPS per miner
        state.minerCost = Math.round(state.minerCost * 1.5);
        
        spawnMinerVisual();
        
        playCoinSound();
        showToast(`Miner Hired! Production speed increased.`);
        updateUI();
        saveGame();
    } else {
        showToast("Not enough gold!", true);
    }
}

function spawnMinerVisual() {
    const minerDiv = document.createElement('div');
    minerDiv.className = 'visual-miner';
    minerDiv.innerHTML = '<i class="fa-solid fa-helmet-safety"></i>';
    elMinerCrewVisual.appendChild(minerDiv);
}

function activateBoost() {
    if (boost.active || boost.cooldownRemaining > 0) return;
    
    boost.active = true;
    boost.timeRemaining = boost.duration;
    state.totalGoldenRushes = (state.totalGoldenRushes || 0) + 1;
    
    playBoostSound();
    showToast("3x Golden Rush activated for 30s!");
    
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

// 60FPS particle render loop
function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
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

// 10FPS (100ms) Game mechanics loop
function gameLoop() {
    // 1. Accumulate Passive Income (Gold Per Second divided by 10)
    const activeGps = getActiveGps();
    if (activeGps > 0) {
        const currentMultiplier = boost.active ? boost.multiplier : 1;
        const passiveEarned = (activeGps * currentMultiplier) / 10;
        state.gold += passiveEarned;
        
        // Passive XP is accumulated at 100% rate, optimized to suppress UI redrawing unless leveled
        gainXp(passiveEarned, true);
        
        // Auto-spawn small ambient spark occasionally from active miners
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
            showToast("Golden Rush ended!");
        }
    } else if (boost.cooldownRemaining > 0) {
        boost.cooldownRemaining -= 0.1;
        if (boost.cooldownRemaining <= 0) {
            boost.cooldownRemaining = 0;
            elBoostBtn.disabled = false;
        }
    }
    
    // 3. Tick active expeditions (Optimized UI updates)
    updateExpeditionTimers();
    
    // 4. Update HUD counts dynamically (at 10fps for fluid updates)
    updateUINumbersOnly();
}

// Optimized expedition ticks to prevent mobile WebView redrawing lag
function updateExpeditionTimers() {
    state.expeditions.forEach(exp => {
        if (exp.active) {
            const remaining = exp.endTime - Date.now();
            const cardBtn = document.querySelector(`[onclick="claimExpedition('${exp.id}')"]`) || document.querySelector(`[onclick="startExpedition('${exp.id}')"]`);
            const cardTimerText = cardBtn ? cardBtn.closest('.expeditions-card').querySelector('.expedition-time-text') : null;
            const cardBarFill = cardBtn ? cardBtn.closest('.expeditions-card').querySelector('.expedition-progress-bar-fill') : null;
            
            if (remaining <= 0) {
                // Redraw full expeditions container when mission finishes to swap buttons
                updateExpeditionsUI();
            } else {
                if (cardTimerText) {
                    const hours = Math.floor(remaining / 3600000);
                    const mins = Math.floor((remaining % 3600000) / 60000);
                    const secs = Math.floor((remaining % 60000) / 1000);
                    cardTimerText.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
                if (cardBarFill) {
                    const pct = ((exp.duration - remaining) / exp.duration) * 100;
                    cardBarFill.style.width = `${pct}%`;
                }
            }
        }
    });
}

// --- UI SYNC SYSTEMS ---

function updateUI() {
    // Main numeric HUD values
    updateUINumbersOnly();
    
    // Equipment levels and descriptions in Shop
    const levelMult = 1 + (state.level - 1) * 0.1;
    elPickaxeLvl.textContent = `Lvl ${state.pickaxeLevel}`;
    elPickaxeCost.textContent = state.pickaxeCost;
    elPickaxeBenefitCurr.textContent = `+${Math.round(state.tapPower * levelMult)}/tap`;
    elPickaxeBenefitNext.textContent = `+${Math.round(state.tapPower * 2 * levelMult)}/tap`;
    
    elMinerLvl.textContent = `${state.minerCount} Hired`;
    elMinerCost.textContent = state.minerCost;
    elMinerBenefitCurr.textContent = `+${Math.round(state.minerCount * levelMult)}/s`;
    elMinerBenefitNext.textContent = `+${Math.round((state.minerCount + 1) * levelMult)}/s`;
    
    // Level Badge & Title
    elHudLevelBadge.textContent = `Lvl ${state.level}`;
    elHudLevelTitle.textContent = getTitleRu(state.level);
    
    // Redraw miners visuals block
    elMinerCrewVisual.innerHTML = '';
    const activeMiners = getIdleMiners();
    for (let i = 0; i < activeMiners; i++) {
        spawnMinerVisual();
    }
    
    // Heavy updates (called only on discrete actions, not continuously in loop)
    updateAchievements();
    updateExpeditionsUI();
    updateArtifactsUI();
    checkPrestigeStatus();
}

function updateUINumbersOnly() {
    // Current Gold
    elGoldAmount.textContent = Math.floor(state.gold).toLocaleString();
    
    // GPS values
    const currentMultiplier = boost.active ? boost.multiplier : 1;
    const activeGps = getActiveGps() * currentMultiplier;
    elGpsDisplay.textContent = `+${Math.floor(activeGps).toLocaleString()} /s`;
    elBaseGpsDisplay.textContent = `${Math.floor(getActiveGps()).toLocaleString()} /s`;
    elTapPowerDisplay.textContent = Math.floor(getActiveTapPower() * currentMultiplier).toLocaleString();
    
    // Stats list
    const levelMult = 1 + (state.level - 1) * 0.1;
    elLevelMultDisplay.textContent = `${levelMult.toFixed(1)}x`;
    elMinerRankDisplay.textContent = getTitleRu(state.level);
    elTotalTapsDisplay.textContent = state.totalTaps.toLocaleString();
    elMinersCountDisplay.textContent = `${getIdleMiners()} / ${state.minerCount}`;
    
    // Disabled/Enabled upgrade purchase status
    elBuyPickaxe.disabled = (state.gold < state.pickaxeCost);
    elBuyMiner.disabled = (state.gold < state.minerCost);
    
    // XP Bar updates
    const xpPct = (state.xp / state.xpNeeded) * 100;
    elXpBarFill.style.width = `${Math.min(100, xpPct)}%`;
    elXpText.textContent = `XP: ${Math.floor(state.xp)} / ${state.xpNeeded}`;
    
    // Active Boost bar updates
    if (boost.active) {
        const pct = (boost.timeRemaining / boost.duration) * 100;
        elBoostProgress.style.transform = `scaleX(${pct / 100})`;
        elBoostTimer.textContent = `${Math.ceil(boost.timeRemaining)}s`;
    }
    
    // Boost Button cooling indicator
    if (boost.cooldownRemaining > 0) {
        elBoostCooldownText.classList.remove('hidden');
        elBoostCooldownText.textContent = `Cooldown: ${Math.ceil(boost.cooldownRemaining)}s`;
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
        else if (ach.id === 'miners') curVal = state.minerCount;
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
        else if (ach.id === 'miners') iconClass = 'fa-users';
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

function claimAchievement(id) {
    const ach = ACHIEVEMENTS_DATA.find(a => a.id === id);
    if (!ach) return;
    
    const claimed = state.achievements[id + '_claimed'] || 0;
    if (claimed >= ach.tiers.length) return;
    
    let curVal = 0;
    if (id === 'taps') curVal = state.totalTaps;
    else if (id === 'miners') curVal = state.minerCount;
    else if (id === 'rushes') curVal = state.totalGoldenRushes || 0;
    else if (id === 'prestige') curVal = state.prestigeCount;
    
    const targetVal = ach.tiers[claimed];
    if (curVal < targetVal) return;
    
    const rewardVal = ach.rewards[claimed];
    if (ach.rewardType === 'gold') {
        state.gold += rewardVal;
        playCoinSound();
        showToast(`Награда получена: +${rewardVal.toLocaleString()} Золота!`);
    } else if (ach.rewardType === 'diamonds') {
        state.diamonds += rewardVal;
        playBoostSound();
        showToast(`Награда получена: +${rewardVal} Алмазов!`);
    }
    
    state.achievements[id + '_claimed'] = claimed + 1;
    
    updateUI();
    saveGame();
}
window.claimAchievement = claimAchievement;

function updateExpeditionsUI() {
    const listContainer = document.getElementById('expeditions-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const idle = getIdleMiners();
    
    state.expeditions.forEach(exp => {
        const card = document.createElement('div');
        card.className = 'expeditions-card';
        
        let timeText = '';
        let progressPct = 0;
        let isDone = false;
        
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
                progressPct = ((exp.duration - remaining) / exp.duration) * 100;
            }
        } else {
            const hours = Math.floor(exp.duration / 3600000);
            const mins = Math.floor((exp.duration % 3600000) / 60000);
            timeText = hours > 0 ? `${hours}ч ${mins}м` : `${mins} мин`;
        }
        
        let buttonHtml = '';
        if (!exp.active) {
            buttonHtml = `<button class="expedition-action-btn" ${idle < exp.requiredMiners ? 'disabled' : ''} onclick="startExpedition('${exp.id}')">
                Отправить
            </button>`;
        } else if (isDone) {
            buttonHtml = `<button class="expedition-action-btn collectable" onclick="claimExpedition('${exp.id}')">
                Собрать
            </button>`;
        } else {
            buttonHtml = `<button class="expedition-action-btn" disabled>
                В пути
            </button>`;
        }
        
        card.innerHTML = `
            <div class="expedition-header">
                <div class="expedition-title-block">
                    <span class="expedition-name">${exp.name}</span>
                    <span class="expedition-reqs">Требуется: <strong>${exp.requiredMiners}</strong> шахт.</span>
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
        { key: 'ancestral_pickaxe', name: 'Кирка предков', effect: '+25% к тапу', icon: 'fa-hammer' },
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

function loadGame() {
    try {
        const saved = localStorage.getItem('gold_miner_clicker_save');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Merge primary properties
            state = { ...state, ...parsed };
            
            // Nested object safety checks
            if (parsed.artifacts) state.artifacts = { ...state.artifacts, ...parsed.artifacts };
            if (parsed.achievements) state.achievements = { ...state.achievements, ...parsed.achievements };
            if (parsed.expeditions) {
                parsed.expeditions.forEach(pExp => {
                    const target = state.expeditions.find(e => e.id === pExp.id);
                    if (target) {
                        target.active = pExp.active;
                        target.endTime = pExp.endTime;
                    }
                });
            }
            
            // Offline Gold Progress Calculation
            const elapsed = Date.now() - (state.lastSaveTime || Date.now());
            if (elapsed > 2000) {
                const maxOffline = 12 * 60 * 60 * 1000; // Cap at 12 hours
                const actualOffline = Math.min(elapsed, maxOffline);
                const offlineGps = getActiveGps();
                const offlineEarned = offlineGps * (actualOffline / 1000);
                
                if (offlineEarned > 1) {
                    state.gold += offlineEarned;
                    gainXp(offlineEarned, true);
                    
                    // Display Offline Toast after setup has finished
                    setTimeout(() => {
                        showToast(`Оффлайн-доход: +${Math.floor(offlineEarned).toLocaleString()} Золота!`);
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
    if (confirm("Are you sure you want to reset all progress? You will lose all your gold, pickaxes, levels, diamonds, and achievements!")) {
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
        
        // Return active tab to Shop
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === 'shop') {
                btn.click();
            }
        });
        
        updateUI();
        showToast("Progress Reset Successful");
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
    elBuyPickaxe.addEventListener('click', buyPickaxeUpgrade);
    elBuyMiner.addEventListener('click', buyMinerUpgrade);
    elBoostBtn.addEventListener('click', activateBoost);
    elAudioToggle.addEventListener('click', toggleAudio);
    elResetGameBtn.addEventListener('click', resetGame);
    elModalClaimBtn.addEventListener('click', hideLevelUpModal);
    
    // Altar upgrade buttons
    document.getElementById('prestige-trigger-btn').addEventListener('click', doPrestige);
    document.getElementById('buy-altar-might').addEventListener('click', buyAltarMight);
    document.getElementById('buy-altar-overclock').addEventListener('click', buyAltarOverclock);
    document.getElementById('buy-altar-critical').addEventListener('click', buyAltarCritical);
    
    setupTabs();
}
