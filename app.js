// Mock THREE if not loaded
if (typeof THREE === 'undefined') {
    window.THREE = {
        Group: function() {
            this.position = { 
                x: 0, y: 0, z: 5, 
                distanceTo: function(other) {
                    const dx = this.x - other.x;
                    const dz = this.z - other.z;
                    return Math.sqrt(dx*dx + dz*dz);
                }, 
                copy: function(other) {
                    this.x = other.x; this.y = other.y; this.z = other.z;
                }, 
                addScaledVector: function(dir, speed) {
                    this.x += dir.x * speed; this.z += dir.z * speed;
                } 
            };
            this.rotation = { x: 0, y: 0, z: 0 };
            this.scale = { set: function() {} };
            this.add = function() {};
            this.remove = function() {};
            this.children = [
                { visible: true }, { visible: true }, { visible: true }
            ];
            this.visible = true;
        },
        Vector3: function(x=0, y=0, z=0) {
            this.x = x; this.y = y; this.z = z;
            this.subVectors = function(a, b) {
                this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z;
                return this;
            };
            this.length = function() {
                return Math.sqrt(this.x*this.x + this.z*this.z);
            };
            this.normalize = function() {
                const len = this.length();
                if (len > 0) {
                    this.x /= len; this.z /= len;
                }
                return this;
            };
            this.copy = function(other) {
                this.x = other.x; this.y = other.y; this.z = other.z;
                return this;
            };
            this.set = function(x, y, z) {
                this.x = x; this.y = y; this.z = z;
                return this;
            };
        }
    };
}

// --- GAME STATE ---
let state = {
    gold: 0,
    tapPower: 1,
    goldPerSecond: 0,
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

    // MMORPG Hero Classes levels (Hired companions)
    classes: {
        dwarf: 1,  // Dwarf (Warrior / Tank companion)
        goblin: 0, // Goblin (Rogue / DPS companion)
        sage: 0    // Sage (Priest / Healer companion)
    },

    // Active Skills states (in seconds)
    skills: {
        cooldowns: { q: 0, w: 0, e: 0 },
        activeSkills: { q: 0, w: 0, e: 0, ultimate: 0 }
    },
    
    // Expeditions / Raids
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
    
    // Equipment levels
    equipment: {
        weapon: 1,    // 1: Rusty Pickaxe, 2: Steel Sword, 3: Mithril Greatsword, 4: Titan Hammer
        helmet: 1,    // Leather Hood, Iron Helm, steel Greathelm, Templar crown
        armor: 1,     // Cloth Tunic, Ring Mail, Heavy Plate, Titan Bulwark
        accessory: 1  // Copper Ring, Silver Signet, Sapphire Ring, Amulet of Power
    },

    // Guild bank rank
    guildLevel: 1,
    guildBankDeposits: 0,
    guildBuffPct: 0,

    // Selected Player Active Class: mage, warrior, rogue, priest, berserker, ranger
    playerClass: "mage",
    
    totalGoldenRushes: 0,
    lastSaveTime: 0
};

// --- MMORPG COMBAT STATS (Dungeon state) ---
let combatState = {
    player: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 1 },
    comp1: { hp: 250, maxHp: 250, mp: 30, maxMp: 30, level: 1 }, // Warrior (Dwarf)
    comp2: { hp: 120, maxHp: 120, mp: 100, maxMp: 100, level: 1 }, // Priest (Sage)
    comp3: { hp: 90, maxHp: 90, mp: 40, maxMp: 40, level: 1 }, // Rogue (Goblin)
    enemies: [],
    monstersDefeated: 0
};

// --- BOOST STATE ---
let boost = {
    active: false,
    duration: 30,
    timeRemaining: 0,
    cooldownDuration: 60,
    cooldownRemaining: 0,
    multiplier: 3
};

// Audio Context
let audioCtx = null;

// Track last touch time to avoid double mouse clicks
let lastTouchTime = 0;

// --- THREE.JS 3D ENGINE VARIABLES ---
let scene, camera, renderer, elCanvasContainer;
let veinMesh, playerGroup, comp1Group, comp2Group, comp3Group;
let weaponMesh;
let enemiesContainer = new THREE.Group();
let projectiles = [];
let particles3D = [];
let keysPressed = {};
let cameraMode = "TPS"; // TPS or FPS
let cameraYaw = 0; 
let cameraPitch = -0.3; // Angle looking down
let isDraggingCamera = false;
let previousTouchX = 0, previousTouchY = 0;

// Virtual Joystick tracking
let joystickActive = false;
let joystickStartX = 0, joystickStartY = 0;
let joystickVector = { x: 0, y: 0 };
const maxJoystickOffset = 40; // max radius in pixels

// Frame limiting
let lastFrameTime = 0;
const fpsInterval = 1000 / 60; // Target 60 FPS capped

// --- DOM ELEMENTS ---
const elGoldAmount = document.getElementById('gold-amount');
const elGpsDisplay = document.getElementById('gps-display');
const elBaseGpsDisplay = document.getElementById('base-gps-display');
const elTapPowerDisplay = document.getElementById('tap-power-display');
const elTotalTapsDisplay = document.getElementById('total-taps-display');
const elMinersCountDisplay = document.getElementById('miners-count-display');

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

// Guild banking panels
const elGuildLevel = document.getElementById('guild-level-display');
const elGuildBuff = document.getElementById('guild-buff-display');
const elGuildBank = document.getElementById('guild-bank-display');
const elGuildChatLog = document.getElementById('guild-chat-log');

// Weapon stats displays
const elEqWeaponName = document.getElementById('eq-weapon-name');
const elEqWeaponStat = document.getElementById('eq-weapon-stat');
const elEqHelmetName = document.getElementById('eq-helmet-name');
const elEqHelmetStat = document.getElementById('eq-helmet-stat');
const elEqArmorName = document.getElementById('eq-armor-name');
const elEqArmorStat = document.getElementById('eq-armor-stat');
const elEqAccessoryName = document.getElementById('eq-accessory-name');
const elEqAccessoryStat = document.getElementById('eq-accessory-stat');

// --- DATA: VEIN TIERS CONFIG ---
const VEIN_TIERS = [
    { name: "Медная жила", maxHealth: 300, color: 0xcd7f32 },
    { name: "Серебряный пласт", maxHealth: 1500, color: 0xc0c0c0 },
    { name: "Золотое месторождение", maxHealth: 6000, color: 0xffd700 },
    { name: "Изумрудное ядро", maxHealth: 25000, color: 0x50c878 },
    { name: "Сапфировый нексус", maxHealth: 100000, color: 0x0f52ba },
    { name: "Рубиновый очаг", maxHealth: 400000, color: 0xe0115f },
    { name: "Обсидиановая бездна", maxHealth: 1500000, color: 0x3a125c },
    { name: "Титановый хребет", maxHealth: 6000000, color: 0x00f0ff },
    { name: "Эфирный разлом", maxHealth: 25000000, color: 0xd000ff },
    { name: "Ядро Титана", maxHealth: 100000000, color: 0xff4500 }
];

const ACHIEVEMENTS_DATA = [
    { id: 'taps', name: 'Рука копателя', desc: 'Сделать атаки по жиле', tiers: [100, 1000, 10000], rewards: [500, 5000, 50000], rewardType: 'gold' },
    { id: 'miners', name: 'Команда героев', desc: 'Нанять инженеров гильдии', tiers: [5, 15, 50], rewards: [1000, 8000, 100000], rewardType: 'gold' },
    { id: 'rushes', name: 'Золотая лихорадка', desc: 'Запустить режим лихорадки', tiers: [1, 5, 20], rewards: [1500, 10000, 75000], rewardType: 'gold' },
    { id: 'prestige', name: 'Глубокий бурильщик', desc: 'Сделать сброс на Алтаре', tiers: [1, 3, 10], rewards: [5, 15, 50], rewardType: 'diamonds' }
];

let is2DMode = false;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    loadGame();
    
    // Initialize groups globally first so the FSM logic doesn't crash on undefined variables
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 5);
    
    comp1Group = new THREE.Group();
    comp1Group.position.set(-3, 0, 3);
    
    comp2Group = new THREE.Group();
    comp2Group.position.set(0, 0, 4);
    
    comp3Group = new THREE.Group();
    comp3Group.position.set(3, 0, 3);
    
    try {
        init3DScene();
    } catch (e) {
        console.error("WebGL 3D Scene initialization failed, falling back to 2D Canvas:", e);
        init2DFallbackScene();
    }
    
    setupEventListeners();
    syncAudioIcon();
    updateUI();
    
    writeLog("Добро пожаловать в Gold Miner 3D MMORPG! Используйте джойстик для бега, бейте Attack вблизи жилы.", "log-system");
    
    // Game mechanical ticks (10 FPS)
    setInterval(gameLoop, 100);
    
    // Draw loop (uses requestAnimationFrame)
    requestAnimationFrame(renderLoop);
});

