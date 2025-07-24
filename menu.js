// Gestionnaire des menus et de la navigation - SIO SHOOTER Enhanced
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
        this.typingEffect = null;
        this.soundEnabled = true;
        
        this.initializeEventListeners();
        this.initializeAnimations();
    }

    // Initialise les écouteurs d'événements
    initializeEventListeners() {
        // Menu principal
        document.getElementById('playBtn').addEventListener('click', () => this.handlePlay());
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlay();
        });

        // Animation de frappe pour le champ nom
        document.getElementById('playerName').addEventListener('input', (e) => {
            this.animateInputField(e.target);
        });

        // Écran des lobbys
        document.getElementById('createLobbyBtn').addEventListener('click', () => this.createLobby());
        document.getElementById('refreshLobbiesBtn').addEventListener('click', () => this.refreshLobbies());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());

        // Salle d'attente
        document.getElementById('switchTeamBtn').addEventListener('click', () => this.switchTeam());
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('leaveLobbyBtn').addEventListener('click', () => this.leaveLobby());
        document.getElementById('joinCTBtn').addEventListener('click', () => this.joinSpecificTeam('CT'));
        document.getElementById('joinTBtn').addEventListener('click', () => this.joinSpecificTeam('T'));

        // Chat amélioré
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage(e.shiftKey);
            }
        });

        // Onglets de chat
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchChatTab(tab.dataset.tab));
        });

        // Bouton d'envoi de chat
        document.querySelector('.chat-send-btn').addEventListener('click', () => {
            this.sendChatMessage(false);
        });

        // Raccourcis clavier globaux
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshLobbies();
            }
        });

        // Menu pause dans le jeu
        const resumeBtn = document.getElementById('resumeBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const leaveGameBtn = document.getElementById('leaveGameBtn');

        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeGame());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());
        if (leaveGameBtn) leaveGameBtn.addEventListener('click', () => this.leaveGame());
    }

    // Initialise les animations
    initializeAnimations() {
        // Animation des particules de fond
        this.createBackgroundParticles();
        
        // Animation du titre
        this.animateTitle();
        
        // Effet de survol pour les boutons
        this.initializeButtonEffects();
    }

    // Crée l'animation de particules en arrière-plan
    createBackgroundParticles() {
        const particlesContainer = document.querySelector('.particles');
        if (!particlesContainer) return;

        // Crée des particules dynamiques
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: ${Math.random() > 0.5 ? '#ff4655' : '#00d4ff'};
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.8 + 0.2};
                animation: float ${Math.random() * 10 + 10}s linear infinite;
                box-shadow: 0 0 10px currentColor;
            `;
            particlesContainer.appendChild(particle);
        }
    }

    // Animation du titre principal
    animateTitle() {
        const titleSio = document.querySelector('.title-sio');
        const titleShooter = document.querySelector('.title-shooter');
        
        if (titleSio && titleShooter) {
            // Effet de glitch occasionnel
            setInterval(() => {
                if (Math.random() < 0.1) { // 10% de chance
                    this.glitchEffect(titleSio);
                    setTimeout(() => this.glitchEffect(titleShooter), 100);
                }
            }, 3000);
        }
    }

    // Effet de glitch
    glitchEffect(element) {
        const originalText = element.textContent;
        const glitchChars = '!<>-_\\/[]{}—+=~`';
        
        // Phase 1: Glitch
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                element.textContent = originalText
                    .split('')
                    .map(char => Math.random() < 0.3 ? 
                        glitchChars[Math.floor(Math.random() * glitchChars.length)] : char)
                    .join('');
            }, i * 50);
        }
        
        // Phase 2: Retour au normal
        setTimeout(() => {
            element.textContent = originalText;
        }, 200);
    }

    // Initialise les effets de boutons
    initializeButtonEffects() {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.playButtonHoverSound();
                btn.style.transform = 'translateY(-2px) scale(1.02)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0) scale(1)';
            });
            
            btn.addEventListener('click', () => {
                this.playButtonClickSound();
                this.createClickRipple(btn);
            });
        });
    }

    // Crée un effet de ondulation au clic
    createClickRipple(button) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.marginLeft = -(size / 2) + 'px';
        ripple.style.marginTop = -(size / 2) + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    // Animation du champ d'entrée
    animateInputField(input) {
        const underline = input.nextElementSibling;
        if (underline && underline.classList.contains('input-underline')) {
            underline.style.width = input.value.length > 0 ? '100%' : '0%';
        }
    }

    // Change d'écran avec animation
    showScreen(screenName, direction = 'fade') {
        const currentScreenElement = this.screens[this.currentScreen];
        const newScreenElement = this.screens[screenName];
        
        if (!newScreenElement) return;
        
        // Animation de sortie
        currentScreenElement.style.animation = direction === 'slide-left' ? 
            'slideOutLeft 0.3s ease-in' : 'fadeOut 0.3s ease-in';
        
        setTimeout(() => {
            currentScreenElement.classList.remove('active');
            newScreenElement.classList.add('active');
            
            // Animation d'entrée
            newScreenElement.style.animation = direction === 'slide-left' ? 
                'slideInRight 0.3s ease-out' : 'fadeIn 0.3s ease-out';
            
            this.currentScreen = screenName;
            
            // Actions spécifiques selon l'écran
            this.onScreenChange(screenName);
        }, 300);
    }

    // Actions lors du changement d'écran
    onScreenChange(screenName) {
        switch (screenName) {
            case 'lobby':
                this.refreshLobbies();
                break;
            case 'waiting':
                this.initializeWaitingRoom();
                break;
            case 'game':
                this.initializeGameScreen();
                break;
        }
    }

    // Gère le bouton Jouer avec validation améliorée
    async handlePlay() {
        const playerName = document.getElementById('playerName').value.trim();
        
        if (!playerName) {
            this.showNotification('⚠️ Veuillez entrer un pseudo', 'warning', 3000);
            this.shakeElement(document.getElementById('playerName'));
            return;
        }

        if (playerName.length < 3) {
            this.showNotification('⚠️ Le pseudo doit contenir au moins 3 caractères', 'warning', 3000);
            this.shakeElement(document.getElementById('playerName'));
            return;
        }

        if (playerName.length > 16) {
            this.showNotification('⚠️ Le pseudo ne peut pas dépasser 16 caractères', 'warning', 3000);
            this.shakeElement(document.getElementById('playerName'));
            return;
        }

        // Vérifie les caractères interdits
        const forbiddenChars = /[<>{}[\]\\\/]/;
        if (forbiddenChars.test(playerName)) {
            this.showNotification('⚠️ Le pseudo contient des caractères interdits', 'warning', 3000);
            this.shakeElement(document.getElementById('playerName'));
            return;
        }

        // Animation de chargement
        const playBtn = document.getElementById('playBtn');
        const originalText = playBtn.innerHTML;
        playBtn.innerHTML = '<div class="loading-spinner"></div> CONNEXION...';
        playBtn.disabled = true;

        try {
            // Définit l'utilisateur actuel
            firebaseManager.setCurrentUser(playerName);
            
            // Animation de succès
            playBtn.innerHTML = '✅ CONNECTÉ !';
            
            setTimeout(() => {
                // Affiche les informations du joueur
                document.getElementById('playerInfo').innerHTML = `
                    <span class="player-status online">🟢</span>
                    <span class="player-name">${playerName}</span>
                `;
                
                // Passe à l'écran des lobbys
                this.showScreen('lobby', 'slide-left');
                
                // Actualise la liste toutes les 5 secondes
                this.refreshInterval = setInterval(() => this.refreshLobbies(), 5000);
            }, 1000);
            
        } catch (error) {
            this.showNotification('❌ Erreur de connexion', 'error', 3000);
            playBtn.innerHTML = originalText;
            playBtn.disabled = false;
            console.error(error);
        }
    }

    // Retour au menu principal
    backToMenu() {
        clearInterval(this.refreshInterval);
        this.showScreen('menu', 'slide-right');
        
        // Réinitialise le bouton de jeu
        const playBtn = document.getElementById('playBtn');
        playBtn.innerHTML = '<span>ENTRER EN JEU</span><div class="btn-glow"></div>';
        playBtn.disabled = false;
    }

    // Crée un nouveau lobby avec interface améliorée
    async createLobby() {
        // Affiche le modal de création avancée
        this.showCreateLobbyModal();
    }
    
    // Affiche le modal de création de lobby
    showCreateLobbyModal() {
        const modal = document.createElement('div');
        modal.className = 'lobby-creation-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🏟️ Créer un Lobby</h2>
                    <button class="modal-close" onclick="this.closest('.lobby-creation-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="creation-tabs">
                        <button class="creation-tab active" data-tab="basic">🎮 Paramètres</button>
                        <button class="creation-tab" data-tab="bots">🤖 Bots</button>
                        <button class="creation-tab" data-tab="advanced">⚙️ Avancé</button>
                    </div>
                    
                    <div class="creation-content">
                        <!-- Onglet Paramètres -->
                        <div class="tab-content active" data-tab="basic">
                            <div class="form-group">
                                <label>🎯 Mode de Jeu</label>
                                <select id="gameMode" class="form-select">
                                    <option value="competitive">🏆 Compétitif 5v5</option>
                                    <option value="casual">😎 Casual 10v10</option>
                                    <option value="ffa">💀 Free For All</option>
                                    <option value="tdm">⚔️ Team Deathmatch</option>
                                    <option value="gungame">🔫 Gun Game</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>👥 Taille des Équipes</label>
                                <div class="team-size-selector">
                                    <button type="button" class="size-btn" data-size="1">1v1</button>
                                    <button type="button" class="size-btn" data-size="2">2v2</button>
                                    <button type="button" class="size-btn" data-size="3">3v3</button>
                                    <button type="button" class="size-btn active" data-size="5">5v5</button>
                                    <button type="button" class="size-btn" data-size="8">8v8</button>
                                    <button type="button" class="size-btn" data-size="10">10v10</button>
                                </div>
                                <div class="ffa-players" style="display: none;">
                                    <label>Joueurs Max (FFA)</label>
                                    <input type="range" id="ffaPlayers" min="4" max="20" value="12" class="range-slider">
                                    <span class="range-value">12 joueurs</span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>⏱️ Durée du Round</label>
                                <select id="roundTime" class="form-select">
                                    <option value="60">1 minute</option>
                                    <option value="90">1:30</option>
                                    <option value="115" selected>1:55 (Compétitif)</option>
                                    <option value="120">2 minutes</option>
                                    <option value="180">3 minutes</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>🎯 Rounds à Gagner</label>
                                <select id="maxRounds" class="form-select">
                                    <option value="8">Premier à 8 (BO15)</option>
                                    <option value="13">Premier à 13 (BO25)</option>
                                    <option value="16" selected>Premier à 16 (BO30)</option>
                                    <option value="continuous">Continu (FFA/TDM)</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Onglet Bots -->
                        <div class="tab-content" data-tab="bots">
                            <div class="form-group">
                                <div class="checkbox-group">
                                    <input type="checkbox" id="enableBots" checked>
                                    <label for="enableBots">🤖 Activer les Bots</label>
                                </div>
                                <p class="form-help">Les bots remplissent automatiquement les places vides</p>
                            </div>
                            
                            <div class="bot-settings">
                                <div class="form-group">
                                    <label>🎚️ Niveau des Bots</label>
                                    <select id="botDifficulty" class="form-select">
                                        <option value="easy">😊 Facile</option>
                                        <option value="medium" selected>😐 Moyen</option>
                                        <option value="hard">😠 Difficile</option>
                                        <option value="expert">🤖 Expert</option>
                                        <option value="mixed">🎲 Mélangé</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>⚖️ Équilibrage Automatique</label>
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="autoBalance" checked>
                                        <label for="autoBalance">Équilibrer les équipes automatiquement</label>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>🔄 Remplacement Auto</label>
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="fillSlots" checked>
                                        <label for="fillSlots">Remplacer les joueurs qui partent</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Onglet Avancé -->
                        <div class="tab-content" data-tab="advanced">
                            <div class="form-group">
                                <label>🔒 Confidentialité</label>
                                <div class="radio-group">
                                    <input type="radio" name="privacy" id="public" value="public" checked>
                                    <label for="public">🌐 Public</label>
                                    
                                    <input type="radio" name="privacy" id="private" value="private">
                                    <label for="private">🔒 Privé</label>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="checkbox-group">
                                    <input type="checkbox" id="friendlyFire">
                                    <label for="friendlyFire">💥 Feu Ami</label>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="checkbox-group">
                                    <input type="checkbox" id="allowSpectators" checked>
                                    <label for="allowSpectators">👁️ Spectateurs Autorisés</label>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>🗺️ Carte</label>
                                <select id="mapSelect" class="form-select">
                                    <option value="de_sioshooter" selected>🏢 SIO Academy</option>
                                    <option value="de_office">🏢 Office</option>
                                    <option value="de_warehouse">📦 Warehouse</option>
                                    <option value="dm_killhouse">💀 Killhouse (FFA)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.lobby-creation-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="menuManager.confirmCreateLobby()">
                        <i class="icon">🚀</i> Créer le Lobby
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialise les événements du modal
        this.initializeCreationModal();
    }
    
    // Initialise les événements du modal de création
    initializeCreationModal() {
        // Onglets
        document.querySelectorAll('.creation-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.creation-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.querySelector(`[data-tab="${tab.dataset.tab}"].tab-content`).classList.add('active');
            });
        });
        
        // Sélecteur de taille d'équipe
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Mode de jeu change
        document.getElementById('gameMode').addEventListener('change', (e) => {
            this.updateCreationFormBasedOnMode(e.target.value);
        });
        
        // Range slider FFA
        document.getElementById('ffaPlayers').addEventListener('input', (e) => {
            document.querySelector('.range-value').textContent = `${e.target.value} joueurs`;
        });
        
        // Bots toggle
        document.getElementById('enableBots').addEventListener('change', (e) => {
            document.querySelector('.bot-settings').style.display = e.target.checked ? 'block' : 'none';
        });
    }
    
    // Met à jour le formulaire selon le mode
    updateCreationFormBasedOnMode(mode) {
        const teamSizeSelector = document.querySelector('.team-size-selector');
        const ffaPlayers = document.querySelector('.ffa-players');
        const roundsSelect = document.getElementById('maxRounds');
        
        if (mode === 'ffa') {
            teamSizeSelector.style.display = 'none';
            ffaPlayers.style.display = 'block';
            roundsSelect.value = 'continuous';
        } else {
            teamSizeSelector.style.display = 'flex';
            ffaPlayers.style.display = 'none';
            if (roundsSelect.value === 'continuous') {
                roundsSelect.value = '16';
            }
        }
    }
    
    // Confirme la création du lobby
    async confirmCreateLobby() {
        const createBtn = document.querySelector('.modal-footer .btn-primary');
        const originalText = createBtn.innerHTML;
        
        createBtn.innerHTML = '<div class="loading-spinner"></div> Création...';
        createBtn.disabled = true;

        try {
            // Collecte les paramètres
            const settings = this.collectLobbySettings();
            
            // Crée le lobby avec les paramètres
            const lobbyCode = await firebaseManager.createLobby(settings);
            
            // Animation de succès
            createBtn.innerHTML = '✅ Lobby créé !';
            
            setTimeout(() => {
                // Ferme le modal
                document.querySelector('.lobby-creation-modal').remove();
                
                // Rejoint le lobby
                this.joinLobbyRoom(lobbyCode);
                
            }, 1000);
            
        } catch (error) {
            this.showNotification('❌ Erreur lors de la création du lobby', 'error', 3000);
            createBtn.innerHTML = originalText;
            createBtn.disabled = false;
            console.error(error);
        }
    }
    
    // Collecte les paramètres du lobby
    collectLobbySettings() {
        const gameMode = document.getElementById('gameMode').value;
        const teamSize = document.querySelector('.size-btn.active')?.dataset.size || '5';
        const ffaPlayers = document.getElementById('ffaPlayers').value;
        
        return {
            gameMode: gameMode,
            teamSize: parseInt(teamSize),
            maxPlayers: gameMode === 'ffa' ? parseInt(ffaPlayers) : parseInt(teamSize) * 2,
            roundTime: parseInt(document.getElementById('roundTime').value),
            maxRounds: document.getElementById('maxRounds').value === 'continuous' ? 999 : parseInt(document.getElementById('maxRounds').value),
            enableBots: document.getElementById('enableBots').checked,
            botDifficulty: document.getElementById('botDifficulty').value,
            autoBalance: document.getElementById('autoBalance').checked,
            fillSlots: document.getElementById('fillSlots').checked,
            isPrivate: document.querySelector('input[name="privacy"]:checked').value === 'private',
            friendlyFire: document.getElementById('friendlyFire').checked,
            allowSpectators: document.getElementById('allowSpectators').checked,
            mapName: document.getElementById('mapSelect').value
        };
    }

    // Rafraîchit la liste des lobbys avec animations
    async refreshLobbies() {
        const refreshBtn = document.getElementById('refreshLobbiesBtn');
        const originalIcon = refreshBtn.querySelector('.icon').textContent;
        
        // Animation de rotation
        const iconElement = refreshBtn.querySelector('.icon');
        iconElement.style.animation = 'spin 1s linear infinite';

        try {
            const lobbies = await firebaseManager.getLobbies();
            const lobbyList = document.getElementById('lobbyList');
            
            // Animation de fade out
            lobbyList.style.opacity = '0.5';
            
            setTimeout(() => {
                if (lobbies.length === 0) {
                    lobbyList.innerHTML = `
                        <div class="no-lobbies">
                            <div class="no-lobbies-icon">🏟️</div>
                            <h3>Aucun lobby disponible</h3>
                            <p>Soyez le premier à créer une partie !</p>
                            <button class="btn btn-primary" onclick="menuManager.createLobby()">
                                <i class="icon">➕</i> Créer un lobby
                            </button>
                        </div>
                    `;
                } else {
                    lobbyList.innerHTML = lobbies.map((lobby, index) => `
                        <div class="lobby-item" onclick="menuManager.joinLobby('${lobby.code}')" style="animation-delay: ${index * 0.1}s">
                            <div class="lobby-info">
                                <div class="lobby-header">
                                    <h3>🏟️ Lobby ${lobby.code}</h3>
                                    <div class="lobby-status ${lobby.playerCount >= 4 ? 'active' : 'waiting'}">
                                        ${lobby.playerCount >= 4 ? '🟢 Actif' : '🟡 En attente'}
                                    </div>
                                </div>
                                <div class="lobby-details">
                                    <span class="lobby-players">
                                        👥 ${lobby.playerCount}/${lobby.maxPlayers} joueurs
                                    </span>
                                    <span class="lobby-host">
                                        👑 Host: ${lobby.hostName || 'Inconnu'}
                                    </span>
                                    <span class="lobby-time">
                                        ⏱️ ${this.formatRelativeTime(lobby.created)}
                                    </span>
                                </div>
                            </div>
                            <div class="lobby-actions">
                                <button class="btn btn-secondary lobby-join-btn">
                                    <i class="icon">🚪</i> Rejoindre
                                </button>
                                <div class="lobby-ping">
                                    <span class="ping-value">${Math.floor(Math.random() * 50) + 10}ms</span>
                                    <div class="ping-bars">
                                        <div class="ping-bar"></div>
                                        <div class="ping-bar"></div>
                                        <div class="ping-bar"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
                
                // Animation de fade in
                lobbyList.style.opacity = '1';
                
                // Anime les éléments
                document.querySelectorAll('.lobby-item').forEach((item, index) => {
                    item.style.animation = `slideInUp 0.3s ease ${index * 0.1}s both`;
                });
                
            }, 300);

        } catch (error) {
            this.showNotification('❌ Erreur lors du rafraîchissement', 'error', 3000);
            console.error('Erreur lors du rafraîchissement des lobbys:', error);
        } finally {
            // Arrête l'animation de rotation
            setTimeout(() => {
                iconElement.style.animation = '';
            }, 1000);
        }
    }

    // Formate le temps relatif
    formatRelativeTime(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'À l\'instant';
        if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
        return `Il y a ${Math.floor(seconds / 86400)} j`;
    }

    // Rejoint un lobby avec gestion d'erreur améliorée
    async joinLobby(lobbyCode) {
        // Feedback visuel immédiat
        const lobbyItem = event.target.closest('.lobby-item');
        if (lobbyItem) {
            lobbyItem.style.transform = 'scale(0.98)';
            lobbyItem.style.opacity = '0.7';
        }

        try {
            await firebaseManager.joinLobby(lobbyCode);
            
            // Animation de succès
            if (lobbyItem) {
                lobbyItem.style.border = '2px solid #4caf50';
                lobbyItem.innerHTML = `
                    <div class="lobby-success">
                        <div class="success-icon">✅</div>
                        <h3>Connexion réussie !</h3>
                        <p>Redirection vers la salle d'attente...</p>
                    </div>
                `;
            }
            
            setTimeout(() => {
                this.joinLobbyRoom(lobbyCode);
            }, 1500);
            
        } catch (error) {
            // Animation d'erreur
            if (lobbyItem) {
                lobbyItem.style.transform = 'scale(1)';
                lobbyItem.style.opacity = '1';
                this.shakeElement(lobbyItem);
            }
            
            let errorMessage = 'Erreur lors de la connexion au lobby';
            if (error.message.includes('Lobby complet')) {
                errorMessage = '🚫 Ce lobby est complet';
            } else if (error.message.includes('partie a déjà commencé')) {
                errorMessage = '⚔️ La partie a déjà commencé';
            } else if (error.message.includes('Lobby introuvable')) {
                errorMessage = '❓ Lobby introuvable';
            }
            
            this.showNotification(errorMessage, 'error', 3000);
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
                this.showNotification('🏠 Le lobby a été fermé par l\'hôte', 'warning', 3000);
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

    // Initialise la salle d'attente
    initializeWaitingRoom() {
        // Animation d'entrée des équipes
        setTimeout(() => {
            document.querySelector('.team-ct').style.animation = 'slideInLeft 0.5s ease';
            document.querySelector('.team-t').style.animation = 'slideInRight 0.5s ease';
        }, 300);
    }

    // Met à jour la salle d'attente avec animations
    updateWaitingRoom(lobbyData) {
        const players = Object.values(lobbyData.players || {});
        const ctPlayers = players.filter(p => p.team === 'CT');
        const tPlayers = players.filter(p => p.team === 'T');
        
        // Met à jour le compteur avec animation
        const playerCountElement = document.getElementById('playerCount');
        const newCount = `${players.length}/10`;
        if (playerCountElement.textContent !== newCount) {
            playerCountElement.style.animation = 'pulse 0.5s ease';
            playerCountElement.textContent = newCount;
        }
        
        // Met à jour les équipes
        this.updateTeamList('teamCT', ctPlayers);
        this.updateTeamList('teamT', tPlayers);
        
        // Met à jour le statut de la salle
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = statusIndicator.nextElementSibling;
        
        if (players.length >= 4) {
            statusIndicator.className = 'status-indicator ready';
            statusText.textContent = 'Prêt à commencer';
        } else {
            statusIndicator.className = 'status-indicator waiting';
            statusText.textContent = 'En attente de joueurs';
        }
        
        // Affiche le bouton de démarrage pour l'hôte
        const currentPlayer = lobbyData.players[firebaseManager.currentUser.id];
        const startBtn = document.getElementById('startGameBtn');
        
        if (currentPlayer && currentPlayer.isHost) {
            startBtn.style.display = 'block';
            startBtn.disabled = players.length < 2;
            
            if (players.length >= 2) {
                startBtn.innerHTML = '<i class="icon">🎮</i> LANCER LA PARTIE';
                startBtn.classList.remove('btn-disabled');
            } else {
                startBtn.innerHTML = '<i class="icon">⏳</i> EN ATTENTE DE JOUEURS';
                startBtn.classList.add('btn-disabled');
            }
        } else {
            startBtn.style.display = 'none';
        }
        
        // Met à jour les boutons d'équipe
        this.updateTeamButtons(currentPlayer);
    }

    // Met à jour une liste d'équipe
    updateTeamList(teamId, players) {
        const teamElement = document.getElementById(teamId);
        const currentHtml = teamElement.innerHTML;
        
        const newHtml = players.map(player => `
            <div class="player-item ${player.isHost ? 'host' : ''} ${player.id === firebaseManager.currentUser.id ? 'self' : ''}" 
                 data-player-id="${player.id}">
                <div class="player-avatar">
                    ${player.isHost ? '👑' : '👤'}
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-status">
                        ${player.ready ? '✅ Prêt' : '⏳ En attente'}
                    </div>
                </div>
                <div class="player-stats">
                    <span class="stat">K: ${player.kills || 0}</span>
                    <span class="stat">D: ${player.deaths || 0}</span>
                </div>
            </div>
        `).join('');
        
        if (currentHtml !== newHtml) {
            teamElement.innerHTML = newHtml;
            
            // Anime les nouveaux joueurs
            teamElement.querySelectorAll('.player-item').forEach((item, index) => {
                item.style.animation = `slideInUp 0.3s ease ${index * 0.1}s both`;
            });
        }
    }

    // Met à jour les boutons d'équipe
    updateTeamButtons(currentPlayer) {
        const joinCTBtn = document.getElementById('joinCTBtn');
        const joinTBtn = document.getElementById('joinTBtn');
        const switchBtn = document.getElementById('switchTeamBtn');
        
        if (currentPlayer) {
            if (currentPlayer.team === 'CT') {
                joinCTBtn.style.display = 'none';
                joinTBtn.style.display = 'block';
                switchBtn.innerHTML = '<i class="icon">🔄</i> Rejoindre Terroristes';
            } else {
                joinCTBtn.style.display = 'block';
                joinTBtn.style.display = 'none';
                switchBtn.innerHTML = '<i class="icon">🔄</i> Rejoindre CT';
            }
        }
    }

    // Rejoint une équipe spécifique
    async joinSpecificTeam(team) {
        try {
            await firebaseManager.joinTeam(team);
            this.showNotification(`✅ Vous avez rejoint l'équipe ${team}`, 'success', 2000);
        } catch (error) {
            this.showNotification(`❌ Impossible de rejoindre l'équipe ${team}`, 'error', 3000);
            console.error(error);
        }
    }

    // Change d'équipe
    async switchTeam() {
        const switchBtn = document.getElementById('switchTeamBtn');
        const originalText = switchBtn.innerHTML;
        
        switchBtn.innerHTML = '<div class="loading-spinner"></div> Changement...';
        switchBtn.disabled = true;

        try {
            await firebaseManager.switchTeam();
            this.showNotification('✅ Équipe changée avec succès', 'success', 2000);
        } catch (error) {
            this.showNotification('❌ Impossible de changer d\'équipe', 'error', 3000);
            console.error(error);
        } finally {
            setTimeout(() => {
                switchBtn.innerHTML = originalText;
                switchBtn.disabled = false;
            }, 1000);
        }
    }

    // Lance la partie
    async startGame() {
        const startBtn = document.getElementById('startGameBtn');
        const originalText = startBtn.innerHTML;
        
        // Animation de lancement
        startBtn.innerHTML = '<div class="loading-spinner"></div> LANCEMENT...';
        startBtn.disabled = true;

        try {
            await firebaseManager.startGame();
            
            // Compte à rebours
            for (let i = 3; i > 0; i--) {
                startBtn.innerHTML = `🚀 DÉMARRAGE DANS ${i}...`;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            startBtn.innerHTML = '✅ PARTIE LANCÉE !';
            
        } catch (error) {
            let errorMessage = 'Impossible de lancer la partie';
            if (error.message.includes('hôte')) {
                errorMessage = '👑 Seul l\'hôte peut lancer la partie';
            } else if (error.message.includes('joueurs')) {
                errorMessage = '👥 Il faut au moins 2 joueurs';
            }
            
            this.showNotification(errorMessage, 'error', 3000);
            startBtn.innerHTML = originalText;
            startBtn.disabled = false;
            console.error(error);
        }
    }

    // Quitte le lobby
    async leaveLobby() {
        // Confirmation
        if (!confirm('🚪 Êtes-vous sûr de vouloir quitter ce lobby ?')) {
            return;
        }

        const leaveBtn = document.getElementById('leaveLobbyBtn');
        const originalText = leaveBtn.innerHTML;
        
        leaveBtn.innerHTML = '<div class="loading-spinner"></div> Déconnexion...';
        leaveBtn.disabled = true;

        try {
            await firebaseManager.leaveLobby();
            
            // Animation de sortie
            leaveBtn.innerHTML = '✅ Déconnecté !';
            
            setTimeout(() => {
                this.showScreen('lobby');
                this.refreshLobbies();
                
                // Réactive l'actualisation automatique
                this.refreshInterval = setInterval(() => this.refreshLobbies(), 5000);
                
                leaveBtn.innerHTML = originalText;
                leaveBtn.disabled = false;
            }, 1000);
            
        } catch (error) {
            this.showNotification('❌ Erreur lors de la déconnexion', 'error', 3000);
            leaveBtn.innerHTML = originalText;
            leaveBtn.disabled = false;
            console.error('Erreur lors de la déconnexion:', error);
        }
    }

    // Démarre la session de jeu
    startGameSession(lobbyData) {
        // Animation de transition vers le jeu
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'game-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <h2>🎮 CHARGEMENT DE LA PARTIE</h2>
                <div class="loading-bar">
                    <div class="loading-progress"></div>
                </div>
                <p class="loading-tip">Astuce: Utilisez WASD pour vous déplacer et la souris pour viser</p>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        // Simule le chargement
        let progress = 0;
        const progressBar = loadingOverlay.querySelector('.loading-progress');
        
        const loadingInterval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(loadingInterval);
                
                setTimeout(() => {
                    this.showScreen('game');
                    
                    // Initialise le jeu
                    if (window.game) {
                        window.game.initialize(lobbyData);
                    }
                    
                    // Supprime l'overlay
                    document.body.removeChild(loadingOverlay);
                }, 500);
            }
        }, 100);
    }

    // Gestion du chat amélioré
    switchChatTab(tab) {
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Filtre les messages selon l'onglet
        this.filterChatMessages(tab);
    }

    filterChatMessages(filter) {
        const messages = document.querySelectorAll('.chat-message');
        messages.forEach(msg => {
            if (filter === 'all') {
                msg.style.display = 'block';
            } else if (filter === 'team') {
                msg.style.display = msg.classList.contains('team-message') ? 'block' : 'none';
            }
        });
    }

    // Ajoute un message au chat avec animations
    addChatMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.teamOnly ? 'team-message' : ''}`;
        
        const teamColor = message.team === 'CT' ? '#5d79ae' : '#de9b35';
        const messageTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="player-name" style="color: ${teamColor}">
                    ${message.teamOnly ? '🔒' : '💬'} ${message.playerName}
                </span>
                <span class="message-time">${messageTime}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.message)}
                ${message.teamOnly ? '<span class="team-indicator">(Équipe)</span>' : ''}
            </div>
        `;
        
        chatMessages.appendChild(messageEl);
        
        // Anime le nouveau message
        messageEl.style.animation = 'slideInUp 0.3s ease';
        
        // Défilement automatique
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
        
        // Limite le nombre de messages
        const messages = chatMessages.children;
        if (messages.length > 50) {
            messages[0].remove();
        }
        
        // Notification sonore
        this.playChatSound();
    }

    // Envoie un message dans le chat
    async sendChatMessage(teamOnly = false) {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Vérifie la longueur du message
        if (message.length > 200) {
            this.showNotification('⚠️ Message trop long (max 200 caractères)', 'warning', 3000);
            return;
        }
        
        // Animation d'envoi
        const sendBtn = document.querySelector('.chat-send-btn');
        sendBtn.style.animation = 'pulse 0.3s ease';
        
        try {
            await firebaseManager.sendChatMessage(message, teamOnly);
            input.value = '';
            
            // Feedback visuel
            input.style.borderColor = '#4caf50';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 1000);
            
        } catch (error) {
            this.showNotification('❌ Erreur lors de l\'envoi du message', 'error', 3000);
            console.error(error);
        }
    }

    // Initialise l'écran de jeu
    initializeGameScreen() {
        // Cache le curseur par défaut
        document.body.style.cursor = 'none';
        
        // Active le mode plein écran
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    }

    // Menu pause
    resumeGame() {
        document.getElementById('pauseMenu').style.display = 'none';
    }

    showSettings() {
        this.showNotification('⚙️ Paramètres non implémentés dans cette démo', 'info', 3000);
    }

    leaveGame() {
        if (confirm('🚪 Êtes-vous sûr de vouloir quitter la partie ?')) {
            window.location.reload();
        }
    }

    // Notifications améliorées
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        }[type] || 'ℹ️';
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Style de la notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-overlay);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'primary' : type === 'warning' ? 'warning' : 'secondary'}-color);
            backdrop-filter: blur(10px);
            box-shadow: var(--shadow-heavy);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 1rem;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-suppression
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
        
        // Son de notification
        this.playNotificationSound(type);
    }

    // Effet de secousse
    shakeElement(element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    // Sons simulés
    playButtonHoverSound() {
        if (!this.soundEnabled) return;
        // Son de survol - simulé visuellement
    }

    playButtonClickSound() {
        if (!this.soundEnabled) return;
        // Son de clic - simulé visuellement
    }

    playChatSound() {
        if (!this.soundEnabled) return;
        // Son de message - simulé visuellement
    }

    playNotificationSound(type) {
        if (!this.soundEnabled) return;
        // Son de notification - simulé visuellement
    }

    // Aide
    showHelp() {
        const helpContent = `
            <h3>🎮 AIDE - SIO SHOOTER</h3>
            <div class="help-section">
                <h4>🎯 Contrôles de base</h4>
                <p><kbd>WASD</kbd> ou <kbd>Flèches</kbd> - Se déplacer</p>
                <p><kbd>Souris</kbd> - Viser</p>
                <p><kbd>Clic gauche</kbd> - Tirer</p>
                <p><kbd>R</kbd> - Recharger</p>
                <p><kbd>E</kbd> - Interagir (Planter/Désamorcer)</p>
            </div>
            <div class="help-section">
                <h4>💰 Système d'achat</h4>
                <p><kbd>B</kbd> - Ouvrir le menu d'achat</p>
                <p>Achetez des armes et équipements en début de round</p>
            </div>
            <div class="help-section">
                <h4>💬 Communication</h4>
                <p><kbd>Entrée</kbd> - Chat global</p>
                <p><kbd>Shift + Entrée</kbd> - Chat équipe</p>
                <p><kbd>TAB</kbd> - Scoreboard</p>
            </div>
            <div class="help-section">
                <h4>🏆 Objectifs</h4>
                <p><strong>Terroristes:</strong> Plantez la bombe ou éliminez tous les CT</p>
                <p><strong>CT:</strong> Désamorcez la bombe ou éliminez tous les T</p>
            </div>
        `;
        
        this.showNotification(helpContent, 'info', 10000);
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
        if (this.typingEffect) {
            clearInterval(this.typingEffect);
        }
        firebaseManager.removeAllListeners();
        
        // Restaure le curseur
        document.body.style.cursor = 'default';
    }
}

