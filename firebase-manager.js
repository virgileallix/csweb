// Configuration Firebase
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

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Gestionnaire Firebase
class FirebaseManager {
    constructor() {
        this.currentUser = null;
        this.currentLobby = null;
        this.listeners = [];
    }

    // Génère un ID unique
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Génère un code de lobby
    generateLobbyCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    // Définit l'utilisateur actuel
    setCurrentUser(playerName) {
        this.currentUser = {
            id: this.generateId(),
            name: playerName,
            team: null,
            ready: false
        };
        return this.currentUser;
    }

    // Crée un nouveau lobby
    async createLobby() {
        const lobbyCode = this.generateLobbyCode();
        const lobbyData = {
            code: lobbyCode,
            host: this.currentUser.id,
            created: Date.now(),
            status: 'waiting',
            players: {
                [this.currentUser.id]: {
                    ...this.currentUser,
                    team: 'CT',
                    isHost: true
                }
            },
            settings: {
                maxPlayers: 10,
                roundTime: 120,
                maxRounds: 16
            },
            gameState: {
                ctScore: 0,
                tScore: 0,
                currentRound: 1,
                bombPlanted: false,
                bombDefused: false
            }
        };

        await database.ref(`lobbies/${lobbyCode}`).set(lobbyData);
        this.currentLobby = lobbyCode;
        return lobbyCode;
    }

    // Rejoint un lobby existant
    async joinLobby(lobbyCode) {
        const lobbyRef = database.ref(`lobbies/${lobbyCode}`);
        const snapshot = await lobbyRef.once('value');
        
        if (!snapshot.exists()) {
            throw new Error('Lobby introuvable');
        }

        const lobbyData = snapshot.val();
        const playerCount = Object.keys(lobbyData.players || {}).length;

        if (playerCount >= lobbyData.settings.maxPlayers) {
            throw new Error('Lobby complet');
        }

        if (lobbyData.status !== 'waiting') {
            throw new Error('La partie a déjà commencé');
        }

        // Détermine l'équipe avec le moins de joueurs
        let ctCount = 0, tCount = 0;
        Object.values(lobbyData.players).forEach(player => {
            if (player.team === 'CT') ctCount++;
            else if (player.team === 'T') tCount++;
        });

        const team = ctCount <= tCount ? 'CT' : 'T';

        // Ajoute le joueur
        await lobbyRef.child(`players/${this.currentUser.id}`).set({
            ...this.currentUser,
            team: team,
            isHost: false
        });

        this.currentLobby = lobbyCode;
        return lobbyCode;
    }

    // Quitte le lobby actuel
    async leaveLobby() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        const snapshot = await lobbyRef.once('value');
        
        if (snapshot.exists()) {
            const lobbyData = snapshot.val();
            
            // Supprime le joueur
            await lobbyRef.child(`players/${this.currentUser.id}`).remove();
            
            // Si c'était l'hôte et qu'il reste des joueurs, assigne un nouvel hôte
            if (lobbyData.host === this.currentUser.id) {
                const remainingPlayers = Object.keys(lobbyData.players || {})
                    .filter(id => id !== this.currentUser.id);
                
                if (remainingPlayers.length > 0) {
                    const newHost = remainingPlayers[0];
                    await lobbyRef.update({
                        host: newHost,
                        [`players/${newHost}/isHost`]: true
                    });
                } else {
                    // Supprime le lobby s'il est vide
                    await lobbyRef.remove();
                }
            }
        }