// --- SOUND SYNTHESIZER ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playHitSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

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
    osc2.frequency.setValueAtTime(2500, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc1.start(now);
    osc2.start(now + 0.03);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
}

function playFractureSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
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
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(70, now + 0.7);
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseNode.start(now);
    noiseNode.stop(now + 0.8);
}

function playCoinSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.06);
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
}

// --- 3D ENGINE SCENE CREATION (THREE.JS) ---
function init3DScene() {
    elCanvasContainer = document.getElementById('3d-canvas-container');
    if (!elCanvasContainer) return;

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0c12);
    scene.fog = new THREE.FogExp2(0x0e0c12, 0.06);

    // Create camera
    const width = elCanvasContainer.clientWidth || 300;
    const height = elCanvasContainer.clientHeight || 300;
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    
    // Create Renderer with optimized performance flags
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Caps pixel ratio for mobile WebView
    renderer.shadowMap.enabled = false; // Disable dynamic shadows to save GPU
    elCanvasContainer.appendChild(renderer.domElement);

    // Simple Flat Ambient and Directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x18151f, flatShading: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.2;
    scene.add(ground);

    // Dungeon pillars (Low-Poly)
    const pillarGeo = new THREE.BoxGeometry(1, 4, 1);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x221c2b });
    const pillarPositions = [
        [-8, 0, -8], [8, 0, -8],
        [-8, 0, 8], [8, 0, 8],
        [-12, 0, 0], [12, 0, 0]
    ];
    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos[0], 0.8, pos[2]);
        scene.add(pillar);
    });

    // 1. Core Vein mesh (faceted geometry gemstone)
    const veinColor = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)].color;
    const veinGeo = new THREE.IcosahedronGeometry(1.6, 0); // Flat faceted structure
    const veinMat = new THREE.MeshLambertMaterial({ 
        color: veinColor, 
        emissive: veinColor, 
        emissiveIntensity: 0.25, 
        flatShading: true 
    });
    veinMesh = new THREE.Mesh(veinGeo, veinMat);
    veinMesh.position.set(0, 0.4, 0);
    scene.add(veinMesh);

    // 2. Player character model group
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 5); // Start slightly away from core
    
    // Stylized low-poly body cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x007aff, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.15;
    playerGroup.add(body);

    // Helmet box
    const helmGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
    const helmMat = new THREE.MeshLambertMaterial({ color: 0x5a5f6e, flatShading: true });
    const helm = new THREE.Mesh(helmGeo, helmMat);
    helm.position.y = 0.55;
    playerGroup.add(helm);

    // Weapon mesh container
    weaponMesh = new THREE.Group();
    weaponMesh.position.set(0.4, 0.1, 0.4);
    playerGroup.add(weaponMesh);
    
    buildWeaponMesh(); // Bind 3D tool based on equipped weapon rank
    scene.add(playerGroup);

    // 3. AI Companions Groups
    // Tank (Dwarf)
    comp1Group = buildCompanionMesh(0xff9500, 0x4a4a4a); // orange + shield
    comp1Group.position.set(-3, 0, 3);
    scene.add(comp1Group);

    // Healer (Priest/Sage)
    comp2Group = buildCompanionMesh(0x00f0ff, 0x228b22); // cyan + staff
    comp2Group.position.set(0, 0, 4);
    scene.add(comp2Group);

    // Rogue (Goblin)
    comp3Group = buildCompanionMesh(0x32cd32, 0xd2691e); // lime + daggers
    comp3Group.position.set(3, 0, 3);
    scene.add(comp3Group);

    // Container for spawned monsters
    scene.add(enemiesContainer);

    // Window resize handler
    window.addEventListener('resize', () => {
        if (camera && renderer && elCanvasContainer) {
            const w = elCanvasContainer.clientWidth || 300;
            const h = elCanvasContainer.clientHeight || 300;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    });
}

function buildCompanionMesh(bodyColor, gearColor) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.1, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.25;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: gearColor, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.4;
    group.add(head);
    
    // Weapon stick
    const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.rotation.x = Math.PI / 2;
    stick.position.set(0.35, -0.1, 0.3);
    group.add(stick);
    
    return group;
}

