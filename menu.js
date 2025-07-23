// Gestionnaire des menus et de la navigation
class MenuManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('menuScreen'),
            lobby: document.getElementById('lobbyScreen'),
            waiting: document.getElementById('waitingRoom'),
            game: document.getElementById('gameScreen')
        };
        
        this.currentScreen = 'menu';
        this.refreshInterval = null;
        
        this.initializeEventListeners();
    }

    // Initialise les écouteurs d'événements
    initializeEventListeners() {
        // Menu principal
        document.getElementById('playBtn').addEventListener('click', () => this.handlePlay());
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlay();
        });

        // Écran des lobbys
        document.getElementById('createLobbyBtn').addEventListener('click', () => this.createLobby());
        document.getElementById('refreshLobbiesBtn').addEventListener('click', () => this.refreshLobbies());

        // Salle d'attente
        document.getElementById('switchTeamBtn').addEventListener('click', () => this.switchTeam());
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('leaveLobbyBtn').addEventListener('click', () => this.leaveLobby());

        // Chat
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
    }

    // Change d'écran
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    // Gère le bouton Jouer
    async handlePlay() {
        const playerName = document.getElementById('playerName').value.trim();
        
        if (!playerName) {
            this.showNotification('Veuillez entrer un pseudo', 'error');
            return;
        }

        if (playerName.length < 3 || playerName.length > 20) {
            this.showNotification('Le pseudo doit contenir entre 3 et 20 caractères', 'error');
            return;
        }

        // Définit l'utilisateur actuel
        firebaseManager.setCurrentUser(playerName);
        
        // Affiche les informations du joueur
        document.getElementById('playerInfo').textContent = `Joueur: ${playerName}`;
        
        // Passe à l'écran des lobbys
        this.showScreen('lobby');
        this.refreshLobbies();
        
        // Actualise la liste toutes les 5 secondes
        this.refreshInterval = setInterval(() => this.refreshLobbies(), 5000);
    }

    // Crée un nouveau lobby
    async createLobby() {
        try {
            const lobbyCode = await firebaseManager.createLobby();
            this.joinLobbyRoom(lobbyCode);
        } catch (error) {
            this.showNotification('Erreur lors de la création du lobby', 'error');
            console.error(error);
        }
    }

    // Rafraîchit la liste des lobbys
    async refreshLobbies() {
        try {
            const lobbies = await firebaseManager.getLobbies();
            const lobbyList = document.getElementById('lobbyList');
            
            if (lobbies.length === 0) {
                lobbyList.innerHTML = '<p style="text-align: center; color: #a8b2d1;">Aucun lobby disponible</p>';
                return;
            }

            lobbyList.innerHTML = lobbies.map(lobby => `
                <div class="lobby-item" onclick="menuManager.joinLobby('${lobby.code}')">
                    <div class="lobby-info">
                        <h3>Lobby ${lobby.code}</h3>
                        <p>Joueurs: ${lobby.playerCount}/${lobby.maxPlayers}</p>
                    </div>
                    <button class="btn btn-secondary">Rejoindre</button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des lobbys:', error);
        }
    }

    // Rejoint un lobby
    async joinLobby(lobbyCode) {
        try {
            await firebaseManager.joinLobby(lobbyCode);
            this.joinLobbyRoom(lobbyCode);
        } catch (error) {
            this.showNotification(error.message || 'Erreur lors de la connexion au lobby', 'error');
            console.error(error);
        }
    }

    // Entre dans la salle d'attente
    joinLobbyRoom(lobbyCode) {
        clearInterval(this.refreshInterval);
        
        document.getElementById('lobbyCode').textContent = lobbyCode;
        this.showScreen('waiting');
        
        // Écoute les changements dans le lobby
        firebaseManager.listenToLobby((lobbyData) => {
            if (!lobbyData) {
                // Le lobby a été supprimé
                this.showNotification('Le lobby a été fermé', 'info');
                this.showScreen('lobby');
                this.refreshLobbies();
                return;
            }

            this.updateWaitingRoom(lobbyData);
            
            // Si la partie commence, passe à l'écran de jeu
            if (lobbyData.status === 'playing') {
                this.startGameSession(lobbyData);
            }
        });

        // Écoute le chat
        firebaseManager.listenToChat((message) => {
            this.addChatMessage(message);
        });
    }

    // Met à jour la salle d'attente
    updateWaitingRoom(lobbyData) {
        const players = Object.values(lobbyData.players || {});
        const ctPlayers = players.filter(p => p.team === 'CT');
        const tPlayers = players.filter(p => p.team === 'T');
        
        // Met à jour le compteur
        document.getElementById('playerCount').textContent = `${players.length}/10`;
        
        // Met à jour les équipes
        document.getElementById('teamCT').innerHTML = ctPlayers.map(player => `
            <div class="player-item ${player.isHost ? 'host' : ''}">
                ${player.name}
            </div>
        `).join('');
        
        document.getElementById('teamT').innerHTML = tPlayers.map(player => `
            <div class="player-item ${player.isHost ? 'host' : ''}">
                ${player.name}
            </div>
        `).join('');
        
        // Affiche le bouton de démarrage pour l'hôte
        const currentPlayer = lobbyData.players[firebaseManager.currentUser.id];
        if (currentPlayer && currentPlayer.isHost) {
            document.getElementById('startGameBtn').style.display = 'block';
        } else {
            document.getElementById('startGameBtn').style.display = 'none';
        }
    }

    // Change d'équipe
    async switchTeam() {
        try {
            await firebaseManager.switchTeam();
        } catch (error) {
            this.showNotification('Impossible de changer d\'équipe', 'error');
            console.error(error);
        }
    }

    // Lance la partie
    async startGame() {
        try {
            await firebaseManager.startGame();
        } catch (error) {
            this.showNotification(error.message || 'Impossible de lancer la partie', 'error');
            console.error(error);
        }
    }

    // Quitte le lobby
    async leaveLobby() {
        try {
            await firebaseManager.leaveLobby();
            this.showScreen('lobby');
            this.refreshLobbies();
            
            // Réactive l'actualisation automatique
            this.refreshInterval = setInterval(() => this.refreshLobbies(), 5000);
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    }

    // Démarre la session de jeu
    startGameSession(lobbyData) {
        this.showScreen('game');
        
        // Initialise le jeu
        if (window.game) {
            window.game.initialize(lobbyData);
        }
    }

    // Ajoute un message au chat
    addChatMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const teamColor = message.team === 'CT' ? '#5d79ae' : '#de9b35';
        messageEl.innerHTML = `
            <span class="player-name" style="color: ${teamColor}">${message.playerName}:</span>
            ${this.escapeHtml(message.message)}
        `;
        
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Envoie un message dans le chat
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            await firebaseManager.sendChatMessage(message);
            input.value = '';
        }
    }

    // Affiche une notification
    showNotification(message, type = 'info') {
        // Simple alerte pour le moment, peut être amélioré avec une vraie notification
        alert(message);
    }

    // Échappe le HTML pour éviter les injections
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Nettoie les ressources
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        firebaseManager.removeAllListeners();
    }
}

// Instance globale
const menuManager = new MenuManager();