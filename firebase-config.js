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
const auth = firebase.auth();

// Variables globales Firebase
let currentUser = null;
let currentLobby = null;
let currentMatch = null;

// Classe de gestion multijoueur
class MultiplayerManager {
    constructor() {
        this.playerId = null;
        this.playerTeam = null;
        this.lobbyId = null;
        this.matchId = null;
        this.isHost = false;
        this.connectedPlayers = {};
        this.syncInterval = null;
        
        this.setupAuth();
    }

    async setupAuth() {
        // Connexion anonyme pour simplifier
        try {
            const result = await auth.signInAnonymously();
            this.playerId = result.user.uid;
            currentUser = result.user;
            
            // Générer un pseudo aléatoire
            const randomNames = ['Sniper', 'Rusher', 'Lurker', 'Support', 'Entry', 'AWPer', 'Rifler', 'IGL'];
            const randomNumber = Math.floor(Math.random() * 9999);
            this.playerName = randomNames[Math.floor(Math.random() * randomNames.length)] + randomNumber;
            
            console.log('Connecté en tant que:', this.playerName);
            this.showMultiplayerMenu();
            
        } catch (error) {
            console.error('Erreur de connexion:', error);
            alert('Erreur de connexion au serveur');
        }
    }

    showMultiplayerMenu() {
        const menu = document.getElementById('menu');
        menu.innerHTML = `
            <h1>MINI CSGO: WEB STRIKE</h1>
            <div style="margin: 20px 0; color: #00ff00;">
                Connecté en tant que: <strong>${this.playerName}</strong>
            </div>
            
            <button onclick="multiplayer.createLobby()">CRÉER UN LOBBY</button>
            <button onclick="multiplayer.showJoinLobby()">REJOINDRE UN LOBBY</button>
            <button onclick="multiplayer.findMatch()">RECHERCHE RAPIDE</button>
            <button onclick="multiplayer.showSoloMode()">MODE SOLO (BOTS)</button>
            
            <div id="lobbyList" style="margin-top: 20px; max-height: 200px; overflow-y: auto;">
                <h3>Lobbies disponibles:</h3>
                <div id="availableLobbies">Chargement...</div>
            </div>
            
            <div id="joinLobbyDiv" style="display: none; margin-top: 20px;">
                <input type="text" id="lobbyIdInput" placeholder="ID du lobby" style="padding: 10px; margin: 5px;">
                <button onclick="multiplayer.joinLobby()">REJOINDRE</button>
                <button onclick="multiplayer.hideJoinLobby()">ANNULER</button>
            </div>
        `;
        
        this.loadAvailableLobbies();
        setInterval(() => this.loadAvailableLobbies(), 3000);
    }