function buildWeaponMesh() {
    // Clear old weapon geometry
    while(weaponMesh.children.length > 0){
        weaponMesh.remove(weaponMesh.children[0]);
    }

    const rank = state.equipment.weapon;
    let weaponColor = 0x8b5a2b; // bronze wood base
    if (rank === 2) weaponColor = 0xc0c0c0; // iron
    else if (rank === 3) weaponColor = 0x00f0ff; // mithril cyan
    else if (rank >= 4) weaponColor = 0xff9900; // cosmic gold

    // Create 3D pickaxe structure
    const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    weaponMesh.add(handle);

    const headGeo = new THREE.BoxGeometry(0.12, 0.12, 0.7);
    const headMat = new THREE.MeshLambertMaterial({ color: weaponColor, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.45;
    head.rotation.x = 0.15;
    weaponMesh.add(head);
}

// --- VISUAL EFFECTS ENGINES (3D PARTICLES) ---
function spawn3DSparks(originPos, isCrit = false) {
    const count = isCrit ? 15 : 6;
    for (let i = 0; i < count; i++) {
        const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const pColor = isCrit ? 0xe056fd : 0xffd700;
        const pMat = new THREE.MeshBasicMaterial({ color: pColor });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        
        pMesh.position.copy(originPos);
        // randomize spawning slightly
        pMesh.position.x += (Math.random() - 0.5) * 0.4;
        pMesh.position.y += (Math.random() - 0.5) * 0.4;
        pMesh.position.z += (Math.random() - 0.5) * 0.4;
        
        scene.add(pMesh);
        
        particles3D.push({
            mesh: pMesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 5 + 2,
                (Math.random() - 0.5) * 4
            ),
            life: 1.0,
            decay: Math.random() * 0.06 + 0.04
        });
    }
}

// --- RPG CALCULATORS & Labor balance ---
function getActiveGps() {
    // Basic hired passive levels
    const activeMiners = Math.max(0, state.classes.goblin - getMinersOnExpeditions());
    const baseGps = (activeMiners * 1) + (state.classes.sage * 5);
    
    const levelMult = 1 + (state.level - 1) * 0.1;
    const overclockMult = 1 + state.prestigeOverclock * 1.0;
    const provisionsMult = state.artifacts.miner_provisions ? 1.15 : 1.0;
    const guildBankMult = 1 + (state.guildBuffPct / 100);
    
    let multiplier = levelMult * overclockMult * provisionsMult * guildBankMult;
    
    if (state.skills.activeSkills.w > 0) multiplier *= 3; // W activates Goblin Overclock
    if (state.skills.activeSkills.ultimate > 0) multiplier *= 5;
    
    return baseGps * multiplier;
}

function getActiveTapPower() {
    // Dwarf levels + Weapon equipped rank bonus
    const weaponRank = state.equipment.weapon;
    const weaponBonus = (weaponRank - 1) * 25;
    
    const baseTap = 1 + (state.classes.dwarf - 1) * 2 + weaponBonus;
    const mightMult = 1 + state.prestigeMight * 0.5;
    const pickaxeMult = state.artifacts.ancestral_pickaxe ? 1.25 : 1.0;
    
    let multiplier = mightMult * pickaxeMult;
    
    if (state.skills.activeSkills.q > 0) multiplier *= 2; // Q activates Demolish
    if (state.skills.activeSkills.ultimate > 0) multiplier *= 5;
    
    return baseTap * multiplier;
}

function getCritChance() {
    if (state.skills.activeSkills.e > 0) return 1.0; // E forces 100% crit
    
    const base = 0.01;
    const sageBonus = state.classes.sage * 0.01;
    const cloverBonus = state.artifacts.clover_luck ? 0.05 : 0;
    const ringBonus = (state.equipment.accessory - 1) * 0.08;
    
    return base + sageBonus + cloverBonus + ringBonus;
}

function getClassCost(classId) {
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

function getMinersOnExpeditions() {
    return state.expeditions.reduce((acc, exp) => exp.active ? acc + exp.requiredMiners : acc, 0);
}

function getIdleMiners() {
    return Math.max(0, state.classes.goblin - getMinersOnExpeditions());
}

// --- MONSTER CONSOLE LOG SYSTEM ---
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

// --- MONSTER SPANNING ENGINE (COMBAT STATE) ---
function spawnMonster() {
    if (combatState.enemies.length >= 3) return; // limit active mobs to 3

    // Spawn low-poly red monster cube
    const enemyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const enemyMat = new THREE.MeshLambertMaterial({ color: 0xff3b30, flatShading: true });
    const enemyMesh = new THREE.Mesh(enemyGeo, enemyMat);

    // Spawn at outer radius
    const angle = Math.random() * Math.PI * 2;
    const spawnDistance = 15;
    enemyMesh.position.set(
        Math.cos(angle) * spawnDistance,
        -0.4,
        Math.sin(angle) * spawnDistance
    );

    enemiesContainer.add(enemyMesh);
    
    const monsterData = {
        mesh: enemyMesh,
        hp: 50 + state.level * 20,
        maxHp: 50 + state.level * 20,
        target: playerGroup, // default target
        speed: 0.05 + Math.random() * 0.03
    };

    combatState.enemies.push(monsterData);
    writeLog("⚠️ Внимание! В шахту ворвался Пещерный Паук!", "log-crit");
}

// --- USER ATTACKS ACTION HUDS ---
function performAttack() {
    // 1. Weapon swing visual rotation
    weaponMesh.rotation.z = -1.0;
    setTimeout(() => {
        weaponMesh.rotation.z = 0;
    }, 120);

    const dmgMultiplier = boost.active ? boost.multiplier : 1;
    const baseAtk = getActiveTapPower() * dmgMultiplier;
    const critChance = getCritChance();
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? 10 : 1;
    const damage = baseAtk * critMult;

    // Check if monster in range first
    let hitMonster = false;
    for (let i = combatState.enemies.length - 1; i >= 0; i--) {
        const mob = combatState.enemies[i];
        const dist = playerGroup.position.distanceTo(mob.mesh.position);
        if (dist <= 3.5) {
            mob.hp -= damage;
            hitMonster = true;
            spawn3DSparks(mob.mesh.position, isCrit);
            writeLog(`⚔️ Вы атаковали монстра! Нанесено ${Math.floor(damage).toLocaleString()} урона.`, "log-system");
            
            if (isCrit) playCritSound();
            else playHitSound();

            if (mob.hp <= 0) {
                // Slain
                enemiesContainer.remove(mob.mesh);
                combatState.enemies.splice(i, 1);
                
                // Reward
                const rewardGold = 25 * state.level;
                const rewardXp = 10 * state.level;
                state.gold += rewardGold;
                gainXp(rewardXp);
                
                combatState.monstersDefeated++;
                writeLog(`💀 Монстр повержен! Получено +${rewardGold} Золота и +${rewardXp} XP!`, "log-fracture");
                playCoinSound();
            }
            break;
        }
    }

    // If no monster in range, deal damage to Central Vein
    if (!hitMonster) {
        const distToVein = playerGroup.position.distanceTo(veinMesh.position);
        if (distToVein <= 3.5) {
            state.gold += damage;
            state.totalTaps++;
            damageVein(damage);

            spawn3DSparks(veinMesh.position, isCrit);
            if (isCrit) {
                playCritSound();
                writeLog(`🎯 КРИТ! Нанесено ${Math.floor(damage).toLocaleString()} урона по жиле!`, "log-crit");
            } else {
                playHitSound();
            }
        } else {
            showToast("Слишком далеко от жилы или монстра!", true);
        }
    }

    updateUI();
    saveGame();
}

function damageVein(amount) {
    state.vein.health += amount;
    
    // Scale central vein mesh visually matching damage ratio (Low-poly scale)
    const pct = state.vein.health / state.vein.maxHealth;
    if (veinMesh) {
        const scaleVal = 1.0 + Math.sin(pct * Math.PI) * 0.15;
        veinMesh.scale.set(scaleVal, scaleVal, scaleVal);
        
        // Shake proportional to health damage
        if (pct >= 0.8) {
            veinMesh.position.x = (Math.random() - 0.5) * 0.2;
            veinMesh.position.z = (Math.random() - 0.5) * 0.2;
        } else {
            veinMesh.position.set(0, 0.4, 0);
        }
    }

    if (state.vein.health >= state.vein.maxHealth) {
        fractureVein();
    }
}

function fractureVein() {
    const tierConfig = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)];
    const goldReward = tierConfig.maxHealth * 0.5;
    const xpReward = tierConfig.maxHealth * 0.25;

    state.gold += goldReward;
    state.vein.health = 0;
    state.vein.fractures++;

    // Increment Tier
    state.vein.tier++;
    if (state.vein.tier > VEIN_TIERS.length) {
        state.vein.tier = 1;
        state.vein.infiniteCycle = (state.vein.infiniteCycle || 0) + 1;
    }

    const nextTierConfig = VEIN_TIERS[state.vein.tier - 1];
    const multiplier = Math.pow(10, state.vein.infiniteCycle || 0);
    state.vein.maxHealth = nextTierConfig.maxHealth * multiplier;

    playFractureSound();

    // Trigger whiteout flash
    const flash = document.getElementById('prestige-flash');
    if (flash) {
        flash.classList.remove('hidden');
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.classList.add('hidden');
            }, 1000);
        }, 150);
    }

    writeLog(`💥 Жила разрушена! Награда: +${Math.floor(goldReward).toLocaleString()} Золота, +${Math.floor(xpReward).toLocaleString()} XP!`, "log-fracture");
    writeLog(`Обнаружен новый пласт: ${nextTierConfig.name} (${state.vein.maxHealth.toLocaleString()} HP)`, "log-system");
    
    // Repaint Vein mesh color
    if (veinMesh) {
        veinMesh.material.color.setHex(nextTierConfig.color);
        veinMesh.material.emissive.setHex(nextTierConfig.color);
        veinMesh.position.set(0, 0.4, 0);
    }

    gainXp(xpReward);
    saveGame();
    updateUI();
}

// --- ACTIVE SKILLS & COMBOS ---
function triggerSkill(slot) {
    // Skills unlock checking
    if (slot === 'q' && state.classes.dwarf < 1) return;
    if (slot === 'w' && state.classes.goblin < 1) return;
    if (slot === 'e' && state.classes.sage < 1) return;

    if (state.skills.activeSkills[slot] > 0 || state.skills.cooldowns[slot] > 0) return;

    if (slot === 'q') {
        state.skills.activeSkills.q = 10.0;
        state.skills.cooldowns.q = 30.0;
        writeLog(`🔥 Активка 'Demolish' активирована! Сила удара x2.`, "log-skill");
    } else if (slot === 'w') {
        state.skills.activeSkills.w = 10.0;
        state.skills.cooldowns.w = 40.0;
        writeLog(`🛡️ Активка 'Overclock' активирована! DPS героев x3.`, "log-skill");
    } else if (slot === 'e') {
        state.skills.activeSkills.e = 8.0;
        state.skills.cooldowns.e = 45.0;
        writeLog(`🔮 Активка 'Focus' активирована! Шанс критического удара 100%.`, "log-skill");
    }

    checkUltimateCombo();
    playBoostSound();
    updateUI();
    saveGame();
}

function checkUltimateCombo() {
    if (state.skills.activeSkills.q > 0 &&
        state.skills.activeSkills.w > 0 &&
        state.skills.activeSkills.e > 0) {
        
        if ((state.skills.activeSkills.ultimate || 0) <= 0) {
            state.skills.activeSkills.ultimate = 5.0;
            writeLog("🌌 СИНЕРГИЯ КОМБО: АБСОЛЮТНЫЙ БУР АКТИВИРОВАН! (+500% урона)", "log-ultimate");
            playLevelUpSound();
        }
    }
}

// --- LEVELING ENGINE ---
function gainXp(amount, suppressUI = false) {
    state.xp += amount;
    state.totalXp += amount;
    let leveled = false;
    while (state.xp >= state.xpNeeded) {
        levelUp();
        leveled = true;
    }
    if (!suppressUI || leveled) updateUI();
}

function levelUp() {
    state.level++;
    state.xp -= state.xpNeeded;
    state.xpNeeded = Math.round(100 * Math.pow(state.level, 1.6));
    
    const rewardGold = state.level * 150;
    state.gold += rewardGold;
    
    playLevelUpSound();
    showLevelUpModal(state.level, getTitleRu(state.level), rewardGold);
    writeLog(`🎉 Уровень игрока повышен! Достигнут уровень ${state.level}!`, "log-system");
}

