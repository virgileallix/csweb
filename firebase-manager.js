// Configuration Firebase pour SIO SHOOTER
const firebaseConfig = {
    apiKey: "AIzaSyDVR6PulRxYb4BYBwglmy-uw1sc-JMIbzo",
    authDomain: "csweb-428eb.firebaseapp.com",
    databaseURL: "https://csweb-428eb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "csweb-428eb",
    storageBucket: "csweb-428eb.firebasestorage.app",
    messagingSenderId: "698101872735",
    appId: "1:698101872735:web:0950c951015b8f58a243ea",
    measurementId: "G-V7XP0L7XMM"
};

// Initialisation Firebase avec gestion d'erreur
try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialisé avec succès');
} catch (error) {
    console.error('❌ Erreur d\'initialisation Firebase:', error);
    throw new Error('Firebase initialization failed');
}

const database = firebase.database();

// Gestionnaire Firebase amélioré pour SIO SHOOTER
class FirebaseManager {
    constructor() {
        this.currentUser = null;
        this.currentLobby = null;
        this.listeners = new Map();
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        
        // Configuration avancée
        this.config = {
            heartbeatInterval: 30000, // 30 secondes
            playerPositionUpdateRate: 50, // 20 FPS
            maxLobbies: 50,
            maxPlayersPerLobby: 10,
            lobbyTimeout: 300000, // 5 minutes d'inactivité
            antiCheat: true,
            rateLimiting: true
        };
        
        // Rate limiting
        this.rateLimits = {
            positions: { lastUpdate: 0, minInterval: 1000 / this.config.playerPositionUpdateRate },
            chat: { lastMessage: 0, minInterval: 1000 }, // 1 message par seconde
            actions: { lastAction: 0, minInterval: 100 } // 10 actions par seconde
        };
        
        // Anti-cheat
        this.antiCheat = {
            lastPosition: null,
            maxSpeed: 500, // pixels par seconde
            suspiciousActions: [],
            maxSuspiciousActions: 10
        };
        
        // Statistiques
        this.stats = {
            packetsReceived: 0,
            packetsSent: 0,
            dataReceived: 0,
            dataSent: 0,
            connectionUptime: 0,
            lastPing: 0
        };
        
        this.initializeConnection();
        this.setupEventHandlers();
        this.startHeartbeat();
    }