    async loadAvailableLobbies() {
        try {
            const lobbiesRef = database.ref('lobbies');
            const snapshot = await lobbiesRef.once('value');
            const lobbies = snapshot.val() || {};
            
            const lobbiesList = document.getElementById('availableLobbies');
            if (!lobbiesList) return;
            
            const availableLobbies = Object.entries(lobbies)
                .filter(([id, lobby]) => lobby.status === 'waiting' && Object.keys(lobby.players || {}).length < 10)
                .slice(0, 5);
            
            if (availableLobbies.length === 0) {
                lobbiesList.innerHTML = '<div style="color: #666;">Aucun lobby disponible</div>';
                return;
            }
            
            lobbiesList.innerHTML = availableLobbies.map(([id, lobby]) => {
                const playerCount = Object.keys(lobby.players || {}).length;
                const mapName = lobby.map || 'dust2';
                const hostName = lobby.hostName || 'Host';
                
                return `
                    <div style="background: rgba(0,0,0,0.3); margin: 5px 0; padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${hostName}'s Lobby</strong><br>
                            <small>Map: ${mapName} | Joueurs: ${playerCount}/10</small>
                        </div>
                        <button onclick="multiplayer.joinLobbyById('${id}')" style="padding: 5px 10px;">
                            REJOINDRE
                        </button>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Erreur lors du chargement des lobbies:', error);
        }
    }

    async createLobby() {
        try {
            this.lobbyId = 'lobby_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.isHost = true;
            
            const lobbyData = {
                hostId: this.playerId,
                hostName: this.playerName,
                status: 'waiting', // waiting, starting, ingame
                map: 'dust2',
                mode: 'bomb_defusal',
                maxPlayers: 10,
                created: firebase.database.ServerValue.TIMESTAMP,
                players: {
                    [this.playerId]: {
                        name: this.playerName,
                        team: null,
                        ready: false,
                        isBot: false
                    }
                }
            };
            
            await database.ref(`lobbies/${this.lobbyId}`).set(lobbyData);
            this.showLobbyInterface();
            
        } catch (error) {
            console.error('Erreur création lobby:', error);
            alert('Erreur lors de la création du lobby');
        }
    }

    showJoinLobby() {
        document.getElementById('joinLobbyDiv').style.display = 'block';
    }

    hideJoinLobby() {
        document.getElementById('joinLobbyDiv').style.display = 'none';
    }

    async joinLobby() {
        const lobbyId = document.getElementById('lobbyIdInput').value.trim();
        if (lobbyId) {
            await this.joinLobbyById(lobbyId);
        }
    }

    async joinLobbyById(lobbyId) {
        try {
            this.lobbyId = lobbyId;
            
            // Vérifier si le lobby existe
            const lobbyRef = database.ref(`lobbies/${lobbyId}`);
            const snapshot = await lobbyRef.once('value');
            
            if (!snapshot.exists()) {
                alert('Lobby introuvable');
                return;
            }
            
            const lobbyData = snapshot.val();
            const playerCount = Object.keys(lobbyData.players || {}).length;
            
            if (playerCount >= 10) {
                alert('Lobby complet');
                return;
            }
            
            if (lobbyData.status !== 'waiting') {
                alert('La partie a déjà commencé');
                return;
            }
            
            // Rejoindre le lobby
            await database.ref(`lobbies/${lobbyId}/players/${this.playerId}`).set({
                name: this.playerName,
                team: null,
                ready: false,
                isBot: false
            });
            
            this.showLobbyInterface();
            
        } catch (error) {
            console.error('Erreur lors de la connexion au lobby:', error);
            alert('Impossible de rejoindre le lobby');
        }
    }

    async findMatch() {
        // Recherche rapide - rejoindre un lobby existant ou en créer un
        try {
            const lobbiesRef = database.ref('lobbies');
            const snapshot = await lobbiesRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value');
            const lobbies = snapshot.val();
            
            if (lobbies) {
                const lobbyId = Object.keys(lobbies)[0];
                const lobby = lobbies[lobbyId];
                const playerCount = Object.keys(lobby.players || {}).length;
                
                if (playerCount < 10) {
                    await this.joinLobbyById(lobbyId);
                    return;
                }
            }
            
            // Aucun lobby disponible, en créer un
            await this.createLobby();
            
        } catch (error) {
            console.error('Erreur recherche rapide:', error);
            await this.createLobby();
        }
    }

    showSoloMode() {
        // Mode solo avec bots
        startGame();
    }

    showLobbyInterface() {
        const menu = document.getElementById('menu');
        menu.innerHTML = `
            <h1>LOBBY: ${this.lobbyId}</h1>
            <div style="color: #00ff00; margin: 10px 0;">
                Lobby ID: <strong>${this.lobbyId}</strong> (partagez avec vos amis)
            </div>
            
            <div id="lobbyPlayers" style="display: flex; justify-content: space-between; margin: 20px 0;">
                <div style="flex: 1; margin-right: 10px;">
                    <h3 style="color: #4CAF50;">COUNTER-TERRORISTS</h3>
                    <div id="teamCT" style="min-height: 200px; background: rgba(76,175,80,0.1); padding: 10px; border-radius: 5px;">
                    </div>
                </div>
                <div style="flex: 1; margin-left: 10px;">
                    <h3 style="color: #F44336;">TERRORISTS</h3>
                    <div id="teamT" style="min-height: 200px; background: rgba(244,67,54,0.1); padding: 10px; border-radius: 5px;">
                    </div>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <button onclick="multiplayer.joinTeam('CT')" style="background: #4CAF50;">REJOINDRE CT</button>
                <button onclick="multiplayer.joinTeam('T')" style="background: #F44336;">REJOINDRE T</button>
                <button onclick="multiplayer.toggleReady()" id="readyBtn">PAS PRÊT</button>
            </div>
            
            <div id="hostControls" style="display: ${this.isHost ? 'block' : 'none'};">
                <h3>Contrôles d'hôte:</h3>
                <button onclick="multiplayer.fillWithBots()">REMPLIR AVEC DES BOTS</button>
                <button onclick="multiplayer.startMatch()" id="startBtn" disabled>COMMENCER LA PARTIE</button>
                <select id="mapSelect" onchange="multiplayer.changeMap()">
                    <option value="dust2">Dust II</option>
                    <option value="mirage">Mirage</option>
                    <option value="inferno">Inferno</option>
                </select>
            </div>
            
            <button onclick="multiplayer.leaveLobby()" style="background: #666;">QUITTER LE LOBBY</button>
        `;
        
        this.setupLobbyListeners();
    }

    setupLobbyListeners() {
        if (!this.lobbyId) return;
        
        // Écouter les changements du lobby
        const lobbyRef = database.ref(`lobbies/${this.lobbyId}`);
        
        lobbyRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                alert('Le lobby a été fermé');
                this.leaveLobby();
                return;
            }
            
            const lobbyData = snapshot.val();
            this.updateLobbyDisplay(lobbyData);
            
            // Démarrer la partie si l'hôte a lancé
            if (lobbyData.status === 'starting' && !gameRunning) {
                this.startMultiplayerMatch(lobbyData);
            }
        });
    }

    updateLobbyDisplay(lobbyData) {
        const players = lobbyData.players || {};
        const teamCT = document.getElementById('teamCT');
        const teamT = document.getElementById('teamT');
        
        if (!teamCT || !teamT) return;
        
        // Répartir les joueurs par équipe
        const ctPlayers = Object.entries(players).filter(([id, player]) => player.team === 'CT');
        const tPlayers = Object.entries(players).filter(([id, player]) => player.team === 'T');
        const unassignedPlayers = Object.entries(players).filter(([id, player]) => !player.team);
        
        // Afficher équipe CT
        teamCT.innerHTML = ctPlayers.map(([id, player]) => `
            <div style="padding: 5px; margin: 2px 0; background: rgba(255,255,255,0.1); border-radius: 3px; display: flex; justify-content: space-between;">
                <span>${player.name} ${player.isBot ? '(BOT)' : ''}</span>
                <span style="color: ${player.ready ? '#4CAF50' : '#F44336'};">
                    ${player.ready ? '✓' : '✗'}
                </span>
            </div>
        `).join('') + (ctPlayers.length < 5 ? `<div style="color: #666; padding: 5px;">Places libres: ${5 - ctPlayers.length}</div>` : '');
        
        // Afficher équipe T
        teamT.innerHTML = tPlayers.map(([id, player]) => `
            <div style="padding: 5px; margin: 2px 0; background: rgba(255,255,255,0.1); border-radius: 3px; display: flex; justify-content: space-between;">
                <span>${player.name} ${player.isBot ? '(BOT)' : ''}</span>
                <span style="color: ${player.ready ? '#4CAF50' : '#F44336'};">
                    ${player.ready ? '✓' : '✗'}
                </span>
            </div>
        `).join('') + (tPlayers.length < 5 ? `<div style="color: #666; padding: 5px;">Places libres: ${5 - tPlayers.length}</div>` : '');
        
        // Joueurs non assignés
        if (unassignedPlayers.length > 0) {
            const unassignedDiv = document.createElement('div');
            unassignedDiv.innerHTML = `
                <h4>Joueurs en attente:</h4>
                ${unassignedPlayers.map(([id, player]) => `
                    <div style="padding: 3px; color: #666;">${player.name}</div>
                `).join('')}
            `;
            teamCT.appendChild(unassignedDiv);
        }
        
        // Mettre à jour le bouton ready
        const currentPlayer = players[this.playerId];
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn && currentPlayer) {
            readyBtn.textContent = currentPlayer.ready ? 'PRÊT ✓' : 'PAS PRÊT';
            readyBtn.style.background = currentPlayer.ready ? '#4CAF50' : '#666';
        }
        
        // Vérifier si tous les joueurs sont prêts
        const allReady = Object.values(players).every(player => player.ready);
        const hasEnoughPlayers = ctPlayers.length > 0 && tPlayers.length > 0;
        
        const startBtn = document.getElementById('startBtn');
        if (startBtn && this.isHost) {
            startBtn.disabled = !allReady || !hasEnoughPlayers;
            startBtn.style.background = (!allReady || !hasEnoughPlayers) ? '#666' : '#00ff00';
        }
    }

    async joinTeam(team) {
        if (!this.lobbyId) return;
        
        try {
            // Vérifier si l'équipe n'est pas pleine
            const snapshot = await database.ref(`lobbies/${this.lobbyId}/players`).once('value');
            const players = snapshot.val() || {};
            const teamCount = Object.values(players).filter(p => p.team === team).length;
            
            if (teamCount >= 5) {
                alert('Cette équipe est complète');
                return;
            }
            
            await database.ref(`lobbies/${this.lobbyId}/players/${this.playerId}/team`).set(team);
            this.playerTeam = team;
            
        } catch (error) {
            console.error('Erreur rejoindre équipe:', error);
        }
    }

    async toggleReady() {
        if (!this.lobbyId) return;
        
        try {
            const snapshot = await database.ref(`lobbies/${this.lobbyId}/players/${this.playerId}/ready`).once('value');
            const currentReady = snapshot.val() || false;
            
            await database.ref(`lobbies/${this.lobbyId}/players/${this.playerId}/ready`).set(!currentReady);
            
        } catch (error) {
            console.error('Erreur toggle ready:', error);
        }
    }

    async fillWithBots() {
        if (!this.isHost || !this.lobbyId) return;
        
        try {
            const snapshot = await database.ref(`lobbies/${this.lobbyId}/players`).once('value');
            const players = snapshot.val() || {};
            
            const ctPlayers = Object.values(players).filter(p => p.team === 'CT').length;
            const tPlayers = Object.values(players).filter(p => p.team === 'T').length;
            
            const botNames = [
                'Bot_Mike', 'Bot_Sarah', 'Bot_Alex', 'Bot_Emma', 'Bot_John',
                'Bot_Lisa', 'Bot_David', 'Bot_Maria', 'Bot_Tom', 'Bot_Anna'
            ];
            
            let botIndex = 0;
            
            // Remplir l'équipe CT
            for (let i = ctPlayers; i < 5 && botIndex < botNames.length; i++) {
                const botId = 'bot_' + Date.now() + '_' + botIndex;
                await database.ref(`lobbies/${this.lobbyId}/players/${botId}`).set({
                    name: botNames[botIndex],
                    team: 'CT',
                    ready: true,
                    isBot: true
                });
                botIndex++;
            }
            
            // Remplir l'équipe T
            for (let i = tPlayers; i < 5 && botIndex < botNames.length; i++) {
                const botId = 'bot_' + Date.now() + '_' + botIndex;
                await database.ref(`lobbies/${this.lobbyId}/players/${botId}`).set({
                    name: botNames[botIndex],
                    team: 'T',
                    ready: true,
                    isBot: true
                });
                botIndex++;
            }
            
        } catch (error) {
            console.error('Erreur ajout bots:', error);
        }
    }

    async changeMap() {
        if (!this.isHost || !this.lobbyId) return;
        
        const mapSelect = document.getElementById('mapSelect');
        const selectedMap = mapSelect.value;
        
        try {
            await database.ref(`lobbies/${this.lobbyId}/map`).set(selectedMap);
        } catch (error) {
            console.error('Erreur changement de map:', error);
        }
    }

    async startMatch() {
        if (!this.isHost || !this.lobbyId) return;
        
        try {
            // Créer une nouvelle partie
            this.matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const snapshot = await database.ref(`lobbies/${this.lobbyId}`).once('value');
            const lobbyData = snapshot.val();
            
            const matchData = {
                id: this.matchId,
                lobbyId: this.lobbyId,
                players: lobbyData.players,
                map: lobbyData.map || 'dust2',
                mode: 'bomb_defusal',
                status: 'starting',
                rounds: {
                    current: 1,
                    maxRounds: 30,
                    ctScore: 0,
                    tScore: 0
                },
                bomb: {
                    planted: false,
                    defused: false,
                    timer: 0,
                    position: null,
                    plantedBy: null
                },
                roundTimer: 115, // 1:55 comme CSGO
                created: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Créer la partie
            await database.ref(`matches/${this.matchId}`).set(matchData);
            
            // Mettre à jour le lobby
            await database.ref(`lobbies/${this.lobbyId}/status`).set('starting');
            await database.ref(`lobbies/${this.lobbyId}/matchId`).set(this.matchId);
            
        } catch (error) {
            console.error('Erreur démarrage partie:', error);
        }
    }

    async startMultiplayerMatch(lobbyData) {
        this.matchId = lobbyData.matchId;
        currentMatch = lobbyData;
        
        // Cacher le menu, afficher le HUD
        document.getElementById('menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        
        // Initialiser le jeu multijoueur
        if (!gameInstance.isInitialized) {
            gameInstance.init();
        }
        
        // Configurer le mode multijoueur
        CONFIG.GAME.MODE = 'bomb_defusal';
        CONFIG.GAME.MAX_ROUNDS = 30;
        CONFIG.GAME.ROUND_TIME = 115;
        
        // Démarrer la partie
        gameRunning = true;
        gameInstance.startMultiplayerRound(lobbyData.players, this.playerTeam);
        
        // Écouter les mises à jour de la partie
        this.setupMatchListeners();
    }

    setupMatchListeners() {
        if (!this.matchId) return;
        
        const matchRef = database.ref(`matches/${this.matchId}`);
        
        matchRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const matchData = snapshot.val();
                this.updateMatchState(matchData);
            }
        });
        
        // Synchroniser la position du joueur
        this.startPlayerSync();
    }

    startPlayerSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (gameRunning && camera && this.matchId) {
                this.syncPlayerPosition();
            }
        }, 100); // Sync toutes les 100ms
    }

    async syncPlayerPosition() {
        if (!this.matchId || !camera) return;
        
        try {
            const playerData = {
                position: {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                },
                rotation: {
                    x: camera.rotation.x,
                    y: camera.rotation.y
                },
                health: player ? player.health : 100,
                alive: player ? player.health > 0 : true,
                team: this.playerTeam,
                timestamp: Date.now()
            };
            
            await database.ref(`matches/${this.matchId}/playersState/${this.playerId}`).set(playerData);
            
        } catch (error) {
            // Ignorer les erreurs de sync pour éviter le spam
        }
    }

    updateMatchState(matchData) {
        // Mettre à jour l'état de la bombe
        if (matchData.bomb) {
            this.updateBombState(matchData.bomb);
        }
        
        // Mettre à jour le score
        if (matchData.rounds) {
            this.updateScoreDisplay(matchData.rounds);
        }
        
        // Mettre à jour les positions des autres joueurs
        if (matchData.playersState) {
            this.updateOtherPlayers(matchData.playersState);
        }
    }

    updateBombState(bombData) {
        const bombStatus = document.getElementById('bombStatus');
        if (!bombStatus) {
            // Créer l'affichage de la bombe
            const statusDiv = document.createElement('div');
            statusDiv.id = 'bombStatus';
            statusDiv.style.cssText = `
                position: absolute;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-size: 18px;
                text-align: center;
                z-index: 1500;
            `;
            document.body.appendChild(statusDiv);
        }
        
        if (bombData.planted && !bombData.defused) {
            const timeLeft = Math.max(0, 40 - Math.floor((Date.now() - bombData.plantedAt) / 1000));
            document.getElementById('bombStatus').innerHTML = `
                <div style="color: #ff0000; font-weight: bold;">
                    💣 BOMBE PLANTÉE: ${timeLeft}s
                </div>
            `;
            
            if (timeLeft <= 0) {
                // Explosion !
                this.bombExploded();
            }
        } else if (bombData.defused) {
            document.getElementById('bombStatus').innerHTML = `
                <div style="color: #00ff00; font-weight: bold;">
                    ✅ BOMBE DÉSAMORCÉE
                </div>
            `;
        } else {
            const statusElement = document.getElementById('bombStatus');
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        }
    }

    updateScoreDisplay(rounds) {
        let scoreElement = document.getElementById('matchScore');
        if (!scoreElement) {
            scoreElement = document.createElement('div');
            scoreElement.id = 'matchScore';
            scoreElement.style.cssText = `
                position: absolute;
                top: 30px;
                right: 200px;
                background: rgba(0,0,0,0.8);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-size: 16px;
                text-align: center;
                z-index: 1500;
            `;
            document.body.appendChild(scoreElement);
        }
        
        scoreElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; min-width: 100px;">
                <span style="color: #4CAF50;">CT: ${rounds.ctScore}</span>
                <span style="color: #F44336;">T: ${rounds.tScore}</span>
            </div>
            <div style="font-size: 12px; color: #ccc;">
                Round ${rounds.current}/${rounds.maxRounds}
            </div>
        `;
    }

    updateOtherPlayers(playersState) {
        // Cette fonction sera utilisée pour afficher les autres joueurs
        // Pour l'instant, on va juste les logger
        Object.entries(playersState).forEach(([playerId, playerState]) => {
            if (playerId !== this.playerId && playerState.alive) {
                // TODO: Créer/mettre à jour les meshs des autres joueurs
                this.updatePlayerMesh(playerId, playerState);
            }
        });
    }

    updatePlayerMesh(playerId, playerState) {
        // Créer ou mettre à jour le mesh d'un autre joueur
        // TODO: Implémenter l'affichage des autres joueurs
    }

    async plantBomb() {
        if (!this.matchId || this.playerTeam !== 'T') return;
        
        try {
            await database.ref(`matches/${this.matchId}/bomb`).update({
                planted: true,
                plantedAt: Date.now(),
                plantedBy: this.playerId,
                position: {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                }
            });
            
            SOUNDS.bombPlant();
            
        } catch (error) {
            console.error('Erreur plantation bombe:', error);
        }
    }

    async defuseBomb() {
        if (!this.matchId || this.playerTeam !== 'CT') return;
        
        try {
            await database.ref(`matches/${this.matchId}/bomb`).update({
                defused: true,
                defusedBy: this.playerId,
                defusedAt: Date.now()
            });
            
            SOUNDS.bombDefuse();
            
        } catch (error) {
            console.error('Erreur désamorçage bombe:', error);
        }
    }

    bombExploded() {
        // La bombe a explosé, les T gagnent le round
        this.endRound('T', 'Bomb exploded');
    }

    async endRound(winner, reason) {
        if (!this.isHost || !this.matchId) return;
        
        try {
            const matchRef = database.ref(`matches/${this.matchId}`);
            const snapshot = await matchRef.once('value');
            const matchData = snapshot.val();
            
            const rounds = matchData.rounds;
            
            if (winner === 'CT') {
                rounds.ctScore++;
            } else {
                rounds.tScore++;
            }
            
            rounds.current++;
            
            // Vérifier fin de match
            const halfRounds = Math.ceil(rounds.maxRounds / 2);
            if (rounds.ctScore > halfRounds || rounds.tScore > halfRounds || rounds.current > rounds.maxRounds) {
                // Fin de match
                await this.endMatch(rounds.ctScore > rounds.tScore ? 'CT' : 'T');
                return;
            }
            
            // Continuer avec le round suivant
            await matchRef.child('rounds').update(rounds);
            await matchRef.child('bomb').update({
                planted: false,
                defused: false,
                timer: 0,
                position: null,
                plantedBy: null
            });
            
            // Respawn des joueurs
            this.respawnPlayers();
            
        } catch (error) {
            console.error('Erreur fin de round:', error);
        }
    }

    async endMatch(winner) {
        gameRunning = false;
        
        alert(`Match terminé ! ${winner === 'CT' ? 'Counter-Terrorists' : 'Terrorists'} gagnent !`);
        
        // Nettoyer la partie
        if (this.matchId) {
            await database.ref(`matches/${this.matchId}`).remove();
        }
        
        this.leaveLobby();
    }

    respawnPlayers() {
        // Respawn du joueur
        if (player) {
            player.health = CONFIG.PLAYER.MAX_HEALTH;
            player.armor = CONFIG.PLAYER.MAX_ARMOR;
            
            // Position de spawn selon l'équipe
            const spawnPositions = this.getSpawnPositions();
            const teamSpawns = this.playerTeam === 'CT' ? spawnPositions.ct : spawnPositions.t;
            const randomSpawn = teamSpawns[Math.floor(Math.random() * teamSpawns.length)];
            
            camera.position.copy(randomSpawn);
            player.updateHUD();
        }
    }

    getSpawnPositions() {
        return {
            ct: [
                new THREE.Vector3(-20, 1.6, -20),
                new THREE.Vector3(-18, 1.6, -22),
                new THREE.Vector3(-22, 1.6, -18),
                new THREE.Vector3(-19, 1.6, -19),
                new THREE.Vector3(-21, 1.6, -21)
            ],
            t: [
                new THREE.Vector3(20, 1.6, 20),
                new THREE.Vector3(18, 1.6, 22),
                new THREE.Vector3(22, 1.6, 18),
                new THREE.Vector3(19, 1.6, 19),
                new THREE.Vector3(21, 1.6, 21)
            ]
        };
    }

    async leaveLobby() {
        try {
            if (this.lobbyId) {
                // Supprimer le joueur du lobby
                await database.ref(`lobbies/${this.lobbyId}/players/${this.playerId}`).remove();
                
                // Si c'est l'hôte et qu'il ne reste personne, supprimer le lobby
                if (this.isHost) {
                    const snapshot = await database.ref(`lobbies/${this.lobbyId}/players`).once('value');
                    const remainingPlayers = snapshot.val() || {};
                    
                    if (Object.keys(remainingPlayers).length === 0) {
                        await database.ref(`lobbies/${this.lobbyId}`).remove();
                    }
                }
            }
            
            // Arrêter la synchronisation
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }
            
            // Nettoyer les références Firebase
            database.ref(`lobbies/${this.lobbyId}`).off();
            database.ref(`matches/${this.matchId}`).off();
            
            // Réinitialiser les variables
            this.lobbyId = null;
            this.matchId = null;
            this.isHost = false;
            this.playerTeam = null;
            
            // Retourner au menu principal
            this.showMultiplayerMenu();
            
        } catch (error) {
            console.error('Erreur quitter lobby:', error);
            this.showMultiplayerMenu();
        }
    }

    destroy() {
        this.leaveLobby();
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Déconnexion Firebase
        if (auth.currentUser) {
            auth.signOut();
        }
    }
}

// Instance globale du gestionnaire multijoueur
let multiplayer = null;

// Initialiser le multijoueur quand Firebase est chargé
window.addEventListener('load', () => {
    // Attendre que Firebase soit chargé
    if (typeof firebase !== 'undefined') {
        multiplayer = new MultiplayerManager();
    } else {
        console.error('Firebase n\'est pas chargé');
    }
});