function romanize(num) {
    const lookup = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return lookup[num] || num;
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

// --- CRAFTING MODULE ---
function craftItem(type) {
    let cost = 0;
    let rank = state.equipment[type];
    
    if (type === 'weapon') cost = rank * 500;
    else if (type === 'helmet') cost = rank * 300;
    else if (type === 'armor') cost = rank * 400;
    else if (type === 'ring') cost = rank * 600;

    const actualCost = Math.round(cost * Math.max(0.5, 1 - (state.classes.goblin * 0.015)));

    if (state.gold >= actualCost) {
        state.gold -= actualCost;
        if (type === 'ring') {
            state.equipment.accessory++;
        } else {
            state.equipment[type]++;
        }
        
        playCoinSound();
        showToast(`Успешно сковано снаряжение в кузне!`);
        writeLog(`🔨 Кузня: выковали улучшение для слота ${type}!`, "log-system");
        
        if (type === 'weapon') {
            buildWeaponMesh(); // Visual weapon upgrade in 3D scene!
        }
        
        updateUI();
        saveGame();
    } else {
        showToast("Недостаточно золота для ковки!", true);
    }
}
window.craftItem = craftItem;

// --- GUILD VAULT DEPOSIT ---
function depositToGuildBank() {
    const depositAmt = 500;
    if (state.gold >= depositAmt) {
        state.gold -= depositAmt;
        state.guildBankDeposits += depositAmt;
        
        // Level up guild per 2000G
        const needed = state.guildLevel * 2000;
        if (state.guildBankDeposits >= needed) {
            state.guildLevel++;
            state.guildBuffPct = state.guildLevel * 5; // +5% DPS per rank
            writeLog(`👑 Гильдия повысила свой ранг до уровня ${state.guildLevel}! Разблокирован бафф +${state.guildBuffPct}% DPS.`, "log-ultimate");
            playLevelUpSound();
        } else {
            writeLog(`💰 Вы внесли 500 Gold в хранилище гильдии!`, "log-system");
        }
        
        playCoinSound();
        updateUI();
        saveGame();
    } else {
        showToast("Недостаточно золота для взноса!", true);
    }
}
window.depositToGuildBank = depositToGuildBank;

// --- AUTO EXPEDITIONS RAIDS ---
function startExpedition(id) {
    const exp = state.expeditions.find(e => e.id === id);
    if (!exp || exp.active) return;
    
    const idle = getIdleMiners();
    if (idle < exp.requiredMiners) {
        showToast("Недостаточно свободных героев!", true);
        return;
    }
    
    exp.active = true;
    const speedReduction = Math.max(0.5, 1 - (state.classes.sage * 0.02));
    exp.endTime = Date.now() + (exp.duration * speedReduction);
    
    writeLog(`⚔️ Герои отправлены в рейд: "${exp.name}"!`, "log-system");
    updateUI();
    saveGame();
}
window.startExpedition = startExpedition;

function claimExpedition(id) {
    const exp = state.expeditions.find(e => e.id === id);
    if (!exp || !exp.active || Date.now() < exp.endTime) return;
    
    state.gold += exp.rewardGold;
    let resultsMsg = `Рейд завершен: +${exp.rewardGold.toLocaleString()} Золота`;
    let logMsg = `⚔️ Рейд "${exp.name}" успешно закрыт! Награда: +${exp.rewardGold.toLocaleString()} Золота`;
    
    if (exp.rewardDiamondChance > 0 && Math.random() < exp.rewardDiamondChance) {
        state.diamonds += 1;
        resultsMsg += `, +1 Древний Алмаз`;
        logMsg += `, +1 Алмаз`;
    }
    
    if (exp.rewardArtifactChance > 0 && Math.random() < exp.rewardArtifactChance) {
        const unowned = Object.keys(state.artifacts).filter(k => !state.artifacts[k]);
        if (unowned.length > 0) {
            const choice = unowned[Math.floor(Math.random() * unowned.length)];
            state.artifacts[choice] = true;
            resultsMsg += `. Найдена реликвия!`;
            logMsg += `. Найдена древняя реликвия!`;
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

// --- ALTAR PRESTIGE RESET ---
function doPrestige() {
    if (state.level < 20) return;
    if (!confirm("Вы уверены, что хотите запустить глубокое бурение? Все ваше текущее золото, герои и уровни будут сброшены, но вы получите Древние Алмазы!")) return;
    
    const claimable = (state.level - 19) * 2;
    
    saveGame();
    state.diamonds += claimable;
    state.prestigeCount++;
    state.gold = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 100;
    state.totalXp = 0;
    
    state.classes.dwarf = 1;
    state.classes.goblin = 0;
    state.classes.sage = 0;
    
    state.equipment.weapon = 1;
    state.equipment.helmet = 1;
    state.equipment.armor = 1;
    state.equipment.accessory = 1;
    
    state.vein.health = 0;
    state.vein.tier = 1;
    state.vein.infiniteCycle = 0;
    state.vein.maxHealth = VEIN_TIERS[0].maxHealth;
    
    state.expeditions.forEach(exp => {
        exp.active = false;
        exp.endTime = 0;
    });
    
    saveGame();
    playBoostSound();
    
    // WebGL colors reset
    if (veinMesh) {
        veinMesh.material.color.setHex(VEIN_TIERS[0].color);
        veinMesh.material.emissive.setHex(VEIN_TIERS[0].color);
    }
    buildWeaponMesh();
    
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
        if (btn.getAttribute('data-tab') === 'mineshaft') btn.click();
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

// --- GUILD CLASSES BUY SYSTEM ---
function buyClassUpgrade(classId) {
    const cost = getClassCost(classId);
    if (state.gold >= cost) {
        state.gold -= cost;
        if (classId === 'dwarf') {
            state.classes.dwarf++;
            playCoinSound();
            writeLog(`Дварф-подрывник повышен до уровня ${state.classes.dwarf}!`, "log-system");
        } else if (classId === 'goblin') {
            state.classes.goblin++;
            playCoinSound();
            writeLog(`Гоблин-инженер повышен до уровня ${state.classes.goblin}!`, "log-system");
        } else if (classId === 'sage') {
            state.classes.sage++;
            playCoinSound();
            writeLog(`Кристальный мудрец повышен до уровня ${state.classes.sage}!`, "log-system");
        }
        updateUI();
        saveGame();
    } else {
        showToast("Недостаточно золота!", true);
    }
}

function activateBoost() {
    if (boost.active || boost.cooldownRemaining > 0) return;
    boost.active = true;
    boost.timeRemaining = boost.duration;
    state.totalGoldenRushes++;
    playBoostSound();
    writeLog("⚡ Режим Золотой лихорадки активирован! (x3 урон/скорость на 30с)", "log-fracture");
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
    }
    toast.textContent = message;
    elToastContainer.appendChild(toast);
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

function playBoostSound() {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gainNode.gain.setValueAtTime(0.04, now + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
    });
}

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
        gainNode.gain.setValueAtTime(0.06, now + idx * 0.07);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
    });
}

// --- ACTIVE DRAW GAME LOOPS ---
function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);

    // Frame limiting to preserve battery life on WebView
    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < fpsInterval) return; // Cap at 60 FPS
    
    lastFrameTime = timestamp - (elapsed % fpsInterval);

    if (is2DMode) {
        render2DLoop();
        return;
    }

    // Dynamic resize handler in case layout finished after DOMContentLoaded
    if (renderer && camera && elCanvasContainer) {
        const width = elCanvasContainer.clientWidth;
        const height = elCanvasContainer.clientHeight;
        
        if (width > 0 && height > 0) {
            const canvas = renderer.domElement;
            if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || 
                canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        }
    }

    // Tick active WebGL animations
    if (veinMesh) {
        veinMesh.rotation.y += 0.008;
    }

    // 1. Move Player by virtual joystick vectors
    const playerSpeed = 0.08;
    if (joystickActive && (joystickVector.x !== 0 || joystickVector.y !== 0)) {
        // Character angles relative to camera yaw
        let moveAngle = Math.atan2(joystickVector.x, joystickVector.y) + cameraYaw;
        
        playerGroup.position.x += Math.sin(moveAngle) * playerSpeed;
        playerGroup.position.z += Math.cos(moveAngle) * playerSpeed;

        // Force inside dungeon boundary
        const boundary = 18;
        playerGroup.position.x = Math.max(-boundary, Math.min(boundary, playerGroup.position.x));
        playerGroup.position.z = Math.max(-boundary, Math.min(boundary, playerGroup.position.z));

        // Rotate character body facing move vector
        playerGroup.rotation.y = moveAngle;
    }

    // 2. FSM AI Companions Logic
    updateCompanionsAI();

    // 3. Move active enemies toward their aggro targets
    updateEnemiesCombat();

    // 4. Projectiles logic
    updateProjectiles();

    // 5. Update 3D floating particles
    update3DParticles();

    // 6. Camera Position Follow
    if (camera && playerGroup) {
        if (cameraMode === "TPS") {
            // Tactical orbit view behind character
            const distance = 5.0;
            const targetX = playerGroup.position.x - Math.sin(cameraYaw) * distance * Math.cos(cameraPitch);
            const targetZ = playerGroup.position.z - Math.cos(cameraYaw) * distance * Math.cos(cameraPitch);
            const targetY = playerGroup.position.y + distance * Math.sin(-cameraPitch) + 0.8;

            camera.position.x += (targetX - camera.position.x) * 0.15;
            camera.position.z += (targetZ - camera.position.z) * 0.15;
            camera.position.y += (targetY - camera.position.y) * 0.15;
            
            camera.lookAt(playerGroup.position.x, playerGroup.position.y + 0.4, playerGroup.position.z);
        } else {
            // First-person view attached to character head
            camera.position.set(
                playerGroup.position.x,
                playerGroup.position.y + 0.6,
                playerGroup.position.z
            );
            
            // Camera look direction
            const lookTarget = new THREE.Vector3(
                camera.position.x + Math.sin(cameraYaw) * Math.cos(cameraPitch),
                camera.position.y + Math.sin(cameraPitch),
                camera.position.z + Math.cos(cameraYaw) * Math.cos(cameraPitch)
            );
            camera.lookAt(lookTarget);
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// AI Companion Finite State Machine (FSM)
function updateCompanionsAI() {
    const time = Date.now() * 0.003;
    const speed = 0.05;

    // Dwarf (Warrior / Tank) - Aggro drawer
    if (state.classes.dwarf > 0 && comp1Group) {
        let stateText = "IDLE";
        let targetPos = new THREE.Vector3(0, 0, 0); // central vein
        
        // FSM states: fight spawned monsters first, else hit vein
        if (combatState.enemies.length > 0) {
            stateText = "COMBAT";
            targetPos.copy(combatState.enemies[0].mesh.position);
        } else {
            stateText = "MINING";
            targetPos.set(0, -0.2, 1.8); // Position near vein
        }

        moveCompanionTo(comp1Group, targetPos, speed);
        
        // Taunt logic (Forces monster target to Warrior)
        if (stateText === "COMBAT" && Math.random() < 0.01) {
            combatState.enemies.forEach(mob => {
                mob.target = comp1Group;
            });
            writeLog("🛡️ Дварф применил 'Провокацию'! Все монстры агрятся на танка.", "log-skill");
        }

        // Auto Attack swing animation
        if (comp1Group.position.distanceTo(targetPos) <= 2.2) {
            comp1Group.children[2].rotation.x = Math.sin(time * 6) * 0.8;
            dealPassiveCompanionDmg();
        } else {
            comp1Group.children[2].rotation.x = Math.PI / 2;
        }
    }

    // Sage (Priest / Healer) - Heal drawer
    if (state.classes.sage > 0 && comp2Group) {
        let stateText = "MINING";
        let targetPos = new THREE.Vector3(-1.8, -0.2, 0);
        
        // FSM state check: heal wounded companions
        let healTarget = null;
        let lowestHP = 1000;
        
        // Check player
        if (combatState.player.hp < combatState.player.maxHp * 0.7 && combatState.player.hp < lowestHP) {
            healTarget = { type: 'player', group: playerGroup, obj: combatState.player };
            lowestHP = combatState.player.hp;
        }
        // Check warrior
        if (state.classes.dwarf > 0 && combatState.comp1.hp < combatState.comp1.maxHp * 0.7 && combatState.comp1.hp < lowestHP) {
            healTarget = { type: 'comp1', group: comp1Group, obj: combatState.comp1 };
            lowestHP = combatState.comp1.hp;
        }
        
        if (healTarget && combatState.comp2.mp >= 20) {
            stateText = "HEALING";
            targetPos.copy(healTarget.group.position);
            
            // Cast heal
            if (comp2Group.position.distanceTo(targetPos) <= 5.0 && Math.random() < 0.02) {
                combatState.comp2.mp -= 20;
                healTarget.obj.hp = Math.min(healTarget.obj.maxHp, healTarget.obj.hp + 50);
                
                spawnHealVisual(healTarget.group.position);
                writeLog(`💚 Жрец применил 'Малое исцеление' на союзника! Восстановлено +50 HP.`, "log-skill");
            }
        }

        moveCompanionTo(comp2Group, targetPos, speed);
        
        if (stateText === "MINING" && comp2Group.position.distanceTo(targetPos) <= 2.2) {
            comp2Group.children[2].rotation.x = Math.sin(time * 4) * 0.8;
            dealPassiveCompanionDmg();
        }
    }

    // Goblin (Rogue / DPS) - Dagger burst
    if (state.classes.goblin > 0 && comp3Group) {
        let targetPos = new THREE.Vector3(1.8, -0.2, 0);
        if (combatState.enemies.length > 0) {
            targetPos.copy(combatState.enemies[0].mesh.position);
        }

        moveCompanionTo(comp3Group, targetPos, speed * 1.3); // Rogue runs faster

        if (comp3Group.position.distanceTo(targetPos) <= 2.2) {
            comp3Group.children[2].rotation.x = Math.sin(time * 8) * 0.9;
            dealPassiveCompanionDmg();
        }
    }
}

function moveCompanionTo(group, targetPos, speed) {
    const dir = new THREE.Vector3().subVectors(targetPos, group.position);
    dir.y = 0; // lock height
    const dist = dir.length();
    
    if (dist > 2.0) {
        dir.normalize();
        group.position.addScaledVector(dir, speed);
        
        // Rotate companion body facing movement direction
        const angle = Math.atan2(dir.x, dir.z);
        group.rotation.y = angle;
    }
}

function dealPassiveCompanionDmg() {
    // Companion DPS is tick calculated inside the 10 FPS gameLoop to prevent lag,
    // so this is just the animation controller triggers.
}

function updateEnemiesCombat() {
    combatState.enemies.forEach(mob => {
        const targetGroup = mob.target;
        const dist = mob.mesh.position.distanceTo(targetGroup.position);
        
        if (dist > 1.8) {
            const dir = new THREE.Vector3().subVectors(targetGroup.position, mob.mesh.position);
            dir.y = 0;
            dir.normalize();
            mob.mesh.position.addScaledVector(dir, mob.speed);
        } else {
            // Deal damage to companion / player target
            if (Math.random() < 0.05) {
                let targetObj = null;
                if (targetGroup === playerGroup) targetObj = combatState.player;
                else if (targetGroup === comp1Group) targetObj = combatState.comp1;
                else if (targetGroup === comp2Group) targetObj = combatState.comp2;
                else if (targetGroup === comp3Group) targetObj = combatState.comp3;

                if (targetObj) {
                    // Armor defense mitigation
                    const defense = (targetGroup === playerGroup) ? (state.equipment.armor * 0.05) : 0.1;
                    const dmg = Math.max(1, Math.round(10 * state.level * (1 - defense)));
                    
                    targetObj.hp = Math.max(0, targetObj.hp - dmg);
                    writeLog(`💥 Монстр нанес -${dmg} урона вашему отряду!`, "log-crit");
                    
                    // Shake camera if player hit
                    if (targetGroup === playerGroup) {
                        cameraYaw += (Math.random() - 0.5) * 0.05;
                    }
                }
            }
        }
    });
}

function updateProjectiles() {
    // Projectiles logic: moves arrows or spells in 3D
}

function update3DParticles() {
    for (let i = particles3D.length - 1; i >= 0; i--) {
        const p = particles3D[i];
        p.mesh.position.addScaledVector(p.velocity, 0.016);
        p.velocity.y -= 9.8 * 0.016; // gravity
        p.life -= p.decay;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles3D.splice(i, 1);
        }
    }
}

function spawnHealVisual(targetPos) {
    // Float glowing green particles up
    for(let i=0; i<8; i++){
        const pGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        
        pMesh.position.copy(targetPos);
        pMesh.position.x += (Math.random() - 0.5) * 0.6;
        pMesh.position.z += (Math.random() - 0.5) * 0.6;
        scene.add(pMesh);

        particles3D.push({
            mesh: pMesh,
            velocity: new THREE.Vector3(0, Math.random() * 2 + 1, 0),
            life: 1.0,
            decay: 0.05
        });
    }
}

// --- MECHANICAL GAME LOOP (10 FPS) ---
function gameLoop() {
    // 1. Passive gold generation from companion heroes DPS
    const activeGps = getActiveGps();
    if (activeGps > 0) {
        const multiplier = boost.active ? boost.multiplier : 1;
        const passiveEarned = (activeGps * multiplier) / 10;
        
        state.gold += passiveEarned;
        damageVein(passiveEarned);
        gainXp(passiveEarned, true);
    }

    // 2. Spawn monster periodic waves (every 25 seconds)
    if (Math.random() < 0.04 && combatState.enemies.length < 3) {
        spawnMonster();
    }

    // 3. Companion mana regeneration
    if (combatState.comp2.mp < combatState.comp2.maxMp) {
        combatState.comp2.mp = Math.min(combatState.comp2.maxMp, combatState.comp2.mp + 2);
    }
    if (combatState.player.mp < combatState.player.maxMp) {
        combatState.player.mp = Math.min(combatState.player.maxMp, combatState.player.mp + 1);
    }

    // 4. Boost timers
    if (boost.active) {
        boost.timeRemaining -= 0.1;
        if (boost.timeRemaining <= 0) {
            boost.active = false;
            boost.cooldownRemaining = boost.cooldownDuration;
            elBoostBanner.classList.remove('active');
            writeLog("Золотая лихорадка завершена.", "log-system");
        }
    } else if (boost.cooldownRemaining > 0) {
        boost.cooldownRemaining -= 0.1;
        if (boost.cooldownRemaining <= 0) {
            boost.cooldownRemaining = 0;
            elBoostBtn.disabled = false;
        }
    }

    // 5. Active skills countdown ticks
    const skills = ['q', 'w', 'e'];
    skills.forEach(s => {
        if (state.skills.cooldowns[s] > 0) {
            state.skills.cooldowns[s] = Math.max(0, state.skills.cooldowns[s] - 0.1);
        }
        if (state.skills.activeSkills[s] > 0) {
            state.skills.activeSkills[s] = Math.max(0, state.skills.activeSkills[s] - 0.1);
        }
    });

    if ((state.skills.activeSkills.ultimate || 0) > 0) {
        state.skills.activeSkills.ultimate = Math.max(0, state.skills.activeSkills.ultimate - 0.1);
    }

    // 6. Ticking expeditions
    updateExpeditionTimers();
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
                    const speedReduction = Math.max(0.5, 1 - (state.classes.sage * 0.02));
                    const actualDur = exp.duration * speedReduction;
                    const pct = ((actualDur - remaining) / actualDur) * 100;
                    cardBarFill.style.width = `${pct}%`;
                }
            }
        }
    });
}

