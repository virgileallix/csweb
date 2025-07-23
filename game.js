// Classe principale du jeu
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.players = {};
        this.localPlayer = null;
        this.lobbyData = null;
        this.gameState = null;
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        this.map = {
            width: 1600,
            height: 900,
            bombSites: {
                A: { x: 400, y: 200, width: 150, height: 150 },
                B: { x: 1050, y: 650, width: 150, height: 150 }
            },
            spawnPoints: {
                CT: [
                    { x: 100, y: 450 },
                    { x: 150, y: 400 },
                    { x: 150, y: 500 },
                    { x: 200, y: 450 },
                    { x: 100, y: 550 }
                ],
                T: [
                    { x: 1400, y: 450 },
                    { x: 1450, y: 400 },
                    { x: 1450, y: 500 },
                    { x: 1500, y: 450 },
                    { x: 1400, y: 550 }
                ]
            },
            obstacles: [
                // Murs extérieurs
                { x: 0, y: 0, width: 1600, height: 20 },
                { x: 0, y: 880, width: 1600, height: 20 },
                { x: 0, y: 0, width: 20, height: 900 },
                { x: 1580, y: 0, width: 20, height: 900 },
                
                // Obstacles intérieurs
                { x: 300, y: 100, width: 300, height: 20 },
                { x: 300, y: 100, width: 20, height: 200 },
                { x: 580, y: 100, width: 20, height: 200 },
                
                { x: 950, y: 550, width: 300, height: 20 },
                { x: 950, y: 550, width: 20, height: 200 },
                { x: 1230, y: 550, width: 20, height: 200 },
                
                // Couvertures au milieu
                { x: 700, y: 400, width: 200, height: 100 },
                { x: 500, y: 500, width: 100, height: 50 },
                { x: 1000, y: 350, width: 100, height: 50 }
            ]
        };
        
        this.camera = { x: 0, y: 0 };
        this.bombTimer = null;
        this.defuseTimer = null;
        this.roundTimer = null;
        
        this.initializeCanvas();
        this.initializeEventListeners();
    }

    // Initialise le canvas
    initializeCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Redimensionne le canvas
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Initialise les écouteurs d'événements
    initializeEventListeners() {
        // Clavier
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Empêche le défilement avec les flèches
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Souris
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche
                this.shoot();
            }
        });
        
        // Actions spéciales
        window.addEventListener('keypress', (e) => {
            if (e.key.toLowerCase() === 'e') {
                this.interact();
            }
            if (e.key.toLowerCase() === 'b') {
                this.buyMenu();
            }
        });
    }

    // Initialise le jeu avec les données du lobby
    initialize(lobbyData) {
        this.lobbyData = lobbyData;
        this.gameState = lobbyData.gameState;
        
        // Crée les joueurs
        Object.entries(lobbyData.players).forEach(([id, playerData]) => {
            const spawnPoints = this.map.spawnPoints[playerData.team];
            const spawnIndex = Object.keys(this.players).filter(
                pid => this.players[pid].team === playerData.team
            ).length;
            const spawn = spawnPoints[spawnIndex % spawnPoints.length];
            
            this.players[id] = {
                id: id,
                name: playerData.name,
                team: playerData.team,
                x: spawn.x,
                y: spawn.y,
                angle: 0,
                health: 100,
                armor: playerData.team === 'CT' ? 100 : 0,
                money: 800,
                alive: true,
                weapon: 'pistol',
                ammo: 12,
                ammoReserve: 24,
                speed: 250,
                hasBomb: id === this.gameState.bombCarrier,
                isDefusing: false
            };
            
            if (id === firebaseManager.currentUser.id) {
                this.localPlayer = this.players[id];
            }
        });
        
        // Lance la boucle de jeu
        this.startGameLoop();
        this.startRoundTimer();
        
        // Écoute les mises à jour du jeu
        this.listenToGameUpdates();
    }

    // Écoute les mises à jour du jeu
    listenToGameUpdates() {
        // Écoute les positions des joueurs
        database.ref(`lobbies/${firebaseManager.currentLobby}/players`).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const playersData = snapshot.val();
                Object.entries(playersData).forEach(([id, data]) => {
                    if (id !== firebaseManager.currentUser.id && this.players[id]) {
                        if (data.position) {
                            this.players[id].x = data.position.x;
                            this.players[id].y = data.position.y;
                            this.players[id].angle = data.position.angle;
                        }
                        if (data.state) {
                            Object.assign(this.players[id], data.state);
                        }
                    }
                });
            }
        });
        
        // Écoute l'état du jeu
        database.ref(`lobbies/${firebaseManager.currentLobby}/gameState`).on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.gameState = snapshot.val();
                this.updateHUD();
                
                // Gère les événements de la bombe
                if (this.gameState.bombPlanted && !this.bombTimer) {
                    this.startBombTimer();
                }
                if (this.gameState.bombDefused || this.gameState.bombExploded) {
                    this.endRound();
                }
            }
        });
    }

    // Boucle principale du jeu
    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    // Met à jour le jeu
    update() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        const deltaTime = 1/60; // 60 FPS
        let dx = 0, dy = 0;
        
        // Gestion du mouvement
        if (this.keys['w'] || this.keys['arrowup']) dy = -1;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1;
        
        // Normalise le vecteur de mouvement
        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        // Applique le mouvement avec détection de collision
        const speed = this.keys['shift'] ? this.localPlayer.speed * 0.5 : this.localPlayer.speed;
        const newX = this.localPlayer.x + dx * speed * deltaTime;
        const newY = this.localPlayer.y + dy * speed * deltaTime;
        
        if (!this.checkCollision(newX, newY, 15)) {
            this.localPlayer.x = newX;
            this.localPlayer.y = newY;
        }
        
        // Calcule l'angle de vue vers la souris
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.localPlayer.angle = Math.atan2(
            this.mouse.y - centerY,
            this.mouse.x - centerX
        );
        
        // Met à jour la caméra
        this.camera.x = this.localPlayer.x - this.canvas.width / 2;
        this.camera.y = this.localPlayer.y - this.canvas.height / 2;
        
        // Envoie la position au serveur
        firebaseManager.updatePlayerPosition(
            this.localPlayer.x,
            this.localPlayer.y,
            this.localPlayer.angle
        );
    }

    // Vérifie les collisions
    checkCollision(x, y, radius) {
        // Vérifie les limites de la carte
        if (x - radius < 0 || x + radius > this.map.width ||
            y - radius < 0 || y + radius > this.map.height) {
            return true;
        }
        
        // Vérifie les obstacles
        for (const obstacle of this.map.obstacles) {
            if (x + radius > obstacle.x &&
                x - radius < obstacle.x + obstacle.width &&
                y + radius > obstacle.y &&
                y - radius < obstacle.y + obstacle.height) {
                return true;
            }
        }
        
        return false;
    }

    // Affiche le jeu
    render() {
        // Efface le canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sauvegarde le contexte
        this.ctx.save();
        
        // Applique la translation de la caméra
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Dessine la carte
        this.renderMap();
        
        // Dessine les joueurs
        this.renderPlayers();
        
        // Dessine les effets
        this.renderEffects();
        
        // Restaure le contexte
        this.ctx.restore();
        
        // Dessine l'interface (pas affectée par la caméra)
        this.renderUI();
    }

    // Dessine la carte
    renderMap() {
        // Sol
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.map.width, this.map.height);
        
        // Grille
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.map.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.map.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.map.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.map.width, y);
            this.ctx.stroke();
        }
        
        // Sites de bombe
        Object.entries(this.map.bombSites).forEach(([site, area]) => {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            this.ctx.fillRect(area.x, area.y, area.width, area.height);
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(area.x, area.y, area.width, area.height);
            
            // Texte du site
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(site, area.x + area.width/2, area.y + area.height/2);
        });
        
        // Obstacles
        this.ctx.fillStyle = '#444';
        this.map.obstacles.forEach(obstacle => {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
        
        // Bombe plantée
        if (this.gameState && this.gameState.bombPlanted) {
            const site = this.map.bombSites[this.gameState.bombSite];
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(
                site.x + site.width/2,
                site.y + site.height/2,
                20,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Animation de pulsation
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(
                site.x + site.width/2,
                site.y + site.height/2,
                30,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    // Dessine les joueurs
    renderPlayers() {
        Object.values(this.players).forEach(player => {
            if (!player.alive) return;
            
            // Corps du joueur
            this.ctx.fillStyle = player.team === 'CT' ? '#5d79ae' : '#de9b35';
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Direction de vue
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            this.ctx.lineTo(
                player.x + Math.cos(player.angle) * 25,
                player.y + Math.sin(player.angle) * 25
            );
            this.ctx.stroke();
            
            // Nom du joueur
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(player.name, player.x, player.y - 20);
            
            // Barre de vie
            const barWidth = 30;
            const barHeight = 4;
            const barY = player.y - 30;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(player.x - barWidth/2, barY, barWidth, barHeight);
            
            this.ctx.fillStyle = player.health > 50 ? '#4caf50' : '#ff4444';
            this.ctx.fillRect(
                player.x - barWidth/2,
                barY,
                (player.health / 100) * barWidth,
                barHeight
            );
            
            // Indicateur de bombe
            if (player.hasBomb) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText('💣', player.x, player.y - 35);
            }
        });
    }

    // Dessine les effets
    renderEffects() {
        // Peut être utilisé pour les balles, explosions, etc.
    }

    // Dessine l'interface utilisateur
    renderUI() {
        // Réticule
        if (this.localPlayer && this.localPlayer.alive) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            const size = 20;
            const gap = 5;
            
            // Croix
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouse.x - size, this.mouse.y);
            this.ctx.lineTo(this.mouse.x - gap, this.mouse.y);
            this.ctx.moveTo(this.mouse.x + gap, this.mouse.y);
            this.ctx.lineTo(this.mouse.x + size, this.mouse.y);
            this.ctx.moveTo(this.mouse.x, this.mouse.y - size);
            this.ctx.lineTo(this.mouse.x, this.mouse.y - gap);
            this.ctx.moveTo(this.mouse.x, this.mouse.y + gap);
            this.ctx.lineTo(this.mouse.x, this.mouse.y + size);
            this.ctx.stroke();
        }
        
        // Minimap (simple)
        const minimapSize = 200;
        const minimapX = this.canvas.width - minimapSize - 20;
        const minimapY = 20;
        const scale = minimapSize / Math.max(this.map.width, this.map.height);
        
        // Fond de la minimap
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Obstacles sur la minimap
        this.ctx.fillStyle = '#666';
        this.map.obstacles.forEach(obstacle => {
            this.ctx.fillRect(
                minimapX + obstacle.x * scale,
                minimapY + obstacle.y * scale,
                obstacle.width * scale,
                obstacle.height * scale
            );
        });
        
        // Joueurs sur la minimap
        Object.values(this.players).forEach(player => {
            if (!player.alive) return;
            
            this.ctx.fillStyle = player.team === 'CT' ? '#5d79ae' : '#de9b35';
            this.ctx.beginPath();
            this.ctx.arc(
                minimapX + player.x * scale,
                minimapY + player.y * scale,
                3,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });
    }

    // Met à jour le HUD
    updateHUD() {
        document.getElementById('ctScore').textContent = this.gameState.ctScore;
        document.getElementById('tScore').textContent = this.gameState.tScore;
        
        if (this.localPlayer) {
            document.getElementById('playerHealth').textContent = this.localPlayer.health;
            document.getElementById('playerAmmo').textContent = 
                `${this.localPlayer.ammo}/${this.localPlayer.ammoReserve}`;
        }
        
        // Statut de la bombe
        const bombStatus = document.getElementById('bombStatus');
        if (this.gameState.bombPlanted) {
            bombStatus.textContent = `Bombe plantée sur ${this.gameState.bombSite}`;
            bombStatus.style.display = 'block';
        } else if (this.localPlayer && this.localPlayer.hasBomb) {
            bombStatus.textContent = 'Vous avez la bombe';
            bombStatus.style.display = 'block';
        } else {
            bombStatus.style.display = 'none';
        }
    }

    // Tire
    shoot() {
        if (!this.localPlayer || !this.localPlayer.alive || this.localPlayer.ammo <= 0) return;
        
        this.localPlayer.ammo--;
        
        // Calcule la trajectoire
        const startX = this.localPlayer.x;
        const startY = this.localPlayer.y;
        const angle = this.localPlayer.angle;
        
        // Vérifie les collisions avec les joueurs
        Object.values(this.players).forEach(player => {
            if (player.id === this.localPlayer.id || !player.alive || 
                player.team === this.localPlayer.team) return;
            
            // Calcule la distance du joueur à la ligne de tir
            const dx = player.x - startX;
            const dy = player.y - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Vérifie si le joueur est dans la direction du tir
            const angleToPlayer = Math.atan2(dy, dx);
            const angleDiff = Math.abs(angleToPlayer - angle);
            
            if (angleDiff < 0.1 && dist < 1000) { // Touché
                const damage = this.localPlayer.weapon === 'rifle' ? 30 : 20;
                this.hitPlayer(player.id, damage);
            }
        });
        
        // Mise à jour de l'état
        firebaseManager.updatePlayerState({ ammo: this.localPlayer.ammo });
    }

    // Touche un joueur
    hitPlayer(playerId, damage) {
        if (!this.players[playerId]) return;
        
        const player = this.players[playerId];
        player.health = Math.max(0, player.health - damage);
        
        if (player.health <= 0) {
            player.alive = false;
            firebaseManager.reportPlayerDeath(playerId);
            
            // Transfère la bombe si nécessaire
            if (player.hasBomb) {
                // La bombe tombe au sol, peut être ramassée
                player.hasBomb = false;
            }
        }
        
        // Met à jour l'état du joueur touché
        database.ref(`lobbies/${firebaseManager.currentLobby}/players/${playerId}/state`).update({
            health: player.health,
            alive: player.alive
        });
    }

    // Interagit (plante/désamorce la bombe)
    interact() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        // Vérifie si le joueur peut planter la bombe
        if (this.localPlayer.team === 'T' && this.localPlayer.hasBomb && !this.gameState.bombPlanted) {
            // Vérifie si le joueur est sur un site
            for (const [site, area] of Object.entries(this.map.bombSites)) {
                if (this.localPlayer.x >= area.x && 
                    this.localPlayer.x <= area.x + area.width &&
                    this.localPlayer.y >= area.y && 
                    this.localPlayer.y <= area.y + area.height) {
                    this.plantBomb(site);
                    break;
                }
            }
        }
        
        // Vérifie si le joueur peut désamorcer
        if (this.localPlayer.team === 'CT' && this.gameState.bombPlanted && !this.localPlayer.isDefusing) {
            const site = this.map.bombSites[this.gameState.bombSite];
            const dx = this.localPlayer.x - (site.x + site.width/2);
            const dy = this.localPlayer.y - (site.y + site.height/2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 50) {
                this.startDefuse();
            }
        }
    }

    // Plante la bombe
    plantBomb(site) {
        this.localPlayer.hasBomb = false;
        firebaseManager.plantBomb(site);
        firebaseManager.sendChatMessage(`💣 Bombe plantée sur ${site}!`);
    }

    // Commence le désamorçage
    startDefuse() {
        this.localPlayer.isDefusing = true;
        firebaseManager.updatePlayerState({ isDefusing: true });
        
        let defuseTime = 5;
        const defuseInterval = setInterval(() => {
            defuseTime--;
            
            if (defuseTime <= 0) {
                clearInterval(defuseInterval);
                this.defuseBomb();
            }
            
            // Si le joueur bouge ou meurt, annule le désamorçage
            if (!this.localPlayer.isDefusing || !this.localPlayer.alive) {
                clearInterval(defuseInterval);
                this.localPlayer.isDefusing = false;
                firebaseManager.updatePlayerState({ isDefusing: false });
            }
        }, 1000);
    }

    // Désamorce la bombe
    defuseBomb() {
        firebaseManager.defuseBomb();
        firebaseManager.sendChatMessage('🛡️ Bombe désamorcée!');
    }

    // Timer de la bombe
    startBombTimer() {
        let bombTime = 40;
        this.bombTimer = setInterval(() => {
            bombTime--;
            
            if (bombTime <= 0) {
                clearInterval(this.bombTimer);
                this.bombExplode();
            }
        }, 1000);
    }

    // Explosion de la bombe
    bombExplode() {
        database.ref(`lobbies/${firebaseManager.currentLobby}/gameState`).update({
            bombExploded: true
        });
        
        // Les terroristes gagnent
        firebaseManager.updateScore(false);
        firebaseManager.sendChatMessage('💥 La bombe a explosé! Les Terroristes gagnent!');
    }

    // Timer du round
    startRoundTimer() {
        let roundTime = 120;
        this.roundTimer = setInterval(() => {
            roundTime--;
            
            const minutes = Math.floor(roundTime / 60);
            const seconds = roundTime % 60;
            document.getElementById('gameTimer').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (roundTime <= 0) {
                clearInterval(this.roundTimer);
                this.endRound();
            }
        }, 1000);
    }

    // Fin du round
    endRound() {
        clearInterval(this.bombTimer);
        clearInterval(this.roundTimer);
        
        // Détermine le gagnant
        const ctAlive = Object.values(this.players).filter(p => p.team === 'CT' && p.alive).length;
        const tAlive = Object.values(this.players).filter(p => p.team === 'T' && p.alive).length;
        
        let ctWin = false;
        if (this.gameState.bombDefused) {
            ctWin = true;
        } else if (this.gameState.bombExploded) {
            ctWin = false;
        } else if (tAlive === 0) {
            ctWin = true;
        } else if (ctAlive === 0) {
            ctWin = false;
        } else if (!this.gameState.bombPlanted) {
            ctWin = true; // Temps écoulé sans bombe plantée
        }
        
        firebaseManager.updateScore(ctWin);
        
        // Prépare le prochain round après un délai
        setTimeout(() => {
            this.prepareNextRound();
        }, 5000);
    }

    // Prépare le prochain round
    prepareNextRound() {
        // Réinitialise les joueurs, la bombe, etc.
        // Cette fonction devrait être plus complexe dans un vrai jeu
        location.reload(); // Pour simplifier, on recharge la page
    }

    // Menu d'achat (simplifié)
    buyMenu() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        // Simple achat d'arme
        if (this.localPlayer.money >= 2700) {
            this.localPlayer.weapon = 'rifle';
            this.localPlayer.ammo = 30;
            this.localPlayer.ammoReserve = 90;
            this.localPlayer.money -= 2700;
            firebaseManager.updatePlayerState({
                weapon: 'rifle',
                ammo: 30,
                ammoReserve: 90,
                money: this.localPlayer.money
            });
        }
    }
}

// Instance globale
window.game = new Game();