        this.removeAllListeners();
        this.currentLobby = null;
    }

    // Change d'équipe
    async switchTeam() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        const snapshot = await lobbyRef.once('value');
        
        if (snapshot.exists()) {
            const lobbyData = snapshot.val();
            const currentPlayer = lobbyData.players[this.currentUser.id];
            const newTeam = currentPlayer.team === 'CT' ? 'T' : 'CT';
            
            // Vérifie si l'équipe n'est pas pleine (max 5 par équipe)
            const teamCount = Object.values(lobbyData.players)
                .filter(p => p.team === newTeam).length;
            
            if (teamCount < 5) {
                await lobbyRef.child(`players/${this.currentUser.id}/team`).set(newTeam);
                this.currentUser.team = newTeam;
            }
        }
    }

    // Lance la partie
    async startGame() {
        if (!this.currentLobby || !this.currentUser) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        const snapshot = await lobbyRef.once('value');
        
        if (snapshot.exists()) {
            const lobbyData = snapshot.val();
            
            // Vérifie que c'est bien l'hôte
            if (lobbyData.host !== this.currentUser.id) {
                throw new Error("Seul l'hôte peut lancer la partie");
            }

            // Vérifie qu'il y a au moins 2 joueurs
            const playerCount = Object.keys(lobbyData.players || {}).length;
            if (playerCount < 2) {
                throw new Error("Il faut au moins 2 joueurs pour commencer");
            }

            // Initialise l'état du jeu
            const gameState = {
                status: 'playing',
                currentRound: 1,
                ctScore: 0,
                tScore: 0,
                roundStartTime: Date.now(),
                alivePlayers: Object.keys(lobbyData.players),
                bombCarrier: this.selectRandomTerrorist(lobbyData.players),
                bombPlanted: false,
                bombSite: null,
                bombPlantTime: null
            };

            await lobbyRef.update({
                status: 'playing',
                gameState: gameState
            });
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

    // Récupère la liste des lobbys
    async getLobbies() {
        const snapshot = await database.ref('lobbies').once('value');
        const lobbies = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.entries(data).forEach(([code, lobby]) => {
                if (lobby.status === 'waiting') {
                    lobbies.push({
                        code: code,
                        host: lobby.host,
                        playerCount: Object.keys(lobby.players || {}).length,
                        maxPlayers: lobby.settings.maxPlayers,
                        created: lobby.created
                    });
                }
            });
        }
        
        return lobbies.sort((a, b) => b.created - a.created);
    }

    // Écoute les changements dans le lobby
    listenToLobby(callback) {
        if (!this.currentLobby) return;

        const lobbyRef = database.ref(`lobbies/${this.currentLobby}`);
        const listener = lobbyRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback(null);
            }
        });

        this.listeners.push({ ref: lobbyRef, listener: listener });
    }

    // Écoute les messages du chat
    listenToChat(callback) {
        if (!this.currentLobby) return;

        const chatRef = database.ref(`lobbies/${this.currentLobby}/chat`);
        const listener = chatRef.on('child_added', (snapshot) => {
            callback(snapshot.val());
        });

        this.listeners.push({ ref: chatRef, listener: listener });
    }

    // Envoie un message dans le chat
    async sendChatMessage(message) {
        if (!this.currentLobby || !this.currentUser || !message.trim()) return;

        const chatRef = database.ref(`lobbies/${this.currentLobby}/chat`);
        await chatRef.push({
            playerId: this.currentUser.id,
            playerName: this.currentUser.name,
            message: message.trim(),
            timestamp: Date.now(),
            team: this.currentUser.team
        });
    }

    // Met à jour la position du joueur
    async updatePlayerPosition(x, y, angle) {
        if (!this.currentLobby || !this.currentUser) return;

        await database.ref(`lobbies/${this.currentLobby}/players/${this.currentUser.id}/position`).set({
            x: x,
            y: y,
            angle: angle,
            lastUpdate: Date.now()
        });
    }

    // Met à jour l'état du joueur
    async updatePlayerState(state) {
        if (!this.currentLobby || !this.currentUser) return;

        await database.ref(`lobbies/${this.currentLobby}/players/${this.currentUser.id}/state`).update(state);
    }

    // Plante la bombe
    async plantBomb(site) {
        if (!this.currentLobby || !this.currentUser) return;

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        await gameStateRef.update({
            bombPlanted: true,
            bombSite: site,
            bombPlantTime: Date.now(),
            bombPlantedBy: this.currentUser.id
        });
    }

    // Désamorce la bombe
    async defuseBomb() {
        if (!this.currentLobby || !this.currentUser) return;

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        await gameStateRef.update({
            bombDefused: true,
            bombDefusedBy: this.currentUser.id,
            bombDefuseTime: Date.now()
        });
    }

    // Met à jour le score
    async updateScore(ctWin) {
        if (!this.currentLobby) return;

        const gameStateRef = database.ref(`lobbies/${this.currentLobby}/gameState`);
        const snapshot = await gameStateRef.once('value');
        
        if (snapshot.exists()) {
            const gameState = snapshot.val();
            const update = {
                ctScore: gameState.ctScore + (ctWin ? 1 : 0),
                tScore: gameState.tScore + (ctWin ? 0 : 1),
                currentRound: gameState.currentRound + 1
            };

            await gameStateRef.update(update);
        }
    }

    // Signale qu'un joueur est mort
    async reportPlayerDeath(playerId) {
        if (!this.currentLobby) return;

        const alivePlayersRef = database.ref(`lobbies/${this.currentLobby}/gameState/alivePlayers`);
        const snapshot = await alivePlayersRef.once('value');
        
        if (snapshot.exists()) {
            const alivePlayers = snapshot.val().filter(id => id !== playerId);
            await alivePlayersRef.set(alivePlayers);
        }
    }

    // Retire tous les écouteurs
    removeAllListeners() {
        this.listeners.forEach(({ ref, listener }) => {
            ref.off('value', listener);
        });
        this.listeners = [];
    }
}

// Instance globale
const firebaseManager = new FirebaseManager();