// --- UI REPAINT SYSTEMS ---
function updateUI() {
    updateUINumbersOnly();
    
    // Core Vein details
    const tierConfig = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)];
    const healthMultiplier = Math.pow(10, state.vein.infiniteCycle || 0);
    const calculatedMaxHealth = tierConfig.maxHealth * healthMultiplier;
    
    state.vein.maxHealth = calculatedMaxHealth;
    elVeinName.textContent = tierConfig.name;
    elVeinTierText.textContent = `Tier ${romanize(state.vein.tier)}`;
    
    // Recruited Companion cards upgrade costs
    const dwarfCostVal = getClassCost('dwarf');
    elDwarfLvl.textContent = `Lvl ${state.classes.dwarf}`;
    elDwarfCost.textContent = dwarfCostVal.toLocaleString();
    elDwarfBenefitCurr.textContent = `+${200 + (state.classes.dwarf - 1) * 50} HP`;
    elDwarfBenefitNext.textContent = `+${200 + state.classes.dwarf * 50} HP`;
    
    const goblinCostVal = getClassCost('goblin');
    elGoblinLvl.textContent = `${state.classes.goblin} Hired`;
    elGoblinCost.textContent = goblinCostVal.toLocaleString();
    elGoblinBenefitCurr.textContent = `+${state.classes.goblin * 5} DPS`;
    elGoblinBenefitNext.textContent = `+${(state.classes.goblin + 1) * 5} DPS`;
    
    const sageCostVal = getClassCost('sage');
    elSageLvl.textContent = `${state.classes.sage} Hired`;
    elSageCost.textContent = sageCostVal.toLocaleString();
    elSageBenefitCurr.textContent = `+${state.classes.sage * 3} DPS`;
    elSageBenefitNext.textContent = `+${(state.classes.sage + 1) * 3} DPS`;
    
    // Level Badge & Title
    elHudLevelBadge.textContent = `Lvl ${state.level}`;
    elHudLevelTitle.textContent = getTitleRu(state.level);
    
    // Repaint Equipment lists
    updateEquipmentUI();

    // Re-render other subpanels
    updateAchievements();
    updateExpeditionsUI();
    checkPrestigeStatus();
    updateGuildUI();
}