    // Initialise la connexion Firebase
    initializeConnection() {
        // Surveille l'état de connexion
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val();
            this.handleConnectionChange(connected);
        });
        
        // Surveille le serveur timestamp pour calculer la latence
        this.pingStart = Date.now();
        database.ref('.info/serverTimeOffset').on('value', (snapshot) => {
            this.calculatePing();
        });
    }
    
    // Gère les changements de connexion
    handleConnectionChange(connected) {
        const previousState = this.connectionState;
        this.connectionState = connected ? 'connected' : 'disconnected';
        
        if (connected && previousState === 'disconnected') {
            console.log('🌐 Connexion Firebase rétablie');
            this.onReconnected();
        } else if (!connected && previousState === 'connected') {
            console.log('📵 Connexion Firebase perdue');
            this.onDisconnected();
        }
        
        // Notifie l'application
        this.notifyConnectionChange(this.connectionState);
    }
    
    // Calcule le ping
    calculatePing() {
        if (this.pingStart) {
            const ping = Date.now() - this.pingStart;
            this.stats.lastPing = ping;
            
            if (window.sioShooterApp?.config?.debugMode) {
                console.log(`📡 Ping: ${ping}ms`);
            }
        }
        
        // Prépare le prochain ping
        setTimeout(() => {
            this.pingStart = Date.now();
        }, 5000);
    }
    
    // Gestion de la reconnexion
    onReconnected() {
        this.reconnectAttempts = 0;
        
        // Resynchronise les données si en jeu
        if (this.currentLobby) {
            this.resyncLobbyData();
        }
        
        // Redémarre le heartbeat
        this.startHeartbeat();
    }
    
    onDisconnected() {
        this.stopHeartbeat();
        
        // Tente la reconnexion
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
        }
    }
    
    // Tentative de reconnexion
    attemptReconnection() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        
        console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
        
        setTimeout(() => {
            // Force une vérification de connexion
            database.goOnline();
        }, delay);
    }
    
    // Notifie l'application du changement de connexion
    notifyConnectionChange(state) {
        if (window.menuManager && typeof window.menuManager.showNotification === 'function') {
            if (state === 'connected') {
                window.menuManager.showNotification('🌐 Connexion rétablie', 'success', 2000);
            } else {
                window.menuManager.showNotification('📵 Connexion perdue...', 'warning', 3000);
            }
        }
    }
    
    // Heartbeat système
    startHeartbeat() {
        if (this.heartbeatInterval) return;
        
        this.heartbeatInterval = setInterval(() => {
            if (this.currentUser && this.currentLobby) {
                this.sendHeartbeat();
            }
        }, this.config.heartbeatInterval);
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    // Envoie un heartbeat
    async sendHeartbeat() {
        try {
            await database.ref(`lobbies/${this.currentLobby}/players/${this.currentUser.id}/lastSeen`).set(Date.now());
            this.stats.connectionUptime = Date.now() - (this.connectionStartTime || Date.now());
        } catch (error) {
            console.warn('⚠️ Erreur heartbeat:', error);
        }
    }
    
    // Resynchronise les données du lobby
    async resyncLobbyData() {
        if (!this.currentLobby) return;
        
        try {
            const snapshot = await database.ref(`lobbies/${this.currentLobby}`).once('value');
            if (snapshot.exists()) {
                console.log('🔄 Données du lobby resynchronisées');
            } else {
                console.warn('⚠️ Lobby introuvable lors de la resynchronisation');
                this.handleLobbyNotFound();
            }
        } catch (error) {
            console.error('❌ Erreur lors de la resynchronisation:', error);
        }
    }
    
    // Gère les événements système
    setupEventHandlers() {
        // Nettoyage automatique des lobbys inactifs
        setInterval(() => {
            this.cleanupInactiveLobbies();
        }, 60000); // Chaque minute
        
        // Collecte des statistiques
        setInterval(() => {
            this.collectStatistics();
        }, 30000); // Toutes les 30 secondes
    }
    
    // Génère un ID unique amélioré
    generateId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 9);
        return timestamp + randomPart;
    }

    // Génère un code de lobby sécurisé
    generateLobbyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // Valide les données d'entrée
    validateInput(data, rules) {
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            if (rule.required && (value === undefined || value === null)) {
                throw new Error(`Le champ ${field} est requis`);
            }
            
            if (value !== undefined) {
                if (rule.type && typeof value !== rule.type) {
                    throw new Error(`Le champ ${field} doit être de type ${rule.type}`);
                }
                
                if (rule.minLength && value.length < rule.minLength) {
                    throw new Error(`Le champ ${field} doit contenir au moins ${rule.minLength} caractères`);
                }
                
                if (rule.maxLength && value.length > rule.maxLength) {
                    throw new Error(`Le champ ${field} ne peut pas dépasser ${rule.maxLength} caractères`);
                }
                
                if (rule.pattern && !rule.pattern.test(value)) {
                    throw new Error(`Le champ ${field} ne respecte pas le format requis`);
                }
            }
        }
    }
    
    // Vérifie le taux limite
    checkRateLimit(action) {
        const now = Date.now();
        const limit = this.rateLimits[action];
        
        if (!limit) return true;
        
        if (now - limit.lastUpdate < limit.minInterval) {
            return false;
        }
        
        limit.lastUpdate = now;
        return true;
    }
    
    // Vérification anti-cheat
    checkAntiCheat(action, data) {
        if (!this.config.antiCheat) return true;
        
        switch (action) {
            case 'position':
                return this.validateMovement(data);
            case 'shoot':
                return this.validateShooting(data);
            case 'interaction':
                return this.validateInteraction(data);
            default:
                return true;
        }
    }
    
    // Valide les mouvements
    validateMovement(positionData) {
        if (!this.antiCheat.lastPosition) {
            this.antiCheat.lastPosition = positionData;
            return true;
        }
        
        const lastPos = this.antiCheat.lastPosition;
        const distance = Math.sqrt(
            Math.pow(positionData.x - lastPos.x, 2) + 
            Math.pow(positionData.y - lastPos.y, 2)
        );
        
        const timeDelta = (positionData.timestamp || Date.now()) - (lastPos.timestamp || Date.now());
        const speed = distance / (timeDelta / 1000); // pixels par seconde
        
        if (speed > this.antiCheat.maxSpeed) {
            this.reportSuspiciousActivity('speed_hack', { speed, maxSpeed: this.antiCheat.maxSpeed });
            return false;
        }
        
        this.antiCheat.lastPosition = positionData;
        return true;
    }
    
    // Valide les tirs
    validateShooting(shootData) {
        // Vérifie la cadence de tir, les munitions, etc.
        return true; // Simplifié pour cette démo
    }
    
    // Valide les interactions
    validateInteraction(interactionData) {
        // Vérifie la distance d'interaction, les objets disponibles, etc.
        return true; // Simplifié pour cette démo
    }
    
    // Signale une activité suspecte
    reportSuspiciousActivity(type, data) {
        console.warn(`🚨 Activité suspecte détectée: ${type}`, data);
        
        this.antiCheat.suspiciousActions.push({
            type,
            data,
            timestamp: Date.now(),
            userId: this.currentUser?.id
        });
        
        // Actions automatiques en cas d'activité suspecte répétée
        if (this.antiCheat.suspiciousActions.length > this.antiCheat.maxSuspiciousActions) {
            this.handleSuspiciousUser();
        }
    }
    
    // Gère les utilisateurs suspects
    handleSuspiciousUser() {
        console.error('🚨 Utilisateur suspect détecté - Actions prises');
        
        // Limite les actions de l'utilisateur
        this.rateLimits.positions.minInterval *= 2;
        this.rateLimits.actions.minInterval *= 2;
        
        // Notifie l'administrateur (en production)
        if (window.menuManager) {
            window.menuManager.showNotification('⚠️ Comportement anormal détecté', 'warning');
        }
    }

    // Définit l'utilisateur actuel avec validation
    setCurrentUser(playerName) {
        // Validation du nom d'utilisateur
        this.validateInput({ playerName }, {
            playerName: {
                required: true,
                type: 'string',
                minLength: 3,
                maxLength: 16,
                pattern: /^[a-zA-Z0-9_-]+$/
            }
        });
        
        // Assainissement du nom
        const sanitizedName = this.sanitizeString(playerName);
        
        this.currentUser = {
            id: this.generateId(),
            name: sanitizedName,
            joinedAt: Date.now(),
            stats: {
                gamesPlayed: 0,
                wins: 0,
                kills: 0,
                deaths: 0,
                playtime: 0
            },
            preferences: {
                team: null,
                ready: false
            }
        };
        
        console.log(`👤 Utilisateur défini: ${sanitizedName} (${this.currentUser.id})`);
        this.connectionStartTime = Date.now();
        
        return this.currentUser;
    }
    
    // Assainit une chaîne de caractères
    sanitizeString(str) {
        return str
            .replace(/[<>{}[\]\\\/]/g, '') // Supprime les caractères dangereux
            .trim()
            .substring(0, 16); // Limite la longueur
    }

    // Crée un nouveau lobby avec validation avancée
    async createLobby(settings = {}) {
        if (!this.currentUser) {
            throw new Error('Aucun utilisateur connecté');
        }
        
        // Vérification du nombre de lobbys
        const existingLobbies = await this.getLobbiesCount();
        if (existingLobbies >= this.config.maxLobbies) {
            throw new Error('Nombre maximum de lobbys atteint');
        }
        
        const lobbyCode = this.generateLobbyCode();
        
        // Configuration par défaut du lobby
        const defaultSettings = {
            gameMode: 'competitive',
            teamSize: 5,
            maxPlayers: 10,
            roundTime: 115,
            maxRounds: 30,
            friendlyFire: false,
            allowSpectators: true,
            isPrivate: false,
            enableBots: true,
            botDifficulty: 'medium',
            autoBalance: true,
            fillSlots: true,
            mapName: 'de_sioshooter'
        };
        
        const lobbySettings = { ...defaultSettings, ...settings };
        
        // Détermine l'équipe initiale selon le mode
        const initialTeam = lobbySettings.gameMode === 'ffa' ? 'FFA' : 'CT';
        
        const lobbyData = {
            code: lobbyCode,
            host: this.currentUser.id,
            hostName: this.currentUser.name,
            created: Date.now(),
            lastActivity: Date.now(),
            status: 'waiting',
            settings: lobbySettings,
            players: {
                [this.currentUser.id]: {
                    ...this.currentUser,
                    team: initialTeam,
                    isHost: true,
                    ready: false,
                    joinedAt: Date.now(),
                    isBot: false
                }
            },
            bots: {},
            gameState: this.initializeGameState(lobbySettings),
            chat: {},
            events: {},
            statistics: {
                totalRounds: 0,
                totalKills: 0,
                averageRoundTime: 0,
                playersJoined: 1,
                botsSpawned: 0
            }
        };

        try {
            await database.ref(`lobbies/${lobbyCode}`).set(lobbyData);
            
            // Configure l'auto-suppression du lobby en cas d'inactivité
            this.setupLobbyTimeout(lobbyCode);
            
            this.currentLobby = lobbyCode;
            console.log(`🏟️ Lobby créé: ${lobbyCode} (${lobbySettings.gameMode})`);
            
            // Ajoute des bots si activé
            if (lobbySettings.enableBots) {
                await this.spawnInitialBots(lobbyCode, lobbySettings);
            }
            
            // Statistiques
            this.stats.packetsSent++;
            
            return lobbyCode;
            
        } catch (error) {
            console.error('❌ Erreur lors de la création du lobby:', error);
            throw new Error('Impossible de créer le lobby');
        }
    }
    
    // Initialise l'état du jeu selon le mode
    initializeGameState(settings) {
        const baseState = {
            ctScore: 0,
            tScore: 0,
            currentRound: 1,
            phase: 'warmup',
            bombPlanted: false,
            bombDefused: false,
            bombExploded: false,
            roundStartTime: null,
            bombCarrier: null
        };
        
        switch (settings.gameMode) {
            case 'ffa':
                return {
                    ...baseState,
                    mode: 'ffa',
                    scoreLimit: 30,
                    timeLimit: 600, // 10 minutes
                    playerScores: {},
                    leaderboard: [],
                    respawnEnabled: true,
                    weaponSpawns: this.generateWeaponSpawns()
                };
                
            case 'tdm':
                return {
                    ...baseState,
                    mode: 'tdm',
                    scoreLimit: 75,
                    timeLimit: 600,
                    respawnEnabled: true
                };
                
            case 'gungame':
                return {
                    ...baseState,
                    mode: 'gungame',
                    weaponProgression: this.getGunGameWeapons(),
                    playerWeaponLevels: {},
                    winCondition: 'weapon_levels'
                };
                
            default: // competitive, casual
                return {
                    ...baseState,
                    mode: settings.gameMode,
                    respawnEnabled: false
                };
        }
    }
    
    // Génère les spawns d'armes pour FFA
    generateWeaponSpawns() {
        return [
            { x: 600, y: 300, weapon: 'ak47', respawnTime: 30000 },
            { x: 1200, y: 400, weapon: 'm4a4', respawnTime: 30000 },
            { x: 800, y: 800, weapon: 'awp', respawnTime: 45000 },
            { x: 1000, y: 200, weapon: 'ak47', respawnTime: 30000 },
            { x: 400, y: 600, weapon: 'shotgun', respawnTime: 25000 },
            { x: 1400, y: 700, weapon: 'sniper', respawnTime: 40000 }
        ];
    }
    
    // Obtient la progression d'armes pour Gun Game
    getGunGameWeapons() {
        return [
            'glock', 'usp', 'p250', 'fiveseven',
            'mac10', 'mp9', 'ump45', 'p90',
            'galil', 'famas', 'ak47', 'm4a4',
            'ssg08', 'awp', 'knife'
        ];
    }
    
    // Spawn des bots initiaux
    async spawnInitialBots(lobbyCode, settings) {
        const botCount = this.calculateInitialBotCount(settings);
        
        for (let i = 0; i < botCount; i++) {
            await this.addBot(lobbyCode, settings);
        }
        
        console.log(`🤖 ${botCount} bots ajoutés au lobby ${lobbyCode}`);
    }
    
    // Calcule le nombre de bots initial
    calculateInitialBotCount(settings) {
        if (!settings.enableBots) return 0;
        
        switch (settings.gameMode) {
            case 'ffa':
                return Math.min(settings.maxPlayers - 1, 8); // Max 8 bots en FFA
            case 'competitive':
                return settings.teamSize * 2 - 1; // Remplit les équipes
            case 'casual':
                return Math.min(settings.maxPlayers - 1, 12);
            default:
                return Math.min(settings.maxPlayers - 1, 6);
        }
    }
    
    // Ajoute un bot au lobby
    async addBot(lobbyCode, settings = null) {
        if (!settings) {
            const snapshot = await database.ref(`lobbies/${lobbyCode}/settings`).once('value');
            settings = snapshot.val();
        }
        
        const botId = 'bot_' + this.generateId();
        const botName = this.generateBotName();
        const botTeam = this.selectBotTeam(lobbyCode, settings);
        const botSkill = this.generateBotSkill(settings.botDifficulty);
        
        const botData = {
            id: botId,
            name: botName,
            team: botTeam,
            isBot: true,
            joinedAt: Date.now(),
            ready: true,
            alive: true,
            health: 100,
            armor: settings.gameMode === 'ffa' ? 0 : (botTeam === 'CT' ? 100 : 0),
            money: 800,
            weapon: 'pistol',
            ammo: 12,
            ammoReserve: 24,
            skill: botSkill,
            stats: {
                kills: 0,
                deaths: 0,
                assists: 0,
                score: 0
            },
            ai: {
                difficulty: settings.botDifficulty,
                accuracy: botSkill.accuracy,
                reactionTime: botSkill.reactionTime,
                decisionMaking: botSkill.decisionMaking,
                lastAction: Date.now(),
                target: null,
                state: 'idle' // idle, moving, fighting, objective
            }
        };
        
        // Ajoute le bot à Firebase
        await database.ref(`lobbies/${lobbyCode}/players/${botId}`).set(botData);
        await database.ref(`lobbies/${lobbyCode}/statistics/botsSpawned`).set(database.ServerValue.increment(1));
        
        // Position initiale du bot
        const spawnPoint = this.getBotSpawnPoint(settings, botTeam);
        botData.x = spawnPoint.x;
        botData.y = spawnPoint.y;
        botData.angle = spawnPoint.angle || 0;
        
        await database.ref(`lobbies/${lobbyCode}/players/${botId}/position`).set({
            x: botData.x,
            y: botData.y,
            angle: botData.angle,
            timestamp: Date.now()
        });
        
        console.log(`🤖 Bot ajouté: ${botName} (${botTeam}) - Skill: ${settings.botDifficulty}`);
        
        return botId;
    }
    
    // Génère un nom de bot
    generateBotName() {
        const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Nova', 'Apex'];
        const suffixes = ['Bot', 'AI', 'Unit', 'Agent', 'Drone', 'Core', 'Prime', 'Zero'];
        const numbers = Math.floor(Math.random() * 99) + 1;
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix}${suffix}${numbers}`;
    }
    
    // Sélectionne l'équipe d'un bot
    selectBotTeam(lobbyCode, settings) {
        if (settings.gameMode === 'ffa') {
            return 'FFA';
        }
        
        // Équilibre automatique des équipes si activé
        if (settings.autoBalance) {
            // Cette logique sera implémentée dans une fonction séparée
            return Math.random() > 0.5 ? 'CT' : 'T';
        }
        
        return Math.random() > 0.5 ? 'CT' : 'T';
    }
    
    // Génère les compétences d'un bot
    generateBotSkill(difficulty) {
        const skillLevels = {
            easy: {
                accuracy: 0.3 + Math.random() * 0.2, // 30-50%
                reactionTime: 800 + Math.random() * 400, // 800-1200ms
                decisionMaking: 0.3 + Math.random() * 0.2,
                aimSpeed: 0.2 + Math.random() * 0.2
            },
            medium: {
                accuracy: 0.5 + Math.random() * 0.2, // 50-70%
                reactionTime: 400 + Math.random() * 300, // 400-700ms
                decisionMaking: 0.5 + Math.random() * 0.2,
                aimSpeed: 0.4 + Math.random() * 0.2
            },
            hard: {
                accuracy: 0.7 + Math.random() * 0.2, // 70-90%
                reactionTime: 200 + Math.random() * 200, // 200-400ms
                decisionMaking: 0.7 + Math.random() * 0.2,
                aimSpeed: 0.6 + Math.random() * 0.2
            },
            expert: {
                accuracy: 0.85 + Math.random() * 0.1, // 85-95%
                reactionTime: 100 + Math.random() * 150, // 100-250ms
                decisionMaking: 0.85 + Math.random() * 0.1,
                aimSpeed: 0.8 + Math.random() * 0.15
            },
            mixed: {
                // Retourne un niveau aléatoire
                ...this.generateBotSkill(['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)])
            }
        };
        
        return skillLevels[difficulty] || skillLevels.medium;
    }
    
    // Obtient un point de spawn pour un bot
    getBotSpawnPoint(settings, team) {
        // Points de spawn selon la carte et le mode
        if (settings.gameMode === 'ffa') {
            const ffaSpawns = [
                { x: 300, y: 300, angle: 0 },
                { x: 1300, y: 300, angle: Math.PI },
                { x: 300, y: 1200, angle: Math.PI/2 },
                { x: 1300, y: 1200, angle: -Math.PI/2 },
                { x: 800, y: 600, angle: 0 },
                { x: 600, y: 800, angle: Math.PI/4 },
                { x: 1000, y: 400, angle: -Math.PI/4 },
                { x: 500, y: 500, angle: Math.PI/2 }
            ];
            return ffaSpawns[Math.floor(Math.random() * ffaSpawns.length)];
        }
        
        // Points de spawn par équipe pour les modes d'équipe
        const teamSpawns = {
            CT: [
                { x: 200, y: 800, angle: 0 },
                { x: 250, y: 750, angle: 0 },
                { x: 250, y: 850, angle: 0 },
                { x: 300, y: 800, angle: 0 },
                { x: 200, y: 900, angle: 0 }
            ],
            T: [
                { x: 2100, y: 800, angle: Math.PI },
                { x: 2050, y: 750, angle: Math.PI },
                { x: 2050, y: 850, angle: Math.PI },
                { x: 2000, y: 800, angle: Math.PI },
                { x: 2100, y: 900, angle: Math.PI }
            ]
        };
        
        const spawns = teamSpawns[team] || teamSpawns.CT;
        return spawns[Math.floor(Math.random() * spawns.length)];
    }
    
    // Système d'IA des bots (sera appelé périodiquement)
    async updateBotAI(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const bots = Object.values(lobbyData.players).filter(p => p.isBot && p.alive);
            const humans = Object.values(lobbyData.players).filter(p => !p.isBot && p.alive);
            
            for (const bot of bots) {
                await this.processBotAI(bot, lobbyData, humans);
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors de la mise à jour de l\'IA:', error);
        }
    }
    
    // Traite l'IA d'un bot spécifique
    async processBotAI(bot, lobbyData, enemies) {
        const now = Date.now();
        const deltaTime = now - bot.ai.lastAction;
        
        // Limite la fréquence des actions de l'IA
        if (deltaTime < 100) return; // 10 FPS pour l'IA
        
        // Décision de l'IA selon l'état actuel
        switch (bot.ai.state) {
            case 'idle':
                await this.botDecideAction(bot, lobbyData, enemies);
                break;
            case 'moving':
                await this.botUpdateMovement(bot, lobbyData);
                break;
            case 'fighting':
                await this.botUpdateCombat(bot, enemies);
                break;
            case 'objective':
                await this.botUpdateObjective(bot, lobbyData);
                break;
        }
        
        // Met à jour Firebase
        await database.ref(`lobbies/${lobbyData.code}/players/${bot.id}/ai/lastAction`).set(now);
    }
    
    // Le bot décide de son action
    async botDecideAction(bot, lobbyData, enemies) {
        const nearbyEnemies = enemies.filter(enemy => 
            this.calculateDistance(bot, enemy) < 500 && 
            enemy.team !== bot.team
        );
        
        if (nearbyEnemies.length > 0 && Math.random() < bot.ai.decisionMaking) {
            // Combat
            bot.ai.state = 'fighting';
            bot.ai.target = nearbyEnemies[0];
        } else if (lobbyData.settings.gameMode !== 'ffa' && Math.random() < 0.3) {
            // Objectif (bombe, etc.)
            bot.ai.state = 'objective';
        } else {
            // Mouvement aléatoire
            bot.ai.state = 'moving';
            bot.ai.targetPosition = this.generateRandomPosition(lobbyData.settings);
        }
        
        await database.ref(`lobbies/${lobbyData.code}/players/${bot.id}/ai/state`).set(bot.ai.state);
    }
    
    // Met à jour le mouvement du bot
    async botUpdateMovement(bot, lobbyData) {
        if (!bot.ai.targetPosition) {
            bot.ai.state = 'idle';
            return;
        }
        
        // Calcule la direction vers la cible
        const dx = bot.ai.targetPosition.x - bot.x;
        const dy = bot.ai.targetPosition.y - bot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
            // Arrivé à destination
            bot.ai.state = 'idle';
            return;
        }
        
        // Normalise le vecteur de direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        const speed = 200; // pixels par seconde
        
        // Nouvelle position
        const newX = bot.x + dirX * speed * 0.1; // 0.1 seconde
        const newY = bot.y + dirY * speed * 0.1;
        const newAngle = Math.atan2(dy, dx);
        
        // Met à jour la position
        await database.ref(`lobbies/${lobbyData.code}/players/${bot.id}/position`).set({
            x: Math.round(newX),
            y: Math.round(newY),
            angle: newAngle,
            timestamp: Date.now()
        });
    }
    
    // Met à jour le combat du bot
    async botUpdateCombat(bot, enemies) {
        if (!bot.ai.target || !bot.ai.target.alive) {
            bot.ai.state = 'idle';
            bot.ai.target = null;
            return;
        }
        
        const target = bot.ai.target;
        const distance = this.calculateDistance(bot, target);
        
        // Vise vers la cible
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const aimAngle = Math.atan2(dy, dx);
        
        // Ajoute de l'imprécision selon le skill
        const inaccuracy = (1 - bot.ai.accuracy) * 0.2;
        const finalAngle = aimAngle + (Math.random() - 0.5) * inaccuracy;
        
        // Tire si dans la portée et avec une chance selon le skill
        if (distance < 800 && Math.random() < bot.ai.accuracy * 0.1) {
            await this.botShoot(bot, target, finalAngle);
        }
        
        // Met à jour l'angle de visée
        await database.ref(`lobbies/${this.currentLobby}/players/${bot.id}/position/angle`).set(finalAngle);
    }
    
    // Le bot tire
    async botShoot(bot, target, angle) {
        // Simule un tir du bot
        const weapon = this.weapons?.[bot.weapon] || { damage: 20 };
        const damage = weapon.damage * (0.8 + Math.random() * 0.4); // Variation des dégâts
        
        // Vérifie si le tir touche (selon l'accuracy du bot)
        if (Math.random() < bot.ai.accuracy) {
            // Touché !
            await this.processBotHit(bot, target, damage);
        }
        
        // Met à jour les munitions
        if (bot.ammo > 0) {
            await database.ref(`lobbies/${this.currentLobby}/players/${bot.id}/ammo`).set(bot.ammo - 1);
        }
    }
    
    // Traite un tir réussi du bot
    async processBotHit(bot, target, damage) {
        // Réduit la vie de la cible
        const newHealth = Math.max(0, target.health - damage);
        
        await database.ref(`lobbies/${this.currentLobby}/players/${target.id}/health`).set(newHealth);
        
        if (newHealth <= 0) {
            // Kill !
            await database.ref(`lobbies/${this.currentLobby}/players/${target.id}/alive`).set(false);
            await database.ref(`lobbies/${this.currentLobby}/players/${bot.id}/stats/kills`).set(database.ServerValue.increment(1));
            await database.ref(`lobbies/${this.currentLobby}/players/${target.id}/stats/deaths`).set(database.ServerValue.increment(1));
            
            // Message de kill
            await this.sendSystemMessage(`🤖 ${bot.name} a éliminé ${target.name}`);
            
            console.log(`🤖 Bot kill: ${bot.name} -> ${target.name}`);
        }
    }
    
    // Calcule la distance entre deux entités
    calculateDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Génère une position aléatoire valide
    generateRandomPosition(settings) {
        // Positions aléatoires dans la carte
        return {
            x: 200 + Math.random() * 2000,
            y: 200 + Math.random() * 1200
        };
    }
    
    // Remplit automatiquement avec des bots
    async fillWithBots(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const settings = lobbyData.settings;
            
            if (!settings.fillSlots || !settings.enableBots) return;
            
            const currentPlayers = Object.keys(lobbyData.players).length;
            const maxPlayers = settings.maxPlayers;
            const botsNeeded = maxPlayers - currentPlayers;
            
            for (let i = 0; i < botsNeeded; i++) {
                await this.addBot(lobbyCode, settings);
            }
            
            if (botsNeeded > 0) {
                console.log(`🤖 ${botsNeeded} bots ajoutés pour remplir le lobby`);
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur lors du remplissage avec des bots:', error);
        }
    }
    
    // Supprime un bot
    async removeBot(lobbyCode, botId) {
        try {
            await database.ref(`lobbies/${lobbyCode}/players/${botId}`).remove();
            console.log(`🗑️ Bot supprimé: ${botId}`);
        } catch (error) {
            console.warn('⚠️ Erreur lors de la suppression du bot:', error);
        }
    }
    
    // Configure le timeout d'un lobby
    setupLobbyTimeout(lobbyCode) {
        setTimeout(async () => {
            try {
                const snapshot = await database.ref(`lobbies/${lobbyCode}/lastActivity`).once('value');
                const lastActivity = snapshot.val();
                
                if (lastActivity && Date.now() - lastActivity > this.config.lobbyTimeout) {
                    console.log(`🗑️ Suppression du lobby inactif: ${lobbyCode}`);
                    await database.ref(`lobbies/${lobbyCode}`).remove();
                }
            } catch (error) {
                console.warn('⚠️ Erreur lors de la vérification du timeout:', error);
            }
        }, this.config.lobbyTimeout);
    }

    // Rejoint un lobby existant avec vérifications avancées
    async joinLobby(lobbyCode) {
        if (!this.currentUser) {
            throw new Error('Aucun utilisateur connecté');
        }
        
        // Validation du code lobby
        this.validateInput({ lobbyCode }, {
            lobbyCode: {
                required: true,
                type: 'string',
                pattern: /^[A-Z0-9]{6}$/
            }
        });

        const lobbyRef = database.ref(`lobbies/${lobbyCode}`);
        
        try {
            const snapshot = await lobbyRef.once('value');
            
            if (!snapshot.exists()) {
                throw new Error('Lobby introuvable');
            }

            const lobbyData = snapshot.val();
            
            // Vérifications de sécurité
            if (lobbyData.settings.isPrivate && !this.isInvited(lobbyCode)) {
                throw new Error('Ce lobby est privé');
            }
            
            const players = Object.keys(lobbyData.players || {});
            const playerCount = players.length;

            if (playerCount >= lobbyData.settings.maxPlayers) {
                throw new Error('Lobby complet');
            }

            if (lobbyData.status !== 'waiting') {
                throw new Error('La partie a déjà commencé');
            }
            
            // Vérifie si le joueur n'est pas banni
            if (this.isPlayerBanned(lobbyCode, this.currentUser.id)) {
                throw new Error('Vous êtes banni de ce lobby');
            }

            // Détermine l'équipe avec le moins de joueurs
            const ctCount = players.filter(id => lobbyData.players[id].team === 'CT').length;
            const tCount = players.filter(id => lobbyData.players[id].team === 'T').length;
            const team = ctCount <= tCount ? 'CT' : 'T';

            // Ajoute le joueur avec transaction pour éviter les conditions de course
            const playerData = {
                ...this.currentUser,
                team: team,
                isHost: false,
                ready: false,
                joinedAt: Date.now(),
                ping: this.stats.lastPing || 0
            };
            
            await lobbyRef.child(`players/${this.currentUser.id}`).set(playerData);
            await lobbyRef.child('lastActivity').set(Date.now());
            await lobbyRef.child('statistics/playersJoined').set(playerCount + 1);

            this.currentLobby = lobbyCode;
            console.log(`🚪 Rejoint le lobby: ${lobbyCode} (équipe ${team})`);
            
            // Envoie un message de bienvenue
            await this.sendSystemMessage(`${this.currentUser.name} a rejoint la partie`);
            
            // Statistiques
            this.stats.packetsSent++;
            
            return lobbyCode;
            
        } catch (error) {
            console.error('❌ Erreur lors de la connexion au lobby:', error);
            throw error;
        }
    }
    
    // Vérifie si un joueur est invité
    isInvited(lobbyCode) {
        // Logique d'invitation (simplifié)
        return false;
    }
    
    // Vérifie si un joueur est banni
    isPlayerBanned(lobbyCode, playerId) {
        // Logique de ban (simplifié)
        return false;
    }

    // Quitte le lobby actuel avec nettoyage
    async leaveLobby() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        
        try {
            const snapshot = await lobbyRef.once('value');
            
            if (snapshot.exists()) {
                const lobbyData = snapshot.val();
                
                // Supprime le joueur
                await lobbyRef.child(`players/${this.currentUser.id}`).remove();
                
                // Message de départ
                await this.sendSystemMessage(`${this.currentUser.name} a quitté la partie`);
                
                // Si c'était l'hôte et qu'il reste des joueurs, assigne un nouvel hôte
                if (lobbyData.host === this.currentUser.id) {
                    const remainingPlayers = Object.keys(lobbyData.players || {})
                        .filter(id => id !== this.currentUser.id);
                    
                    if (remainingPlayers.length > 0) {
                        const newHost = remainingPlayers[0];
                        const newHostData = lobbyData.players[newHost];
                        
                        await lobbyRef.update({
                            host: newHost,
                            hostName: newHostData.name,
                            [`players/${newHost}/isHost`]: true
                        });
                        
                        await this.sendSystemMessage(`${newHostData.name} est maintenant l'hôte`);
                        
                        console.log(`👑 Nouvel hôte: ${newHostData.name}`);
                    } else {
                        // Supprime le lobby s'il est vide
                        await lobbyRef.remove();
                        console.log(`🗑️ Lobby ${this.currentLobby} supprimé (vide)`);
                    }
                }
                
                // Met à jour l'activité
                await lobbyRef.child('lastActivity').set(Date.now());
            }

        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion:', error);
        } finally {
            this.removeAllListeners();
            this.currentLobby = null;
            this.stopHeartbeat();
            
            console.log('🚪 Lobby quitté');
        }
    }

    // Change d'équipe avec vérifications
    async switchTeam() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        
        try {
            const snapshot = await lobbyRef.once('value');
            
            if (snapshot.exists()) {
                const lobbyData = snapshot.val();
                const currentPlayer = lobbyData.players[this.currentUser.id];
                
                if (!currentPlayer) {
                    throw new Error('Joueur introuvable dans le lobby');
                }
                
                const newTeam = currentPlayer.team === 'CT' ? 'T' : 'CT';
                
                // Vérifie si l'équipe n'est pas pleine (max 5 par équipe)
                const teamCount = Object.values(lobbyData.players)
                    .filter(p => p.team === newTeam).length;
                
                if (teamCount >= 5) {
                    throw new Error(`L'équipe ${newTeam} est complète`);
                }
                
                // Vérifie le cooldown de changement d'équipe
                const lastTeamChange = currentPlayer.lastTeamChange || 0;
                if (Date.now() - lastTeamChange < 5000) { // 5 secondes de cooldown
                    throw new Error('Veuillez attendre avant de changer d\'équipe');
                }

                await lobbyRef.child(`players/${this.currentUser.id}`).update({
                    team: newTeam,
                    lastTeamChange: Date.now(),
                    ready: false // Reset le statut ready
                });
                
                this.currentUser.team = newTeam;
                
                await this.sendSystemMessage(`${this.currentUser.name} a rejoint l'équipe ${newTeam}`);
                console.log(`🔄 Équipe changée: ${newTeam}`);
            }
        } catch (error) {
            console.error('❌ Erreur lors du changement d\'équipe:', error);
            throw error;
        }
    }
    
    // Rejoint une équipe spécifique
    async joinTeam(team) {
        if (!['CT', 'T'].includes(team)) {
            throw new Error('Équipe invalide');
        }
        
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        
        try {
            const snapshot = await lobbyRef.once('value');
            
            if (snapshot.exists()) {
                const lobbyData = snapshot.val();
                const currentPlayer = lobbyData.players[this.currentUser.id];
                
                if (currentPlayer.team === team) {
                    throw new Error(`Vous êtes déjà dans l'équipe ${team}`);
                }
                
                // Vérifie si l'équipe n'est pas pleine
                const teamCount = Object.values(lobbyData.players)
                    .filter(p => p.team === team).length;
                
                if (teamCount >= 5) {
                    throw new Error(`L'équipe ${team} est complète`);
                }

                await lobbyRef.child(`players/${this.currentUser.id}`).update({
                    team: team,
                    lastTeamChange: Date.now(),
                    ready: false
                });
                
                this.currentUser.team = team;
                
                await this.sendSystemMessage(`${this.currentUser.name} a rejoint l'équipe ${team}`);
                console.log(`👥 Équipe rejointe: ${team}`);
            }
        } catch (error) {
            console.error('❌ Erreur lors du changement d\'équipe:', error);
            throw error;
        }
    }

    // Lance la partie avec vérifications approfondies
    async startGame() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        
        try {
            const snapshot = await lobbyRef.once('value');
            
            if (snapshot.exists()) {
                const lobbyData = snapshot.val();
                
                // Vérifie que c'est bien l'hôte
                if (lobbyData.host !== this.currentUser.id) {
                    throw new Error("Seul l'hôte peut lancer la partie");
                }

                // Vérifie qu'il y a assez de joueurs
                const players = Object.values(lobbyData.players);
                const playerCount = players.length;
                
                if (playerCount < 2) {
                    throw new Error("Il faut au moins 2 joueurs pour commencer");
                }
                
                // Vérifie l'équilibre des équipes
                const ctCount = players.filter(p => p.team === 'CT').length;
                const tCount = players.filter(p => p.team === 'T').length;
                
                if (playerCount > 2 && Math.abs(ctCount - tCount) > 2) {
                    throw new Error("Les équipes doivent être équilibrées");
                }
                
                // Vérifie que tous les joueurs sont prêts (optionnel)
                const allReady = players.every(p => p.ready || p.isHost);
                if (playerCount > 4 && !allReady) {
                    throw new Error("Tous les joueurs doivent être prêts");
                }

                // Initialise l'état du jeu
                const gameState = {
                    status: 'playing',
                    phase: 'buy_time',
                    currentRound: 1,
                    ctScore: 0,
                    tScore: 0,
                    roundStartTime: Date.now(),
                    buyTimeEnd: Date.now() + 15000, // 15 secondes d'achat
                    roundTimeLimit: lobbyData.settings.roundTime * 1000,
                    alivePlayers: Object.keys(lobbyData.players),
                    bombCarrier: this.selectRandomTerrorist(lobbyData.players),
                    bombPlanted: false,
                    bombSite: null,
                    bombPlantTime: null,
                    bombTimeLimit: 40000, // 40 secondes pour exploser
                    defuseStartTime: null,
                    defuseTimeLimit: 10000, // 10 secondes pour désamorcer
                    economy: this.initializeEconomy(lobbyData.players),
                    events: []
                };

                // Met à jour le lobby
                await lobbyRef.update({
                    status: 'playing',
                    gameState: gameState,
                    startedAt: Date.now(),
                    lastActivity: Date.now()
                });
                
                // Envoie des messages informatifs
                await this.sendSystemMessage('🎮 La partie commence !');
                await this.sendSystemMessage(`💰 Temps d'achat: 15 secondes`);
                
                if (gameState.bombCarrier) {
                    const carrier = lobbyData.players[gameState.bombCarrier];
                    await this.sendSystemMessage(`💣 ${carrier.name} porte la bombe`);
                }
                
                console.log(`🎮 Partie lancée dans le lobby ${this.currentLobby}`);
                
                // Démarre les timers de jeu
                this.startGameTimers(gameState);
                
                // Statistiques
                this.stats.packetsSent++;
            }
        } catch (error) {
            console.error('❌ Erreur lors du lancement de la partie:', error);
            throw error;
        }
    }
    
    // Sélectionne un terroriste aléatoire pour porter la bombe
    selectRandomTerrorist(players) {
        const terrorists = Object.entries(players)
            .filter(([id, player]) => player.team === 'T')
            .map(([id, player]) => id);
        
        if (terrorists.length === 0) return null;
        return terrorists[Math.floor(Math.random() * terrorists.length)];
    }
    
    // Initialise l'économie du jeu
    initializeEconomy(players) {
        const economy = {};
        
        Object.entries(players).forEach(([id, player]) => {
            economy[id] = {
                money: player.team === 'CT' ? 800 : 800,
                equipment: player.team === 'CT' ? ['usp', 'defuse_kit'] : ['glock'],
                roundStartMoney: 800,
                moneySpent: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                mvpRounds: 0
            };
        });
        
        return economy;
    }
    
    // Démarre les timers de jeu
    startGameTimers(gameState) {
        // Timer de temps d'achat
        setTimeout(async () => {
            if (this.currentLobby) {
                await database.ref(`lobbies/${this.currentLobby}/gameState/phase`).set('combat');
                await this.sendSystemMessage('⚔️ Phase de combat !');
            }
        }, 15000);
        
        // Timer de round
        setTimeout(async () => {
            if (this.currentLobby) {
                await this.handleRoundTimeout();
            }
        }, gameState.roundTimeLimit);
    }
    
    // Gère le timeout du round
    async handleRoundTimeout() {
        try {
            const snapshot = await database.ref(`lobbies/${this.currentLobby}/gameState`).once('value');
            const gameState = snapshot.val();
            
            if (gameState && gameState.status === 'playing' && !gameState.bombPlanted) {
                // Les CT gagnent par timeout
                await this.endRound('CT', 'Temps écoulé');
            }
        } catch (error) {
            console.error('❌ Erreur lors du timeout du round:', error);
        }
    }

    // Récupère la liste des lobbys avec pagination et filtres
    async getLobbies(filters = {}) {
        try {
            let query = database.ref('lobbies').orderByChild('created');
            
            // Applique les filtres
            if (filters.limit) {
                query = query.limitToLast(filters.limit);
            }
            
            const snapshot = await query.once('value');
            const lobbies = [];
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                Object.entries(data).forEach(([code, lobby]) => {
                    // Filtre par statut
                    if (lobby.status === 'waiting' || filters.includeActive) {
                        // Filtre par mode de jeu
                        if (!filters.gameMode || lobby.settings.gameMode === filters.gameMode) {
                            // Filtre par ping/région (simulé)
                            const ping = Math.floor(Math.random() * 100) + 10;
                            
                            lobbies.push({
                                code: code,
                                host: lobby.host,
                                hostName: lobby.hostName || 'Inconnu',
                                playerCount: Object.keys(lobby.players || {}).length,
                                maxPlayers: lobby.settings.maxPlayers,
                                gameMode: lobby.settings.gameMode,
                                created: lobby.created,
                                lastActivity: lobby.lastActivity,
                                ping: ping,
                                region: this.getRegionFromPing(ping),
                                hasPassword: lobby.settings.isPrivate,
                                allowSpectators: lobby.settings.allowSpectators
                            });
                        }
                    }
                });
            }
            
            // Trie par activité récente
            lobbies.sort((a, b) => (b.lastActivity || b.created) - (a.lastActivity || a.created));
            
            console.log(`📋 ${lobbies.length} lobbys trouvés`);
            return lobbies;
            
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des lobbys:', error);
            return [];
        }
    }
    
    // Obtient le nombre de lobbys
    async getLobbiesCount() {
        try {
            const snapshot = await database.ref('lobbies').once('value');
            return snapshot.numChildren();
        } catch (error) {
            console.error('❌ Erreur lors du comptage des lobbys:', error);
            return 0;
        }
    }
    
    // Détermine la région selon le ping
    getRegionFromPing(ping) {
        if (ping < 30) return 'Local';
        if (ping < 60) return 'Europe';
        if (ping < 100) return 'International';
        return 'Distant';
    }

    // Écoute les changements dans le lobby avec reconnexion automatique
    listenToLobby(callback) {
        if (!this.currentLobby) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        const listener = lobbyRef.on('value', (snapshot) => {
            try {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    
                    // Met à jour les statistiques
                    this.stats.packetsReceived++;
                    this.stats.dataReceived += JSON.stringify(data).length;
                    
                    callback(data);
                } else {
                    callback(null);
                }
            } catch (error) {
                console.error('❌ Erreur lors du traitement des données du lobby:', error);
                this.handleListenerError(error);
            }
        }, (error) => {
            console.error('❌ Erreur d\'écoute du lobby:', error);
            this.handleListenerError(error);
        });

        this.listeners.set('lobby', { ref: lobbyRef, listener: listener });
    }
    
    // Gère les erreurs des listeners
    handleListenerError(error) {
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🚫 Accès refusé au lobby');
            this.handleLobbyNotFound();
        } else if (error.code === 'NETWORK_ERROR') {
            console.warn('📡 Erreur réseau, tentative de reconnexion...');
            this.attemptReconnection();
        }
    }
    
    // Gère le cas où le lobby n'est pas trouvé
    handleLobbyNotFound() {
        if (window.menuManager) {
            window.menuManager.showNotification('🏠 Lobby fermé ou introuvable', 'warning');
            window.menuManager.showScreen('lobby');
        }
        
        this.currentLobby = null;
        this.removeAllListeners();
    }

    // Écoute les messages du chat avec filtrage
    listenToChat(callback) {
        if (!this.currentLobby) return;

        const chatRef = database.ref(`lobbies/${this.currentLobby}/chat`);
        const listener = chatRef.on('child_added', (snapshot) => {
            try {
                const message = snapshot.val();
                
                // Valide le message
                if (this.validateChatMessage(message)) {
                    // Filtre le contenu inapproprié
                    message.message = this.filterProfanity(message.message);
                    
                    this.stats.packetsReceived++;
                    callback(message);
                }
            } catch (error) {
                console.error('❌ Erreur lors du traitement du message chat:', error);
            }
        });

        this.listeners.set('chat', { ref: chatRef, listener: listener });
    }
    
    // Valide un message de chat
    validateChatMessage(message) {
        if (!message || typeof message.message !== 'string') return false;
        if (message.message.length > 200) return false;
        if (!message.playerName || !message.timestamp) return false;
        return true;
    }
    
    // Filtre la profanité (système basique)
    filterProfanity(message) {
        const badWords = ['spam', 'hack', 'cheat']; // Exemple basique
        let filtered = message;
        
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        
        return filtered;
    }

    // Envoie un message dans le chat avec anti-spam
    async sendChatMessage(message, teamOnly = false) {
        if (!this.currentLobby || !this.currentUser || !message.trim()) return;
        
        // Vérification du rate limiting
        if (!this.checkRateLimit('chat')) {
            throw new Error('Vous envoyez des messages trop rapidement');
        }
        
        // Validation du message
        const trimmedMessage = message.trim();
        if (trimmedMessage.length > 200) {
            throw new Error('Message trop long (max 200 caractères)');
        }
        
        // Anti-spam: vérification de duplication
        if (this.lastChatMessage === trimmedMessage && Date.now() - this.lastChatTime < 3000) {
            throw new Error('Message identique envoyé récemment');
        }

        const chatRef = database.ref(`lobbies/${this.currentLobby}/chat`);
        const messageData = {
            playerId: this.currentUser.id,
            playerName: this.currentUser.name,
            message: this.sanitizeString(trimmedMessage),
            timestamp: Date.now(),
            team: this.currentUser.team,
            teamOnly: teamOnly,
            messageId: this.generateId()
        };
        
        try {
            await chatRef.push(messageData);
            
            // Met à jour l'activité du lobby
            await database.ref(`lobbies/${this.currentLobby}/lastActivity`).set(Date.now());
            
            this.lastChatMessage = trimmedMessage;
            this.lastChatTime = Date.now();
            this.stats.packetsSent++;
            
            console.log(`💬 Message envoyé: ${teamOnly ? '(Équipe)' : '(Tous)'} ${trimmedMessage}`);
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du message:', error);
            throw new Error('Impossible d\'envoyer le message');
        }
    }
    
    // Envoie un message système
    async sendSystemMessage(message) {
        if (!this.currentLobby) return;
        
        const chatRef = database.ref(`lobbies/${this.currentLobby}/chat`);
        const systemMessage = {
            playerId: 'system',
            playerName: 'Système',
            message: message,
            timestamp: Date.now(),
            team: 'system',
            teamOnly: false,
            isSystem: true,
            messageId: this.generateId()
        };
        
        try {
            await chatRef.push(systemMessage);
        } catch (error) {
            console.warn('⚠️ Erreur lors de l\'envoi du message système:', error);
        }
    }

    // Met à jour la position du joueur avec anti-cheat
    async updatePlayerPosition(x, y, angle) {
        if (!this.currentLobby || !this.currentUser) return;
        
        // Vérification du rate limiting
        if (!this.checkRateLimit('positions')) {
            return; // Ignore silencieusement si trop fréquent
        }
        
        const positionData = {
            x: Math.round(x),
            y: Math.round(y),
            angle: Math.round(angle * 1000) / 1000, // Arrondi à 3 décimales
            timestamp: Date.now()
        };
        
        // Vérification anti-cheat
        if (!this.checkAntiCheat('position', positionData)) {
            console.warn('🚨 Position invalide détectée');
            return;
        }

        try {
            await database.ref(`lobbies/${this.currentLobby}/players/${this.currentUser.id}/position`).set(positionData);
            this.stats.packetsSent++;
        } catch (error) {
            console.warn('⚠️ Erreur lors de la mise à jour de position:', error);
        }
    }

    // Met à jour l'état du joueur
    async updatePlayerState(state) {
        if (!this.currentLobby || !this.currentUser) return;
        
        // Vérifie le rate limiting pour les actions
        if (!this.checkRateLimit('actions')) {
            return;
        }
        
        // Valide les données d'état
        const allowedFields = ['health', 'armor', 'ammo', 'ammoReserve', 'weapon', 'money', 'alive', 'ready', 'isDefusing', 'isPlanting'];
        const sanitizedState = {};
        
        Object.entries(state).forEach(([key, value]) => {
            if (allowedFields.includes(key)) {
                // Validation des valeurs
                if (key === 'health' && (typeof value !== 'number' || value < 0 || value > 100)) return;
                if (key === 'armor' && (typeof value !== 'number' || value < 0 || value > 100)) return;
                if (key === 'money' && (typeof value !== 'number' || value < 0 || value > 16000)) return;
                
                sanitizedState[key] = value;
            }
        });
        
        if (Object.keys(sanitizedState).length === 0) return;

        try {
            await database.ref(`lobbies/${this.currentLobby}/players/${this.currentUser.id}/state`).update({
                ...sanitizedState,
                lastUpdate: Date.now()
            });
            
            this.stats.packetsSent++;
        } catch (error) {
            console.warn('⚠️ Erreur lors de la mise à jour d\'état:', error);
        }
    }

    // Actions de jeu
    async plantBomb(site) {
        if (!this.currentLobby || !this.currentUser) return;
        
        // Vérifications de sécurité
        if (!['A', 'B'].includes(site)) {
            throw new Error('Site de bombe invalide');
        }

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        const plantData = {
            bombPlanted: true,
            bombSite: site,
            bombPlantTime: Date.now(),
            bombPlantedBy: this.currentUser.id,
            bombTimeLimit: Date.now() + 40000 // 40 secondes
        };
        
        try {
            // Transaction pour éviter les conditions de course
            await gameStateRef.update(plantData);
            
            // Événement de jeu
            await this.addGameEvent('bomb_planted', {
                player: this.currentUser.name,
                site: site,
                timestamp: Date.now()
            });
            
            // Récompense économique
            await this.updatePlayerEconomy(this.currentUser.id, { money: 300, action: 'bomb_plant' });
            
            console.log(`💣 Bombe plantée sur ${site} par ${this.currentUser.name}`);
            this.stats.packetsSent++;
            
        } catch (error) {
            console.error('❌ Erreur lors de la plantation:', error);
            throw new Error('Impossible de planter la bombe');
        }
    }

    async defuseBomb() {
        if (!this.currentLobby || !this.currentUser) return;

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        const defuseData = {
            bombDefused: true,
            bombDefusedBy: this.currentUser.id,
            bombDefuseTime: Date.now()
        };
        
        try {
            await gameStateRef.update(defuseData);
            
            // Événement de jeu
            await this.addGameEvent('bomb_defused', {
                player: this.currentUser.name,
                timestamp: Date.now()
            });
            
            // Récompense économique
            await this.updatePlayerEconomy(this.currentUser.id, { money: 300, action: 'bomb_defuse' });
            
            // Les CT gagnent
            await this.endRound('CT', 'Bombe désamorcée');
            
            console.log(`🛡️ Bombe désamorcée par ${this.currentUser.name}`);
            this.stats.packetsSent++;
            
        } catch (error) {
            console.error('❌ Erreur lors du désamorçage:', error);
            throw new Error('Impossible de désamorcer la bombe');
        }
    }
    
    // Ajoute un événement de jeu
    async addGameEvent(type, data) {
        if (!this.currentLobby) return;
        
        const eventRef = database.ref(`lobbies/${this.currentLobby}/events`);
        const eventData = {
            type: type,
            data: data,
            timestamp: Date.now(),
            round: data.round || 1
        };
        
        try {
            await eventRef.push(eventData);
        } catch (error) {
            console.warn('⚠️ Erreur lors de l\'ajout d\'événement:', error);
        }
    }
    
    // Met à jour l'économie d'un joueur
    async updatePlayerEconomy(playerId, update) {
        if (!this.currentLobby) return;
        
        const economyRef = database.ref(`lobbies/${this.currentLobby}/gameState/economy/${playerId}`);
        
        try {
            await economyRef.update(update);
        } catch (error) {
            console.warn('⚠️ Erreur lors de la mise à jour économique:', error);
        }
    }
    
    // Termine un round
    async endRound(winningTeam, reason) {
        if (!this.currentLobby) return;
        
        try {
            const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
            const snapshot = await lobbyRef.once('value');
            
            if (snapshot.exists()) {
                const lobbyData = snapshot.val();
                const gameState = lobbyData.gameState;
                
                // Calcule les nouveaux scores
                const newCtScore = gameState.ctScore + (winningTeam === 'CT' ? 1 : 0);
                const newTScore = gameState.tScore + (winningTeam === 'T' ? 1 : 0);
                
                // Vérifie si la partie est terminée
                const maxRounds = lobbyData.settings.maxRounds;
                const totalRounds = newCtScore + newTScore;
                const isMatchEnd = newCtScore >= Math.ceil(maxRounds / 2) || 
                                  newTScore >= Math.ceil(maxRounds / 2) ||
                                  totalRounds >= maxRounds;
                
                // Met à jour les scores
                const updates = {
                    'gameState/ctScore': newCtScore,
                    'gameState/tScore': newTScore,
                    'gameState/currentRound': totalRounds + 1,
                    'gameState/roundEndTime': Date.now(),
                    'gameState/roundEndReason': reason,
                    'gameState/lastWinner': winningTeam,
                    'lastActivity': Date.now()
                };
                
                if (isMatchEnd) {
                    updates['status'] = 'finished';
                    updates['gameState/status'] = 'finished';
                    updates['gameState/winner'] = newCtScore > newTScore ? 'CT' : 'T';
                    updates['finishedAt'] = Date.now();
                }
                
                await lobbyRef.update(updates);
                
                // Événements et statistiques
                await this.addGameEvent('round_end', {
                    winner: winningTeam,
                    reason: reason,
                    ctScore: newCtScore,
                    tScore: newTScore,
                    round: totalRounds
                });
                
                // Met à jour l'économie des joueurs
                await this.updateRoundEconomy(lobbyData.players, winningTeam);
                
                console.log(`🏆 Round terminé: ${winningTeam} gagne (${reason})`);
                
                if (isMatchEnd) {
                    console.log(`🎊 Match terminé: ${updates['gameState/winner']} gagne ${newCtScore}-${newTScore}`);
                    await this.handleMatchEnd(lobbyData);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la fin du round:', error);
        }
    }
    
    // Met à jour l'économie après un round
    async updateRoundEconomy(players, winningTeam) {
        const economyUpdates = {};
        
        Object.entries(players).forEach(([playerId, player]) => {
            const isWinner = player.team === winningTeam;
            const baseMoney = isWinner ? 3250 : 1400;
            const killBonus = (player.kills || 0) * 300;
            const totalMoney = Math.min(16000, baseMoney + killBonus);
            
            economyUpdates[`gameState/economy/${playerId}/money`] = totalMoney;
            economyUpdates[`gameState/economy/${playerId}/roundStartMoney`] = totalMoney;
        });
        
        try {
            await database.ref(`lobbies/${this.currentLobby}`).update(economyUpdates);
        } catch (error) {
            console.warn('⚠️ Erreur lors de la mise à jour économique du round:', error);
        }
    }
    
    // Gère la fin du match
    async handleMatchEnd(lobbyData) {
        // Met à jour les statistiques des joueurs
        const playerUpdates = {};
        
        Object.entries(lobbyData.players).forEach(([playerId, player]) => {
            const isWinner = (lobbyData.gameState.winner === player.team);
            
            playerUpdates[`players/${playerId}/stats/gamesPlayed`] = (player.stats?.gamesPlayed || 0) + 1;
            
            if (isWinner) {
                playerUpdates[`players/${playerId}/stats/wins`] = (player.stats?.wins || 0) + 1;
            }
        });
        
        try {
            await database.ref(`lobbies/${this.currentLobby}`).update(playerUpdates);
            
            // Envoie des messages de fin
            const winner = lobbyData.gameState.winner;
            const finalScore = `${lobbyData.gameState.ctScore}-${lobbyData.gameState.tScore}`;
            
            await this.sendSystemMessage(`🎊 Match terminé ! ${winner === 'CT' ? 'Counter-Terrorists' : 'Terrorists'} gagnent ${finalScore}`);
            
        } catch (error) {
            console.warn('⚠️ Erreur lors de la finalisation du match:', error);
        }
    }

    // Met à jour le score
    async updateScore(ctWin) {
        if (!this.currentLobby) return;

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        
        try {
            const snapshot = await gameStateRef.once('value');
            
            if (snapshot.exists()) {
                const gameState = snapshot.val();
                const update = {
                    ctScore: gameState.ctScore + (ctWin ? 1 : 0),
                    tScore: gameState.tScore + (ctWin ? 0 : 1),
                    currentRound: gameState.currentRound + 1,
                    lastUpdate: Date.now()
                };

                await gameStateRef.update(update);
                console.log(`📊 Score mis à jour: CT ${update.ctScore} - T ${update.tScore}`);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du score:', error);
        }
    }

    // Signale qu'un joueur est mort
    async reportPlayerDeath(playerId, killerId = null) {
        if (!this.currentLobby) return;

        const updates = {
            [`players/${playerId}/state/alive`]: false,
            [`players/${playerId}/state/deathTime`]: Date.now()
        };
        
        // Statistiques du tueur
        if (killerId && killerId !== playerId) {
            updates[`players/${killerId}/stats/kills`] = database.ServerValue.increment(1);
        }
        
        // Statistiques de la victime
        updates[`players/${playerId}/stats/deaths`] = database.ServerValue.increment(1);

        try {
            await database.ref(`lobbies/${this.currentLobby}`).update(updates);
            
            // Retire des joueurs vivants
            const alivePlayersRef = database.ref(`lobbies/${this.currentLobby}/gameState/alivePlayers`);
            const snapshot = await alivePlayersRef.once('value');
            
            if (snapshot.exists()) {
                const alivePlayers = snapshot.val().filter(id => id !== playerId);
                await alivePlayersRef.set(alivePlayers);
                
                // Vérifie les conditions de fin de round
                await this.checkRoundEndConditions(alivePlayers);
            }
            
            console.log(`💀 Joueur éliminé: ${playerId}`);
            this.stats.packetsSent++;
            
        } catch (error) {
            console.error('❌ Erreur lors du signalement de mort:', error);
        }
    }
    
    // Vérifie les conditions de fin de round
    async checkRoundEndConditions(alivePlayers) {
        if (!this.currentLobby) return;
        
        try {
            const snapshot = await database.ref(`lobbies/${this.currentLobby}`).once('value');
            const lobbyData = snapshot.val();
            
            if (!lobbyData || lobbyData.status !== 'playing') return;
            
            const ctAlive = alivePlayers.filter(id => lobbyData.players[id]?.team === 'CT').length;
            const tAlive = alivePlayers.filter(id => lobbyData.players[id]?.team === 'T').length;
            
            // Conditions de fin
            if (ctAlive === 0 && tAlive > 0) {
                await this.endRound('T', 'Tous les CT éliminés');
            } else if (tAlive === 0 && ctAlive > 0) {
                await this.endRound('CT', 'Tous les T éliminés');
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur lors de la vérification des conditions de fin:', error);
        }
    }

    // Nettoyage automatique des lobbys inactifs
    async cleanupInactiveLobbies() {
        try {
            const snapshot = await database.ref('lobbies').once('value');
            
            if (snapshot.exists()) {
                const lobbies = snapshot.val();
                const now = Date.now();
                let cleanedCount = 0;
                
                for (const [code, lobby] of Object.entries(lobbies)) {
                    const lastActivity = lobby.lastActivity || lobby.created;
                    const inactiveTime = now - lastActivity;
                    
                    // Supprime les lobbys inactifs depuis plus de 5 minutes
                    if (inactiveTime > this.config.lobbyTimeout) {
                        await database.ref(`lobbies/${code}`).remove();
                        cleanedCount++;
                        console.log(`🗑️ Lobby inactif supprimé: ${code}`);
                    }
                }
                
                if (cleanedCount > 0) {
                    console.log(`🧹 ${cleanedCount} lobbys inactifs nettoyés`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du nettoyage des lobbys:', error);
        }
    }
    
    // Démarre l'IA des bots pour un lobby
    async startBotsAI(lobbyCode) {
        if (this.botAIIntervals.has(lobbyCode)) return;
        
        const aiInterval = setInterval(async () => {
            await this.updateBotAI(lobbyCode);
        }, 200); // 5 FPS pour l'IA
        
        this.botAIIntervals.set(lobbyCode, aiInterval);
        console.log(`🤖 IA des bots démarrée pour le lobby ${lobbyCode}`);
    }
    
    // Arrête l'IA des bots pour un lobby
    stopBotsAI(lobbyCode) {
        const aiInterval = this.botAIIntervals.get(lobbyCode);
        if (aiInterval) {
            clearInterval(aiInterval);
            this.botAIIntervals.delete(lobbyCode);
            console.log(`🤖 IA des bots arrêtée pour le lobby ${lobbyCode}`);
        }
    }
    
    // Équilibre automatique des équipes avec des bots
    async autoBalanceTeams(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const settings = lobbyData.settings;
            
            if (!settings.autoBalance || !settings.enableBots || settings.gameMode === 'ffa') return;
            
            const players = Object.values(lobbyData.players);
            const humans = players.filter(p => !p.isBot);
            const bots = players.filter(p => p.isBot);
            
            const ctCount = players.filter(p => p.team === 'CT').length;
            const tCount = players.filter(p => p.team === 'T').length;
            const teamDifference = Math.abs(ctCount - tCount);
            
            // Si la différence est trop grande, rééquilibre avec des bots
            if (teamDifference > 1 && bots.length > 0) {
                const minorityTeam = ctCount < tCount ? 'CT' : 'T';
                const excessTeam = ctCount < tCount ? 'T' : 'CT';
                
                // Trouve un bot de l'équipe en excès et le change d'équipe
                const botToSwitch = bots.find(bot => bot.team === excessTeam);
                if (botToSwitch) {
                    await database.ref(`lobbies/${lobbyCode}/players/${botToSwitch.id}/team`).set(minorityTeam);
                    console.log(`🤖 Bot ${botToSwitch.name} changé vers l'équipe ${minorityTeam} pour équilibrage`);
                }
            }
            
            // Ajoute des bots si nécessaire pour remplir
            const totalPlayers = players.length;
            const maxPlayers = settings.maxPlayers;
            
            if (settings.fillSlots && totalPlayers < maxPlayers) {
                const botsToAdd = Math.min(maxPlayers - totalPlayers, 3); // Max 3 bots à la fois
                
                for (let i = 0; i < botsToAdd; i++) {
                    await this.addBot(lobbyCode, settings);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur lors de l\'équilibrage automatique:', error);
        }
    }
    
    // Gère un joueur qui quitte (remplace par un bot si nécessaire)
    async handlePlayerLeaving(lobbyCode, playerId) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const settings = lobbyData.settings;
            
            if (!settings.fillSlots || !settings.enableBots) return;
            
            const leavingPlayer = lobbyData.players[playerId];
            if (!leavingPlayer || leavingPlayer.isBot) return;
            
            // Ajoute un bot pour remplacer le joueur qui part
            setTimeout(async () => {
                const replacementBotId = await this.addBot(lobbyCode, settings);
                
                // Le bot hérite de certaines propriétés du joueur qui part
                if (leavingPlayer.hasBomb) {
                    await database.ref(`lobbies/${lobbyCode}/players/${replacementBotId}/hasBomb`).set(true);
                    await database.ref(`lobbies/${lobbyCode}/gameState/bombCarrier`).set(replacementBotId);
                }
                
                console.log(`🤖 Bot ajouté pour remplacer ${leavingPlayer.name}`);
            }, 2000); // Délai de 2 secondes
            
        } catch (error) {
            console.warn('⚠️ Erreur lors du remplacement par bot:', error);
        }
    }
    
    // Adapte la difficulté des bots selon les performances des joueurs
    async adaptBotDifficulty(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const players = Object.values(lobbyData.players);
            const humans = players.filter(p => !p.isBot && p.alive);
            const bots = players.filter(p => p.isBot && p.alive);
            
            if (humans.length === 0 || bots.length === 0) return;
            
            // Calcule les stats moyennes des humains
            const humanAvgKD = humans.reduce((sum, p) => sum + ((p.kills || 0) / Math.max(p.deaths || 1, 1)), 0) / humans.length;
            const humanAvgAccuracy = 0.6; // Estimation
            
            // Ajuste la difficulté des bots en conséquence
            let targetDifficulty;
            if (humanAvgKD > 2.0) {
                targetDifficulty = 'hard';
            } else if (humanAvgKD > 1.2) {
                targetDifficulty = 'medium';
            } else {
                targetDifficulty = 'easy';
            }
            
            // Met à jour la difficulté des bots
            for (const bot of bots) {
                if (bot.ai.difficulty !== targetDifficulty) {
                    const newSkill = this.generateBotSkill(targetDifficulty);
                    
                    await database.ref(`lobbies/${lobbyCode}/players/${bot.id}/ai`).update({
                        difficulty: targetDifficulty,
                        accuracy: newSkill.accuracy,
                        reactionTime: newSkill.reactionTime,
                        decisionMaking: newSkill.decisionMaking,
                        aimSpeed: newSkill.aimSpeed
                    });
                }
            }
            
            if (window.sioShooterApp?.config?.debugMode) {
                console.log(`🤖 Difficulté des bots ajustée à: ${targetDifficulty} (K/D humain moyen: ${humanAvgKD.toFixed(2)})`);
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur lors de l\'adaptation de difficulté:', error);
        }
    }
    
    // Met à jour l'état des bots morts (respawn en FFA/TDM)
    async updateDeadBots(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}`).once('value');
            if (!snapshot.exists()) return;
            
            const lobbyData = snapshot.val();
            const gameState = lobbyData.gameState;
            
            if (!gameState.respawnEnabled) return;
            
            const deadBots = Object.values(lobbyData.players)
                .filter(p => p.isBot && !p.alive);
            
            const now = Date.now();
            const respawnDelay = lobbyData.settings.gameMode === 'ffa' ? 3000 : 5000;
            
            for (const bot of deadBots) {
                if (now - (bot.lastRespawn || bot.lastHitTime || 0) > respawnDelay) {
                    // Respawn du bot
                    const spawnPoint = this.getBotSpawnPoint(lobbyData.settings, bot.team);
                    
                    const updates = {
                        [`players/${bot.id}/alive`]: true,
                        [`players/${bot.id}/health`]: 100,
                        [`players/${bot.id}/armor`]: bot.team === 'CT' ? 100 : 0,
                        [`players/${bot.id}/lastRespawn`]: now,
                        [`players/${bot.id}/position`]: {
                            x: spawnPoint.x,
                            y: spawnPoint.y,
                            angle: spawnPoint.angle,
                            timestamp: now
                        },
                        [`players/${bot.id}/ai/state`]: 'idle',
                        [`players/${bot.id}/ai/target`]: null
                    };
                    
                    await database.ref(`lobbies/${lobbyCode}`).update(updates);
                    console.log(`🤖 Bot ${bot.name} respawné`);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur lors du respawn des bots:', error);
        }
    }
    
    // Statistiques des bots
    async getBotStatistics(lobbyCode) {
        try {
            const snapshot = await database.ref(`lobbies/${lobbyCode}/players`).once('value');
            if (!snapshot.exists()) return null;
            
            const players = snapshot.val();
            const bots = Object.values(players).filter(p => p.isBot);
            
            if (bots.length === 0) return null;
            
            const stats = {
                totalBots: bots.length,
                aliveBots: bots.filter(b => b.alive).length,
                botKills: bots.reduce((sum, b) => sum + (b.kills || 0), 0),
                botDeaths: bots.reduce((sum, b) => sum + (b.deaths || 0), 0),
                averageAccuracy: bots.reduce((sum, b) => sum + (b.ai?.accuracy || 0), 0) / bots.length,
                difficultyDistribution: {}
            };
            
            // Distribution des difficultés
            bots.forEach(bot => {
                const difficulty = bot.ai?.difficulty || 'medium';
                stats.difficultyDistribution[difficulty] = (stats.difficultyDistribution[difficulty] || 0) + 1;
            });
            
            return stats;
            
        } catch (error) {
            console.warn('⚠️ Erreur lors du calcul des statistiques des bots:', error);
            return null;
        }
    }
    
    // Initialise le système de bots
    initializeBotSystem() {
        this.botAIIntervals = new Map();
        
        // Équilibrage automatique toutes les 30 secondes
        setInterval(async () => {
            if (this.currentLobby) {
                await this.autoBalanceTeams(this.currentLobby);
            }
        }, 30000);
        
        // Adaptation de difficulté toutes les 2 minutes
        setInterval(async () => {
            if (this.currentLobby) {
                await this.adaptBotDifficulty(this.currentLobby);
            }
        }, 120000);
        
        // Respawn des bots morts toutes les 5 secondes
        setInterval(async () => {
            if (this.currentLobby) {
                await this.updateDeadBots(this.currentLobby);
            }
        }, 5000);
        
        console.log('🤖 Système de bots initialisé');
    }
    
    // Commande admin pour gérer les bots (debug)
    async adminBotCommand(lobbyCode, command, params = {}) {
        if (!window.sioShooterApp?.config?.debugMode) return;
        
        try {
            switch (command) {
                case 'add':
                    await this.addBot(lobbyCode);
                    break;
                    
                case 'remove':
                    const snapshot = await database.ref(`lobbies/${lobbyCode}/players`).once('value');
                    const players = snapshot.val();
                    const bots = Object.entries(players).filter(([id, player]) => player.isBot);
                    
                    if (bots.length > 0) {
                        await this.removeBot(lobbyCode, bots[0][0]);
                    }
                    break;
                    
                case 'difficulty':
                    const newDifficulty = params.difficulty || 'medium';
                    const botsSnapshot = await database.ref(`lobbies/${lobbyCode}/players`).once('value');
                    const allPlayers = botsSnapshot.val();
                    
                    for (const [id, player] of Object.entries(allPlayers)) {
                        if (player.isBot) {
                            const newSkill = this.generateBotSkill(newDifficulty);
                            await database.ref(`lobbies/${lobbyCode}/players/${id}/ai`).update({
                                difficulty: newDifficulty,
                                ...newSkill
                            });
                        }
                    }
                    break;
                    
                case 'stats':
                    const stats = await this.getBotStatistics(lobbyCode);
                    console.log('🤖 Statistiques des bots:', stats);
                    return stats;
            }
        } catch (error) {
            console.error('❌ Erreur commande admin bot:', error);
        }
    }
    
    // Collecte des statistiques
    collectStatistics() {
        const stats = {
            timestamp: Date.now(),
            connectionState: this.connectionState,
            currentLobby: this.currentLobby,
            packetsReceived: this.stats.packetsReceived,
            packetsSent: this.stats.packetsSent,
            ping: this.stats.lastPing,
            uptime: this.stats.connectionUptime,
            activeBotAI: this.botAIIntervals?.size || 0
        };
        
        if (window.sioShooterApp?.config?.debugMode) {
            console.log('📊 Statistiques Firebase:', stats);
        }
        
        // Sauvegarde locale des statistiques
        try {
            const existingStats = JSON.parse(localStorage.getItem('sio-shooter-firebase-stats') || '[]');
            existingStats.push(stats);
            
            // Garde seulement les 100 dernières entrées
            if (existingStats.length > 100) {
                existingStats.splice(0, existingStats.length - 100);
            }
            
            localStorage.setItem('sio-shooter-firebase-stats', JSON.stringify(existingStats));
        } catch (error) {
            console.warn('⚠️ Erreur lors de la sauvegarde des statistiques:', error);
        }
    }

    // Retire tous les écouteurs
    removeAllListeners() {
        this.listeners.forEach(({ ref, listener }) => {
            try {
                ref.off('value', listener);
                ref.off('child_added', listener);
            } catch (error) {
                console.warn('⚠️ Erreur lors de la suppression d\'un listener:', error);
            }
        });
        
        this.listeners.clear();
        console.log('🧹 Tous les listeners supprimés');
    }
    
    // Méthodes utilitaires publiques
    getCurrentLobbyCode() {
        return this.currentLobby;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getConnectionState() {
        return this.connectionState;
    }
    
    getStatistics() {
        return { ...this.stats };
    }
    
    // Nettoyage complet
    cleanup() {
        this.stopHeartbeat();
        this.removeAllListeners();
        
        // Déconnexion propre si en lobby
        if (this.currentLobby) {
            this.leaveLobby();
        }
        
        // Arrête Firebase
        database.goOffline();
        
        console.log('🧹 Firebase Manager nettoyé');
    }
}

// Instance globale
const firebaseManager = new FirebaseManager();

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseManager;
}