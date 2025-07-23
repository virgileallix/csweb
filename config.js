// Configuration globale du jeu
const CONFIG = {
    // Paramètres du joueur
    PLAYER: {
        SPEED: 0.12,
        SPRINT_MULTIPLIER: 1.5,
        JUMP_HEIGHT: 0.3,
        HEIGHT: 1.6,
        MAX_HEALTH: 100,
        MAX_ARMOR: 100
    },

    // Configuration des armes
    WEAPONS: {
        ak47: {
            name: 'AK-47',
            damage: { 
                head: 143, 
                chest: 36, 
                stomach: 45, 
                legs: 27 
            },
            ammo: 30,
            reserveAmmo: 90,
            fireRate: 600, // Coups par minute
            accuracy: 0.85,
            recoil: 0.15,
            bulletSpeed: 80,
            soundVolume: 0.8
        },
        glock: {
            name: 'Glock-18',
            damage: { 
                head: 105, 
                chest: 28, 
                stomach: 35, 
                legs: 21 
            },
            ammo: 20,
            reserveAmmo: 120,
            fireRate: 400,
            accuracy: 0.92,
            recoil: 0.08,
            bulletSpeed: 60,
            soundVolume: 0.6
        }
    },

    // Paramètres des ennemis
    ENEMY: {
        HEALTH: 100,
        SPEED: 0.08,
        CHASE_SPEED: 0.12,
        DETECTION_RANGE: 20,
        ATTACK_RANGE: 12,
        ACCURACY: 0.25,
        FIRE_RATE: 1200, // ms entre les tirs
        DAMAGE_RANGE: [15, 35]
    },

    // Paramètres de la carte
    MAP: {
        SIZE: 50,
        WALL_HEIGHT: 4,
        BOX_HEIGHT: 2
    },

    // Paramètres de jeu
    GAME: {
        INITIAL_TIME: 180, // 3 minutes pour le mode solo
        ROUND_TIME: 115, // 1:55 pour le mode multijoueur
        ENEMY_COUNT: 5,
        GRAVITY: -0.02,
        MODE: 'classic', // classic, bomb_defusal
        MAX_ROUNDS: 30, // Pour le mode multijoueur
        BOMB_TIMER: 40, // Temps avant explosion de la bombe
        PLANT_TIME: 4, // Temps pour planter
        DEFUSE_TIME: 10 // Temps pour désamorcer (5 avec kit)
    },

    // Multiplicateurs de dégâts par zone
    DAMAGE_MULTIPLIERS: {
        head: 4.0,
        chest: 1.0,
        stomach: 1.25,
        legs: 0.75
    },

    // Couleurs
    COLORS: {
        PLAYER: 0x0066ff,
        ENEMY: 0xff4444,
        ENEMY_HEAD: 0xffcccc,
        BULLET: 0xffff00,
        WALL: 0xD2B48C,
        GROUND: 0x8B4513,
        BOX: 0x654321,
        SKY: 0x87CEEB
    }
};

// Variables globales du jeu
let scene, camera, renderer;
let player, enemies = [];
let bullets = [];
let obstacles = [];
let gameRunning = false;
let gameTime = CONFIG.GAME.INITIAL_TIME;
let keys = {};
let mouseX = 0, mouseY = 0;
let lastFrameTime = 0;

// État du jeu
const gameState = {
    score: 0,
    kills: 0,
    accuracy: 0,
    shotsFired: 0,
    shotsHit: 0
};

// Sons (simulés avec des effets visuels pour l'instant)
const SOUNDS = {
    shoot: () => {
        // Effet de flash du canon
        const flash = document.createElement('div');
        flash.className = 'muzzle-flash active';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);
    },
    
    hit: () => {
        // Effet de sang
        const blood = document.createElement('div');
        blood.className = 'blood-splatter';
        blood.style.left = Math.random() * window.innerWidth + 'px';
        blood.style.top = Math.random() * window.innerHeight + 'px';
        document.body.appendChild(blood);
        setTimeout(() => blood.remove(), 500);
    },
    
    reload: () => {
        // Indicateur de rechargement
        const reloadIndicator = document.createElement('div');
        reloadIndicator.className = 'reloading';
        reloadIndicator.textContent = 'RECHARGEMENT...';
        document.body.appendChild(reloadIndicator);
        setTimeout(() => reloadIndicator.remove(), 2000);
    }
};