function updateUINumbersOnly() {
    // Current Gold
    elGoldAmount.textContent = Math.floor(state.gold).toLocaleString();
    
    // Current Vein Health values
    const pct = (state.vein.health / state.vein.maxHealth) * 100;
    elHealthBarFill.style.width = `${Math.min(100, pct)}%`;
    elHealthText.textContent = `${Math.floor(state.vein.health).toLocaleString()} / ${state.vein.maxHealth.toLocaleString()} HP (${Math.floor(pct)}%)`;
    
    // Stats Dashboard updates
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
    elMinersCountDisplay.textContent = `${getIdleMiners()} / ${state.classes.goblin}`;
    elCritChanceDisplay.textContent = `${Math.round(getCritChance() * 100)}%`;
    elFracturesCountDisplay.textContent = state.vein.fractures.toLocaleString();
    
    // Disabled/Enabled hero purchases
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

    // Party HUD frames values updating
    updatePartyFramesUI();
}

function updatePartyFramesUI() {
    // 1. Player
    const playerHpFill = document.getElementById('hp-fill-player');
    const playerHpNum = document.getElementById('hp-num-player');
    const playerMpFill = document.getElementById('mp-fill-player');
    const playerMpNum = document.getElementById('mp-num-player');

    const maxHp = 100 + (state.equipment.helmet - 1) * 150;
    combatState.player.maxHp = maxHp;
    if (combatState.player.hp > maxHp) combatState.player.hp = maxHp;

    const hpPct = (combatState.player.hp / maxHp) * 100;
    playerHpFill.style.width = `${hpPct}%`;
    playerHpNum.textContent = `${combatState.player.hp}/${maxHp}`;

    const mpPct = (combatState.player.mp / combatState.player.maxMp) * 100;
    playerMpFill.style.width = `${mpPct}%`;
    playerMpNum.textContent = `${combatState.player.mp}/${combatState.player.maxMp}`;

    // 2. Dwarf Tank Frame
    const comp1HpFill = document.getElementById('hp-fill-comp1');
    const comp1HpNum = document.getElementById('hp-num-comp1');
    const maxComp1Hp = 250 + (state.classes.dwarf - 1) * 50;
    combatState.comp1.maxHp = maxComp1Hp;
    if (state.classes.dwarf > 0) {
        if (combatState.comp1.hp <= 0 && Math.random() < 0.05) combatState.comp1.hp = maxComp1Hp; // auto revive
        const c1hpPct = (combatState.comp1.hp / maxComp1Hp) * 100;
        comp1HpFill.style.width = `${c1hpPct}%`;
        comp1HpNum.textContent = `${combatState.comp1.hp}/${maxComp1Hp}`;
    } else {
        comp1HpFill.style.width = `0%`;
        comp1HpNum.textContent = `LOCKED`;
    }

    // 3. Sage Priest Frame
    const comp2HpFill = document.getElementById('hp-fill-comp2');
    const comp2HpNum = document.getElementById('hp-num-comp2');
    if (state.classes.sage > 0) {
        if (combatState.comp2.hp <= 0 && Math.random() < 0.05) combatState.comp2.hp = combatState.comp2.maxHp;
        const c2hpPct = (combatState.comp2.hp / combatState.comp2.maxHp) * 100;
        comp2HpFill.style.width = `${c2hpPct}%`;
        comp2HpNum.textContent = `${combatState.comp2.hp}/${combatState.comp2.maxHp}`;
    } else {
        comp2HpFill.style.width = `0%`;
        comp2HpNum.textContent = `LOCKED`;
    }

    // 4. Goblin Rogue Frame
    const comp3HpFill = document.getElementById('hp-fill-comp3');
    const comp3HpNum = document.getElementById('hp-num-comp3');
    if (state.classes.goblin > 0) {
        if (combatState.comp3.hp <= 0 && Math.random() < 0.05) combatState.comp3.hp = combatState.comp3.maxHp;
        const c3hpPct = (combatState.comp3.hp / combatState.comp3.maxHp) * 100;
        comp3HpFill.style.width = `${c3hpPct}%`;
        comp3HpNum.textContent = `${combatState.comp3.hp}/${combatState.comp3.maxHp}`;
    } else {
        comp3HpFill.style.width = `0%`;
        comp3HpNum.textContent = `LOCKED`;
    }
}