// Styles CSS additionnels injectés dynamiquement
const additionalStyles = `
    @keyframes slideInUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutLeft {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes ripple {
        to { transform: scale(2); opacity: 0; }
    }
    
    @keyframes float {
        0% { transform: translate(0, 100vh) rotate(0deg); }
        100% { transform: translate(100px, -100px) rotate(360deg); }
    }
    
    .no-lobbies {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
    }
    
    .no-lobbies-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .lobby-success {
        text-align: center;
        padding: 2rem;
        color: var(--success-color);
    }
    
    .success-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        animation: bounceIn 0.6s ease;
    }
    
    .game-loading-overlay {
        position: fixed;
        inset: 0;
        background: var(--bg-dark);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-tip {
        margin-top: 1rem;
        color: var(--text-secondary);
        font-style: italic;
    }
    
    .notification {
        pointer-events: auto;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }
    
    .notification-close:hover {
        color: var(--text-primary);
    }
    
    kbd {
        background: var(--bg-light);
        border: 1px solid var(--text-secondary);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 0.9em;
    }
    
    .help-section {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }
    
    .help-section h4 {
        margin-bottom: 0.5rem;
        color: var(--primary-color);
    }
    
    .help-section p {
        margin: 0.3rem 0;
        font-size: 0.9rem;
    }
`;

// Injecte les styles additionnels
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Instance globale
const menuManager = new MenuManager();