function updateEquipmentUI() {
    const W_NAMES = ["Rusty Pickaxe", "Steel Sword", "Mithril Greatsword", "Titan Core Hammer"];
    const H_NAMES = ["Leather Hood", "Iron Helm", "Steel Greathelm", "Templar Crown"];
    const A_NAMES = ["Cloth Tunic", "Ring Mail", "Heavy Plate", "Titan Bulwark"];
    const R_NAMES = ["Copper Ring", "Silver Signet", "Sapphire Ring", "Amulet of Power"];

    const wRank = state.equipment.weapon;
    elEqWeaponName.textContent = W_NAMES[Math.min(W_NAMES.length - 1, wRank - 1)];
    elEqWeaponStat.textContent = `+${(wRank - 1) * 25} Click Attack Damage`;

    const hRank = state.equipment.helmet;
    elEqHelmetName.textContent = H_NAMES[Math.min(H_NAMES.length - 1, hRank - 1)];
    elEqHelmetStat.textContent = `+${(hRank - 1) * 150} Player Max HP`;

    const aRank = state.equipment.armor;
    elEqArmorName.textContent = A_NAMES[Math.min(A_NAMES.length - 1, aRank - 1)];
    elEqArmorStat.textContent = `+${(aRank - 1) * 5}% Damage Reduction`;

    const rRank = state.equipment.accessory;
    elEqAccessoryName.textContent = R_NAMES[Math.min(R_NAMES.length - 1, rRank - 1)];
    elEqAccessoryStat.textContent = `+${(rRank - 1) * 8}% Critical Strike Rate`;

    // Update Crafting cost labels in forge tab
    const discount = Math.max(0.5, 1 - (state.classes.goblin * 0.015));
    document.getElementById('craft-weapon-cost').innerHTML = `<i class="fa-solid fa-coins"></i> ${Math.round(wRank * 500 * discount)} Gold`;
    document.getElementById('craft-helmet-cost').innerHTML = `<i class="fa-solid fa-coins"></i> ${Math.round(hRank * 300 * discount)} Gold`;
    document.getElementById('craft-armor-cost').innerHTML = `<i class="fa-solid fa-coins"></i> ${Math.round(aRank * 400 * discount)} Gold`;
    document.getElementById('craft-ring-cost').innerHTML = `<i class="fa-solid fa-coins"></i> ${Math.round(rRank * 600 * discount)} Gold`;
}

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
                ${allClaimed ? 'Claim' : rewardLabel}
            </button>
        `;
        listContainer.appendChild(card);
    });
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
            writeLog(`Награда за достижение "${ach.name}" получена: +${rewardVal.toLocaleString()} Gold!`, "log-ultimate");
        } else {
            state.diamonds += rewardVal;
            writeLog(`Награда за достижение "${ach.name}" получена: +${rewardVal} Diamonds!`, "log-ultimate");
        }
        
        state.achievements[claimedKey] = claimed + 1;
        playCoinSound();
        showToast("Награда получена!");
        updateUI();
        saveGame();
    }
}
window.claimAchievement = claimAchievement;

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

function updateGuildUI() {
    elGuildLevel.textContent = `Lvl ${state.guildLevel}`;
    elGuildBuff.textContent = `+${state.guildBuffPct}% Gold`;
    elGuildBank.textContent = `${state.guildBankDeposits.toLocaleString()}G`;
}

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

// --- ACTIVE SKILLS TIMERS TICK sweeps ---
function tickSkills() {
    const slots = ['q', 'w', 'e'];
    slots.forEach(s => {
        const btn = document.getElementById(`skill-${s}`);
        const overlay = document.getElementById(`overlay-${s}`);
        if (!btn || !overlay) return;
        
        let unlocked = false;
        if (s === 'q' && state.classes.dwarf >= 1) unlocked = true;
        else if (s === 'w' && state.classes.goblin >= 1) unlocked = true;
        else if (s === 'e' && state.classes.sage >= 1) unlocked = true;
        
        if (!unlocked) {
            btn.disabled = true;
            overlay.style.height = "100%";
            btn.classList.remove('active-buff');
            return;
        }

        const cd = state.skills.cooldowns[s];
        const active = state.skills.activeSkills[s];
        const maxCD = s === 'q' ? 30.0 : (s === 'w' ? 40.0 : 45.0);

        if (active > 0) {
            btn.disabled = true;
            overlay.style.height = "0%";
            btn.classList.add('active-buff');
        } else if (cd > 0) {
            btn.disabled = true;
            overlay.style.height = `${(cd / maxCD) * 100}%`;
            btn.classList.remove('active-buff');
        } else {
            btn.disabled = false;
            overlay.style.height = "0%";
            btn.classList.remove('active-buff');
        }
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
            state = { ...state, ...parsed };
            if (parsed.classes) state.classes = { ...state.classes, ...parsed.classes };
            if (parsed.equipment) state.equipment = { ...state.equipment, ...parsed.equipment };
            if (parsed.artifacts) state.artifacts = { ...state.artifacts, ...parsed.artifacts };
            if (parsed.achievements) state.achievements = { ...state.achievements, ...parsed.achievements };
            
            // Sync UI selected player class active status
            const activeSelect = document.querySelector(`.class-select-btn[data-class="${state.playerClass}"]`);
            if (activeSelect) {
                document.querySelectorAll('.class-select-btn').forEach(b => b.classList.remove('active'));
                activeSelect.classList.add('active');
            }
        }
    } catch (e) {
        console.error("Failed loading saved state", e);
    }
}

// --- SETUP EVENT LISTENERS ---
function setupEventListeners() {
    // Joystick Touch Listeners (Left Side)
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    
    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        joystickActive = true;
        joystickStartX = touch.clientX;
        joystickStartY = touch.clientY;
        joystickVector = { x: 0, y: 0 };
    });

    joystickZone.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        const touch = e.touches[0];
        
        let dx = touch.clientX - joystickStartX;
        let dy = touch.clientY - joystickStartY;
        
        // Cap offset inside joystick base
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxJoystickOffset) {
            dx = (dx / dist) * maxJoystickOffset;
            dy = (dy / dist) * maxJoystickOffset;
        }

        joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
        
        // Normalize vector
        joystickVector.x = dx / maxJoystickOffset;
        joystickVector.y = -dy / maxJoystickOffset; // invert Y for Cartesian coordinates
    });

    joystickZone.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickStick.style.transform = `translate(0px, 0px)`;
        joystickVector = { x: 0, y: 0 };
    });

    // Right-Side Swipe Look/Orbit Camera Touch Handler
    elMineViewport.addEventListener('touchstart', (e) => {
        // Only trigger camera look if drag started on the right side of the screen
        const rect = elMineViewport.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        
        // Joystick zone is on the left 140px, avoid it
        if (touchX > 140) {
            isDraggingCamera = true;
            previousTouchX = e.touches[0].clientX;
            previousTouchY = e.touches[0].clientY;
        }
    });

    elMineViewport.addEventListener('touchmove', (e) => {
        if (!isDraggingCamera) return;
        const currentTouchX = e.touches[0].clientX;
        const currentTouchY = e.touches[0].clientY;

        const deltaX = currentTouchX - previousTouchX;
        const deltaY = currentTouchY - previousTouchY;

        // Scale camera rotations
        const rotationSpeed = 0.005;
        cameraYaw += deltaX * rotationSpeed;
        cameraPitch = Math.max(-1.4, Math.min(0.2, cameraPitch + deltaY * rotationSpeed)); // Caps pitch

        previousTouchX = currentTouchX;
        previousTouchY = currentTouchY;
    });

    elMineViewport.addEventListener('touchend', (e) => {
        isDraggingCamera = false;
    });

    // Basic Actions Click
    document.getElementById('btn-attack').addEventListener('click', performAttack);
    elBoostBtn.addEventListener('click', activateBoost);
    elAudioToggle.addEventListener('click', toggleAudio);
    elResetGameBtn.addEventListener('click', resetGame);
    elModalClaimBtn.addEventListener('click', hideLevelUpModal);

    // Camera Mode Toggle
    document.getElementById('camera-toggle-btn').addEventListener('click', () => {
        cameraMode = cameraMode === "TPS" ? "FPS" : "TPS";
        document.getElementById('camera-mode-text').textContent = cameraMode;
        
        // Hide player mesh geometry when in First-Person Mode
        if (playerGroup) {
            playerGroup.children[0].visible = (cameraMode === "TPS"); // Hide Body cylinder
            playerGroup.children[1].visible = (cameraMode === "TPS"); // Hide Helm box
        }
        
        writeLog(`Камера переключена в режим: ${cameraMode === "TPS" ? "Вид от 3-го лица" : "Вид из глаз (1-ое лицо)"}`, "log-system");
        playCoinSound();
    });

    // Hero companion upgrade buy buttons
    elBuyDwarf.addEventListener('click', () => buyClassUpgrade('dwarf'));
    elBuyGoblin.addEventListener('click', () => buyClassUpgrade('goblin'));
    elBuySage.addEventListener('click', () => buyClassUpgrade('sage'));

    // Altar upgrade buttons
    document.getElementById('prestige-trigger-btn').addEventListener('click', doPrestige);
    document.getElementById('buy-altar-might').addEventListener('click', buyAltarMight);
    document.getElementById('buy-altar-overclock').addEventListener('click', buyAltarOverclock);
    document.getElementById('buy-altar-critical').addEventListener('click', buyAltarCritical);

    // Skill Hotkey click triggers
    document.getElementById('skill-q').addEventListener('click', () => triggerSkill('q'));
    document.getElementById('skill-w').addEventListener('click', () => triggerSkill('w'));
    document.getElementById('skill-e').addEventListener('click', () => triggerSkill('e'));

    // Keyboard bindings (Q, W, E for skills, Space for Attack, C for camera)
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'q') triggerSkill('q');
        else if (key === 'w') triggerSkill('w');
        else if (key === 'e') triggerSkill('e');
        else if (key === ' ') {
            e.preventDefault();
            performAttack();
        } else if (key === 'c') {
            document.getElementById('camera-toggle-btn').click();
        }
    });

    // Player Class Selector Click handler
    document.querySelectorAll('.class-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.getAttribute('data-class');
            state.playerClass = role;
            
            document.querySelectorAll('.class-select-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Rename party name
            document.getElementById('name-player').textContent = `You (${role.toUpperCase()})`;
            
            playCoinSound();
            writeLog(`Вы сменили ваш активный класс на: ${role.toUpperCase()}`, "log-system");
            
            saveGame();
            updateUI();
        });
    });

    setupTabs();
}

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
            if (content) content.classList.add('active');
            
            playCoinSound();
        });
    });
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

function resetGame() {
    if (confirm("Вы действительно хотите полностью сбросить прогресс? Все ваши классы, золото, алмазы и достижения будут безвозвратно удалены!")) {
        localStorage.removeItem('gold_miner_clicker_save');
        location.reload(); // Reload page to reset WebGL container objects cleanly
    }
}

// --- 2D CANVAS FALLBACK SCENE ENGINES ---
let ctx2D = null;

function init2DFallbackScene() {
    is2DMode = true;
    elCanvasContainer = document.getElementById('3d-canvas-container');
    if (!elCanvasContainer) return;
    
    elCanvasContainer.innerHTML = ''; // Clear WebGL remnants
    const canvas2D = document.createElement('canvas');
    canvas2D.width = elCanvasContainer.clientWidth || 300;
    canvas2D.height = elCanvasContainer.clientHeight || 300;
    canvas2D.style.width = '100%';
    canvas2D.style.height = '100%';
    canvas2D.style.position = 'absolute';
    canvas2D.style.top = '0';
    canvas2D.style.left = '0';
    elCanvasContainer.appendChild(canvas2D);
    ctx2D = canvas2D.getContext('2d');
    
    window.addEventListener('resize', () => {
        if (canvas2D && elCanvasContainer) {
            canvas2D.width = elCanvasContainer.clientWidth || 300;
            canvas2D.height = elCanvasContainer.clientHeight || 300;
        }
    });
}

function render2DLoop() {
    if (!ctx2D) return;
    const canvas = ctx2D.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear background
    ctx2D.fillStyle = '#0f0d13';
    ctx2D.fillRect(0, 0, w, h);
    
    // Draw simple grid background
    ctx2D.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx2D.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x < w; x += gridSize) {
        ctx2D.beginPath(); ctx2D.moveTo(x, 0); ctx2D.lineTo(x, h); ctx2D.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
        ctx2D.beginPath(); ctx2D.moveTo(0, y); ctx2D.lineTo(w, y); ctx2D.stroke();
    }
    
    const scale = w / 42; // Coordinates mapping scale (-18..18 boundaries)
    const centerX = w / 2;
    const centerY = h / 2;
    
    // 1. Draw central core vein lode
    const tierConfig = VEIN_TIERS[Math.min(VEIN_TIERS.length - 1, state.vein.tier - 1)];
    const veinColorHex = '#' + tierConfig.color.toString(16).padStart(6, '0');
    
    ctx2D.save();
    ctx2D.translate(centerX, centerY);
    
    // Core Vein shake if damaged/cracking
    const hpPct = state.vein.health / state.vein.maxHealth;
    if (hpPct >= 0.8) {
        ctx2D.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    }
    
    // Emissive glowing radial gradient
    const grad = ctx2D.createRadialGradient(0, 0, 8, 0, 0, 42);
    grad.addColorStop(0, veinColorHex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2D.fillStyle = grad;
    ctx2D.beginPath(); ctx2D.arc(0, 0, 42, 0, Math.PI * 2); ctx2D.fill();
    
    // Gemstone center core
    ctx2D.fillStyle = veinColorHex;
    ctx2D.beginPath(); ctx2D.arc(0, 0, 26, 0, Math.PI * 2); ctx2D.fill();
    ctx2D.strokeStyle = '#ffffff';
    ctx2D.lineWidth = 2;
    ctx2D.stroke();
    
    // Draw crack overlay lines
    if (hpPct > 0) {
        ctx2D.strokeStyle = 'rgba(0, 0, 0, ' + Math.min(0.95, hpPct) + ')';
        ctx2D.lineWidth = 2.5;
        ctx2D.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const length = 10 + hpPct * 16;
            ctx2D.moveTo(0, 0);
            ctx2D.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
        }
        ctx2D.stroke();
    }
    ctx2D.restore();
    
    // 2. Draw Player Dot
    const pX = centerX + playerGroup.position.x * scale;
    const pY = centerY + playerGroup.position.z * scale;
    ctx2D.fillStyle = '#007aff';
    ctx2D.beginPath(); ctx2D.arc(pX, pY, 11, 0, Math.PI * 2); ctx2D.fill();
    ctx2D.strokeStyle = '#ffffff'; ctx2D.lineWidth = 1.5; ctx2D.stroke();
    
    ctx2D.fillStyle = '#ffffff';
    ctx2D.font = 'bold 8px Courier New';
    ctx2D.textAlign = 'center';
    ctx2D.fillText(`YOU (${state.playerClass.toUpperCase()})`, pX, pY - 14);
    
    // 3. Draw Party AI companions
    if (state.classes.dwarf > 0 && comp1Group) {
        const c1X = centerX + comp1Group.position.x * scale;
        const c1Y = centerY + comp1Group.position.z * scale;
        ctx2D.fillStyle = '#ff9500'; // Tank
        ctx2D.beginPath(); ctx2D.arc(c1X, c1Y, 9, 0, Math.PI * 2); ctx2D.fill();
        ctx2D.strokeStyle = '#ffffff'; ctx2D.lineWidth = 1; ctx2D.stroke();
        ctx2D.fillStyle = '#ff9500'; ctx2D.font = '7px Courier New'; ctx2D.fillText('TANK', c1X, c1Y - 12);
    }
    if (state.classes.sage > 0 && comp2Group) {
        const c2X = centerX + comp2Group.position.x * scale;
        const c2Y = centerY + comp2Group.position.z * scale;
        ctx2D.fillStyle = '#00f0ff'; // Healer
        ctx2D.beginPath(); ctx2D.arc(c2X, c2Y, 9, 0, Math.PI * 2); ctx2D.fill();
        ctx2D.strokeStyle = '#ffffff'; ctx2D.lineWidth = 1; ctx2D.stroke();
        ctx2D.fillStyle = '#00f0ff'; ctx2D.font = '7px Courier New'; ctx2D.fillText('HEALER', c2X, c2Y - 12);
    }
    if (state.classes.goblin > 0 && comp3Group) {
        const c3X = centerX + comp3Group.position.x * scale;
        const c3Y = centerY + comp3Group.position.z * scale;
        ctx2D.fillStyle = '#32cd32'; // Rogue
        ctx2D.beginPath(); ctx2D.arc(c3X, c3Y, 9, 0, Math.PI * 2); ctx2D.fill();
        ctx2D.strokeStyle = '#ffffff'; ctx2D.lineWidth = 1; ctx2D.stroke();
        ctx2D.fillStyle = '#32cd32'; ctx2D.font = '7px Courier New'; ctx2D.fillText('ROGUE', c3X, c3Y - 12);
    }
    
    // 4. Draw Spawned Dungeon Monsters
    combatState.enemies.forEach(mob => {
        const mX = centerX + mob.mesh.position.x * scale;
        const mY = centerY + mob.mesh.position.z * scale;
        ctx2D.fillStyle = '#ff3b30'; // Red Monster box
        ctx2D.fillRect(mX - 7, mY - 7, 14, 14);
        ctx2D.strokeStyle = '#ffffff'; ctx2D.lineWidth = 1; ctx2D.strokeRect(mX - 7, mY - 7, 14, 14);
        
        // Draw health bars above spider
        ctx2D.fillStyle = 'rgba(0,0,0,0.6)';
        ctx2D.fillRect(mX - 9, mY - 12, 18, 3);
        ctx2D.fillStyle = '#ff3b30';
        ctx2D.fillRect(mX - 9, mY - 12, (mob.hp / mob.maxHp) * 18, 3);
    });
}
