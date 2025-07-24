// Classe principale du jeu SIO SHOOTER
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.radarCanvas = document.getElementById('radarCanvas');
        this.radarCtx = this.radarCanvas.getContext('2d');
        
        this.players = {};
        this.localPlayer = null;
        this.lobbyData = null;
        this.gameState = null;
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.lastShotTime = 0;
        this.isReloading = false;
        
        // Configuration des armes
        this.weapons = {
            pistol: {
                name: 'Glock-18',
                icon: '🔫',
                damage: 20,
                fireRate: 400, // ms entre les tirs
                ammo: 20,
                maxAmmo: 120,
                reloadTime: 2000,
                accuracy: 0.85,
                range: 800,
                cost: 0
            },
            ak47: {
                name: 'AK-47',
                icon: '🏹',
                damage: 36,
                fireRate: 100,
                ammo: 30,
                maxAmmo: 90,
                reloadTime: 2500,
                accuracy: 0.7,
                range: 1200,
                cost: 2700
            },
            m4a4: {
                name: 'M4A4',
                icon: '🔫',
                damage: 33,
                fireRate: 90,
                ammo: 30,
                maxAmmo: 90,
                reloadTime: 3100,
                accuracy: 0.8,
                range: 1200,
                cost: 3100
            },
            awp: {
                name: 'AWP',
                icon: '🎯',
                damage: 115,
                fireRate: 1470,
                ammo: 10,
                maxAmmo: 30,
                reloadTime: 3700,
                accuracy: 0.99,
                range: 2000,
                cost: 4750
            }
        };
        
        // Carte améliorée
        this.map = {
            width: 2400,
            height: 1600,
            bombSites: {
                A: { 
                    x: 500, y: 300, width: 200, height: 200,
                    name: 'Site A', color: '#ff4444'
                },
                B: { 
                    x: 1700, y: 1100, width: 200, height: 200,
                    name: 'Site B', color: '#44ff44'
                }
            },
            spawnPoints: {
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
            },
            obstacles: [
                // Murs extérieurs
                { x: 0, y: 0, width: 2400, height: 30, type: 'wall' },
                { x: 0, y: 1570, width: 2400, height: 30, type: 'wall' },
                { x: 0, y: 0, width: 30, height: 1600, type: 'wall' },
                { x: 2370, y: 0, width: 30, height: 1600, type: 'wall' },
                
                // Structures complexes
                { x: 400, y: 200, width: 400, height: 30, type: 'wall' },
                { x: 400, y: 200, width: 30, height: 300, type: 'wall' },
                { x: 770, y: 200, width: 30, height: 300, type: 'wall' },
                { x: 400, y: 470, width: 400, height: 30, type: 'wall' },
                
                { x: 1600, y: 1000, width: 400, height: 30, type: 'wall' },
                { x: 1600, y: 1000, width: 30, height: 300, type: 'wall' },
                { x: 1970, y: 1000, width: 30, height: 300, type: 'wall' },
                { x: 1600, y: 1270, width: 400, height: 30, type: 'wall' },
                
                // Couvertures au centre
                { x: 1000, y: 600, width: 400, height: 150, type: 'cover' },
                { x: 800, y: 850, width: 150, height: 100, type: 'cover' },
                { x: 1450, y: 650, width: 150, height: 100, type: 'cover' },
                { x: 600, y: 900, width: 100, height: 200, type: 'cover' },
                { x: 1700, y: 500, width: 100, height: 200, type: 'cover' },
                
                // Passages étroits
                { x: 1100, y: 300, width: 200, height: 30, type: 'wall' },
                { x: 1100, y: 1270, width: 200, height: 30, type: 'wall' }
            ],
            buyZones: {
                CT: { x: 100, y: 700, width: 400, height: 200 },
                T: { x: 1900, y: 700, width: 400, height: 200 }
            }
        };
        
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.bullets = [];
        this.grenades = [];
        this.effects = [];
        
        // Timers
        this.bombTimer = null;
        this.defuseTimer = null;
        this.roundTimer = null;
        this.buyTimer = null;
        
        // Audio simulé
        this.sounds = {
            shoot: '🔊',
            reload: '🔄',
            bomb_plant: '💣',
            bomb_defuse: '🛡️',
            kill: '💀',
            hit: '🎯'
        };
        
        this.initializeCanvas();
        this.initializeEventListeners();
        this.updateCrosshair();
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
        this.radarCanvas.width = 180;
        this.radarCanvas.height = 180;
    }

    // Met à jour le curseur personnalisé
    updateCrosshair() {
        const crosshair = document.getElementById('crosshair');
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            crosshair.style.left = e.clientX + 'px';
            crosshair.style.top = e.clientY + 'px';
        });
    }

    // Initialise les écouteurs d'événements
    initializeEventListeners() {
        // Clavier
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Actions spéciales
            if (e.key.toLowerCase() === 'r' && !this.isReloading) {
                this.reload();
            }
            if (e.key.toLowerCase() === 'e') {
                this.interact();
            }
            if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'o') {
                this.toggleBuyMenu();
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                this.showScoreboard(true);
            }
            if (e.key === 'Escape') {
                this.togglePauseMenu();
            }
            
            // Changement rapide d'arme
            if (e.key >= '1' && e.key <= '4') {
                this.switchWeapon(parseInt(e.key) - 1);
            }
            
            // Prévention du défilement
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            if (e.key === 'Tab') {
                this.showScoreboard(false);
            }
        });
        
        // Souris
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche
                this.shoot();
            } else if (e.button === 2) { // Clic droit
                this.scope();
            }
        });
        
        // Empêche le menu contextuel
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Chat
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage(e.shiftKey);
            }
        });
    }

    // Initialise le jeu avec les données du lobby
    initialize(lobbyData) {
        this.lobbyData = lobbyData;
        this.gameState = lobbyData.gameState;
        
        // Affiche l'écran de chargement
        this.showLoadingScreen();
        
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
                angle: spawn.angle,
                health: 100,
                maxHealth: 100,
                armor: playerData.team === 'CT' ? 100 : 0,
                maxArmor: 100,
                money: playerData.team === 'CT' ? 800 : 800,
                alive: true,
                weapon: 'pistol',
                ammo: this.weapons.pistol.ammo,
                ammoReserve: this.weapons.pistol.maxAmmo,
                speed: 250,
                inventory: ['pistol'],
                equipment: [],
                hasBomb: id === this.gameState.bombCarrier,
                isDefusing: false,
                isPlanting: false,
                lastHitTime: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                mvpStars: 0
            };
            
            if (id === firebaseManager.currentUser.id) {
                this.localPlayer = this.players[id];
            }
        });
        
        // Cache l'écran de chargement après 2 secondes
        setTimeout(() => {
            this.hideLoadingScreen();
            this.startGameLoop();
            this.startRoundTimer();
            this.startBuyTimer();
            this.listenToGameUpdates();
            this.showGameNotification('Round commencé ! Bonne chance !', 'success');
        }, 2000);
    }

    // Écrans de chargement
    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'flex';
    }

    hideLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
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
        const gameLoop = (timestamp) => {
            this.update(timestamp);
            this.render();
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    // Met à jour le jeu
    update(timestamp) {
        if (!this.localPlayer) return;
        
        // Gestion du respawn automatique
        if (!this.localPlayer.alive && this.gameState.respawnEnabled) {
            this.respawnPlayer(this.localPlayer.id);
        }
        
        if (!this.localPlayer.alive) return;
        
        const deltaTime = 1/60; // 60 FPS
        let dx = 0, dy = 0;
        
        // Gestion du mouvement
        if (this.keys['w'] || this.keys['z'] || this.keys['arrowup']) dy = -1;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
        if (this.keys['a'] || this.keys['q'] || this.keys['arrowleft']) dx = -1;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1;
        
        // Normalise le vecteur de mouvement
        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        // Vitesse modifiée selon les actions
        let speedMultiplier = 1;
        if (this.keys['shift']) speedMultiplier = 0.3; // Marche
        if (this.localPlayer.weapon === 'awp') speedMultiplier *= 0.8; // AWP ralentit
        
        // Applique le mouvement avec détection de collision
        const speed = this.localPlayer.speed * speedMultiplier;
        const newX = this.localPlayer.x + dx * speed * deltaTime;
        const newY = this.localPlayer.y + dy * speed * deltaTime;
        
        if (!this.checkCollision(newX, newY, 20)) {
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
        
        // Met à jour la caméra avec smooth follow
        const targetCameraX = this.localPlayer.x - this.canvas.width / 2;
        const targetCameraY = this.localPlayer.y - this.canvas.height / 2;
        
        this.camera.x += (targetCameraX - this.camera.x) * 0.1;
        this.camera.y += (targetCameraY - this.camera.y) * 0.1;
        
        // Vérifications spécifiques au mode FFA
        if (this.gameMode === 'ffa') {
            this.checkWeaponPickup();
        }
        
        // Met à jour les effets
        this.updateParticles();
        this.updateBullets();
        this.updateGrenades();
        this.updateEffects();
        this.updateWeaponSpawns();
        
        // Respawn automatique des joueurs morts (bots et humains)
        if (this.gameState.respawnEnabled) {
            Object.values(this.players).forEach(player => {
                if (!player.alive && Date.now() - player.lastRespawn > 5000) {
                    this.respawnPlayer(player.id);
                }
            });
        }
        
        // Envoie la position au serveur (throttled)
        if (timestamp % 50 < 16) { // Environ 20 FPS pour les updates réseau
            firebaseManager.updatePlayerPosition(
                this.localPlayer.x,
                this.localPlayer.y,
                this.localPlayer.angle
            );
        }
    }

    // Vérifie les collisions améliorées
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

    // Tire
    shoot() {
        if (!this.localPlayer || !this.localPlayer.alive || this.isReloading) return;
        
        const weapon = this.weapons[this.localPlayer.weapon];
        const currentTime = Date.now();
        
        // Vérifie le rate of fire
        if (currentTime - this.lastShotTime < weapon.fireRate) return;
        
        // Vérifie les munitions
        if (this.localPlayer.ammo <= 0) {
            this.playSound('empty');
            this.reload();
            return;
        }
        
        this.localPlayer.ammo--;
        this.lastShotTime = currentTime;
        
        // Effet visuel du tir
        this.createMuzzleFlash();
        this.addCameraShake();
        this.playSound('shoot');
        
        // Calcule la trajectoire avec dispersion
        const accuracy = weapon.accuracy * (this.keys['shift'] ? 1.2 : 1.0); // Meilleure précision en marchant
        const spread = (1 - accuracy) * 0.2;
        const angle = this.localPlayer.angle + (Math.random() - 0.5) * spread;
        
        const startX = this.localPlayer.x + Math.cos(this.localPlayer.angle) * 30;
        const startY = this.localPlayer.y + Math.sin(this.localPlayer.angle) * 30;
        
        // Crée une balle
        this.bullets.push({
            x: startX,
            y: startY,
            angle: angle,
            speed: 2000,
            damage: weapon.damage,
            range: weapon.range,
            distanceTraveled: 0,
            shooter: this.localPlayer.id
        });
        
        // Mise à jour de l'état
        this.updateWeaponDisplay();
        firebaseManager.updatePlayerState({ 
            ammo: this.localPlayer.ammo,
            weapon: this.localPlayer.weapon
        });
    }

    // Recharge l'arme
    reload() {
        if (!this.localPlayer || !this.localPlayer.alive || this.isReloading) return;
        
        const weapon = this.weapons[this.localPlayer.weapon];
        if (this.localPlayer.ammo >= weapon.ammo || this.localPlayer.ammoReserve <= 0) return;
        
        this.isReloading = true;
        this.showReloadStatus(true);
        this.playSound('reload');
        
        setTimeout(() => {
            const ammoNeeded = weapon.ammo - this.localPlayer.ammo;
            const ammoToReload = Math.min(ammoNeeded, this.localPlayer.ammoReserve);
            
            this.localPlayer.ammo += ammoToReload;
            this.localPlayer.ammoReserve -= ammoToReload;
            
            this.isReloading = false;
            this.showReloadStatus(false);
            this.updateWeaponDisplay();
            
            firebaseManager.updatePlayerState({
                ammo: this.localPlayer.ammo,
                ammoReserve: this.localPlayer.ammoReserve
            });
        }, weapon.reloadTime);
    }

    // Met à jour les balles
    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            // Déplace la balle
            const deltaTime = 1/60;
            const moveDistance = bullet.speed * deltaTime;
            bullet.x += Math.cos(bullet.angle) * moveDistance;
            bullet.y += Math.sin(bullet.angle) * moveDistance;
            bullet.distanceTraveled += moveDistance;
            
            // Vérifie la portée
            if (bullet.distanceTraveled > bullet.range) {
                return false;
            }
            
            // Vérifie les collisions avec les murs
            if (this.checkBulletWallCollision(bullet.x, bullet.y)) {
                this.createImpactEffect(bullet.x, bullet.y);
                return false;
            }
            
            // Vérifie les collisions avec les joueurs
            for (const player of Object.values(this.players)) {
                if (player.id === bullet.shooter || !player.alive) continue;
                
                const dx = player.x - bullet.x;
                const dy = player.y - bullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 20) {
                    this.hitPlayer(player.id, bullet.damage, bullet.shooter);
                    this.createBloodEffect(bullet.x, bullet.y);
                    return false;
                }
            }
            
            return true;
        });
    }

    // Vérifie les collisions des balles avec les murs
    checkBulletWallCollision(x, y) {
        for (const obstacle of this.map.obstacles) {
            if (x > obstacle.x && x < obstacle.x + obstacle.width &&
                y > obstacle.y && y < obstacle.y + obstacle.height) {
                return true;
            }
        }
        return false;
    }

    // Touche un joueur
    hitPlayer(playerId, damage, shooterId) {
        if (!this.players[playerId]) return;
        
        const player = this.players[playerId];
        const originalHealth = player.health;
        
        // Calcule les dégâts avec l'armure
        let actualDamage = damage;
        if (player.armor > 0) {
            const armorReduction = Math.min(actualDamage * 0.5, player.armor);
            actualDamage -= armorReduction;
            player.armor = Math.max(0, player.armor - armorReduction);
        }
        
        player.health = Math.max(0, player.health - actualDamage);
        player.lastHitTime = Date.now();
        
        // Effet visuel de dégâts
        this.showDamageIndicator(actualDamage, player.x, player.y);
        this.playSound('hit');
        
        if (player.health <= 0 && originalHealth > 0) {
            player.alive = false;
            this.players[shooterId].kills++;
            player.deaths++;
            
            this.addKillToFeed(this.players[shooterId].name, player.name, this.localPlayer.weapon);
            this.playSound('kill');
            
            firebaseManager.reportPlayerDeath(playerId);
            
            // Transfère la bombe si nécessaire
            if (player.hasBomb) {
                this.dropBomb(player.x, player.y);
            }
            
            // Récompense monétaire
            if (shooterId === this.localPlayer.id) {
                this.localPlayer.money += 300;
                this.showGameNotification('Élimination ! +$300', 'success');
            }
        }
        
        // Met à jour l'état du joueur touché
        database.ref(`lobbies/${firebaseManager.currentLobby}/players/${playerId}/state`).update({
            health: player.health,
            armor: player.armor,
            alive: player.alive
        });
    }

    // Interagit (plante/désamorce la bombe)
    interact() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        // Vérifie si le joueur peut planter la bombe
        if (this.localPlayer.team === 'T' && this.localPlayer.hasBomb && !this.gameState.bombPlanted) {
            for (const [site, area] of Object.entries(this.map.bombSites)) {
                if (this.isPlayerInArea(this.localPlayer, area)) {
                    this.startPlantBomb(site);
                    return;
                }
            }
        }
        
        // Vérifie si le joueur peut désamorcer
        if (this.localPlayer.team === 'CT' && this.gameState.bombPlanted && !this.localPlayer.isDefusing) {
            const site = this.map.bombSites[this.gameState.bombSite];
            const dx = this.localPlayer.x - (site.x + site.width/2);
            const dy = this.localPlayer.y - (site.y + site.height/2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 80) {
                this.startDefuse();
            }
        }
    }

    // Commence à planter la bombe
    startPlantBomb(site) {
        this.localPlayer.isPlanting = true;
        this.showGameNotification('Plantation de la bombe...', 'warning');
        
        let plantTime = 3;
        const plantInterval = setInterval(() => {
            plantTime--;
            
            if (plantTime <= 0) {
                clearInterval(plantInterval);
                this.plantBomb(site);
            }
            
            // Si le joueur bouge ou meurt, annule la plantation
            if (!this.localPlayer.isPlanting || !this.localPlayer.alive) {
                clearInterval(plantInterval);
                this.localPlayer.isPlanting = false;
            }
        }, 1000);
    }

    // Plante la bombe
    plantBomb(site) {
        this.localPlayer.hasBomb = false;
        this.localPlayer.isPlanting = false;
        this.localPlayer.money += 300; // Bonus plantation
        
        firebaseManager.plantBomb(site);
        firebaseManager.sendChatMessage(`💣 Bombe plantée sur ${site}!`);
        this.showGameNotification('Bombe plantée ! Défendez-la !', 'success');
        this.playSound('bomb_plant');
    }

    // Commence le désamorçage
    startDefuse() {
        this.localPlayer.isDefusing = true;
        firebaseManager.updatePlayerState({ isDefusing: true });
        this.showDefuseStatus(true);
        this.showGameNotification('Désamorçage en cours...', 'warning');
        
        const hasDefuseKit = this.localPlayer.equipment.includes('defuse');
        const defuseTime = hasDefuseKit ? 5 : 10;
        let timeLeft = defuseTime;
        
        const defuseInterval = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(defuseInterval);
                this.defuseBomb();
            }
            
            // Met à jour la barre de progression
            this.updateDefuseProgress((defuseTime - timeLeft) / defuseTime);
            
            // Si le joueur bouge ou meurt, annule le désamorçage
            if (!this.localPlayer.isDefusing || !this.localPlayer.alive) {
                clearInterval(defuseInterval);
                this.localPlayer.isDefusing = false;
                this.showDefuseStatus(false);
                firebaseManager.updatePlayerState({ isDefusing: false });
            }
        }, 1000);
    }

    // Désamorce la bombe
    defuseBomb() {
        this.localPlayer.isDefusing = false;
        this.localPlayer.money += 300; // Bonus désamorçage
        
        this.showDefuseStatus(false);
        firebaseManager.defuseBomb();
        firebaseManager.sendChatMessage('🛡️ Bombe désamorcée!');
        this.showGameNotification('Bombe désamorcée ! Excellent travail !', 'success');
        this.playSound('bomb_defuse');
    }

    // Menu d'achat amélioré
    toggleBuyMenu() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        // Vérifie si le joueur est dans la zone d'achat
        const buyZone = this.map.buyZones[this.localPlayer.team];
        if (!this.isPlayerInArea(this.localPlayer, buyZone)) {
            this.showGameNotification('Vous devez être dans votre zone de spawn pour acheter', 'warning');
            return;
        }
        
        const buyMenu = document.getElementById('buyMenu');
        const isVisible = buyMenu.style.display !== 'none';
        buyMenu.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.updateBuyMenu();
        }
    }

    // Met à jour le menu d'achat
    updateBuyMenu() {
        const buyItems = document.querySelectorAll('.buy-item');
        buyItems.forEach(item => {
            const price = parseInt(item.dataset.price);
            const affordable = this.localPlayer.money >= price;
            
            item.classList.toggle('affordable', affordable);
            item.classList.toggle('expensive', !affordable);
            
            item.onclick = affordable ? () => this.buyItem(item.dataset.item, price) : null;
        });
    }

    // Achète un objet
    buyItem(itemType, price) {
        if (this.localPlayer.money < price) return;
        
        this.localPlayer.money -= price;
        
        switch (itemType) {
            case 'ak47':
            case 'm4a4':
            case 'awp':
                this.localPlayer.weapon = itemType;
                this.localPlayer.ammo = this.weapons[itemType].ammo;
                this.localPlayer.ammoReserve = this.weapons[itemType].maxAmmo;
                if (!this.localPlayer.inventory.includes(itemType)) {
                    this.localPlayer.inventory.push(itemType);
                }
                break;
                
            case 'armor':
                this.localPlayer.armor = 100;
                break;
                
            case 'defuse':
                if (!this.localPlayer.equipment.includes('defuse')) {
                    this.localPlayer.equipment.push('defuse');
                }
                break;
                
            case 'hegrenade':
            case 'flashbang':
            case 'smoke':
                if (!this.localPlayer.equipment.includes(itemType)) {
                    this.localPlayer.equipment.push(itemType);
                }
                break;
        }
        
        this.updateWeaponDisplay();
        this.updateBuyMenu();
        this.showGameNotification(`Acheté: ${itemType} (-$${price})`, 'success');
        
        firebaseManager.updatePlayerState({
            weapon: this.localPlayer.weapon,
            ammo: this.localPlayer.ammo,
            ammoReserve: this.localPlayer.ammoReserve,
            armor: this.localPlayer.armor,
            money: this.localPlayer.money,
            inventory: this.localPlayer.inventory,
            equipment: this.localPlayer.equipment
        });
    }

    // Vérifie si un joueur est dans une zone
    isPlayerInArea(player, area) {
        return player.x >= area.x && 
               player.x <= area.x + area.width &&
               player.y >= area.y && 
               player.y <= area.y + area.height;
    }

    // Timers améliorés
    startRoundTimer() {
        let roundTime = 115; // 1:55 comme dans CS:GO
        
        this.roundTimer = setInterval(() => {
            roundTime--;
            
            const minutes = Math.floor(roundTime / 60);
            const seconds = roundTime % 60;
            document.getElementById('gameTimer').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Changement de couleur selon le temps restant
            const timerElement = document.getElementById('gameTimer');
            if (roundTime <= 10) {
                timerElement.style.color = '#ff4444';
                timerElement.style.animation = 'pulse 1s infinite';
            } else if (roundTime <= 30) {
                timerElement.style.color = '#ffaa00';
            }
            
            if (roundTime <= 0) {
                clearInterval(this.roundTimer);
                this.endRound();
            }
        }, 1000);
    }

    startBombTimer() {
        let bombTime = 40;
        document.getElementById('bombTimer').style.display = 'flex';
        
        this.bombTimer = setInterval(() => {
            bombTime--;
            document.getElementById('bombTimeLeft').textContent = bombTime;
            
            if (bombTime <= 0) {
                clearInterval(this.bombTimer);
                this.bombExplode();
            }
        }, 1000);
    }

    startBuyTimer() {
        let buyTime = 15;
        
        this.buyTimer = setInterval(() => {
            buyTime--;
            const buyTimeElement = document.getElementById('buyTimeLeft');
            if (buyTimeElement) {
                buyTimeElement.textContent = buyTime;
            }
            
            if (buyTime <= 0) {
                clearInterval(this.buyTimer);
                document.getElementById('buyMenu').style.display = 'none';
            }
        }, 1000);
    }

    // Rendu amélioré
    render() {
        // Efface le canvas
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sauvegarde le contexte
        this.ctx.save();
        
        // Applique la translation de la caméra
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Dessine la carte
        this.renderMap();
        
        // Dessine les effets en arrière-plan
        this.renderParticles();
        this.renderBullets();
        
        // Dessine les joueurs
        this.renderPlayers();
        
        // Dessine les effets au premier plan
        this.renderEffects();
        
        // Restaure le contexte
        this.ctx.restore();
        
        // Dessine le radar
        this.renderRadar();
    }

    // Dessine la carte améliorée
    renderMap() {
        // Sol avec texture
        const gradient = this.ctx.createLinearGradient(0, 0, this.map.width, this.map.height);
        gradient.addColorStop(0, '#3a3a3a');
        gradient.addColorStop(0.5, '#2a2a2a');
        gradient.addColorStop(1, '#3a3a3a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.map.width, this.map.height);
        
        // Grille subtile
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.map.width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.map.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.map.height; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.map.width, y);
            this.ctx.stroke();
        }
        
        // Zones d'achat (seulement en mode non-FFA)
        if (this.gameMode !== 'ffa') {
            Object.entries(this.map.buyZones).forEach(([team, zone]) => {
                this.ctx.fillStyle = team === 'CT' ? 'rgba(93, 121, 174, 0.1)' : 'rgba(222, 155, 53, 0.1)';
                this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
                this.ctx.strokeStyle = team === 'CT' ? '#5d79ae' : '#de9b35';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
                this.ctx.setLineDash([]);
            });
        }
        
        // Sites de bombe avec animations (seulement en mode bombe)
        if (['competitive', 'casual'].includes(this.gameMode)) {
            Object.entries(this.map.bombSites).forEach(([site, area]) => {
                // Animation de pulsation
                const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.9;
                
                this.ctx.fillStyle = `rgba(255, 255, 0, ${0.2 * pulse})`;
                this.ctx.fillRect(area.x, area.y, area.width, area.height);
                
                this.ctx.strokeStyle = area.color;
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(area.x, area.y, area.width, area.height);
                
                // Texte du site avec ombre
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.font = 'bold 60px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(site, area.x + area.width/2 + 2, area.y + area.height/2 + 2);
                
                this.ctx.fillStyle = area.color;
                this.ctx.fillText(site, area.x + area.width/2, area.y + area.height/2);
                this.ctx.restore();
            });
        }
        
        // Spawns d'armes pour FFA
        if (this.gameMode === 'ffa' && this.weaponSpawns) {
            this.weaponSpawns.forEach(spawn => {
                if (!spawn.active) return;
                
                const weapon = this.weapons[spawn.weapon];
                if (!weapon) return;
                
                // Animation de rotation
                const rotation = (Date.now() * 0.002) % (Math.PI * 2);
                
                // Aura lumineuse
                const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
                this.ctx.save();
                this.ctx.globalAlpha = pulse * 0.5;
                
                const gradient = this.ctx.createRadialGradient(spawn.x, spawn.y, 0, spawn.x, spawn.y, 40);
                gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(spawn.x, spawn.y, 40, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                
                // Base du spawn
                this.ctx.save();
                this.ctx.translate(spawn.x, spawn.y);
                this.ctx.rotate(rotation);
                
                // Plateforme hexagonale
                this.ctx.fillStyle = '#444';
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    const x = Math.cos(angle) * 25;
                    const y = Math.sin(angle) * 25;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.restore();
                
                // Icône de l'arme
                this.ctx.save();
                this.ctx.translate(spawn.x, spawn.y);
                this.ctx.rotate(Math.sin(Date.now() * 0.003) * 0.2);
                
                this.ctx.font = 'bold 32px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = '#ffd700';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(weapon.icon, 0, 0);
                this.ctx.fillText(weapon.icon, 0, 0);
                
                this.ctx.restore();
                
                // Nom de l'arme
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillText(weapon.name, spawn.x, spawn.y + 45);
            });
        }
        
        // Obstacles avec différents styles
        this.map.obstacles.forEach(obstacle => {
            if (obstacle.type === 'wall') {
                // Murs avec dégradé
                const wallGradient = this.ctx.createLinearGradient(
                    obstacle.x, obstacle.y, 
                    obstacle.x + obstacle.width, obstacle.y + obstacle.height
                );
                wallGradient.addColorStop(0, '#666');
                wallGradient.addColorStop(1, '#444');
                this.ctx.fillStyle = wallGradient;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Bordure
                this.ctx.strokeStyle = '#888';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else if (obstacle.type === 'cover') {
                // Couvertures avec style différent
                this.ctx.fillStyle = '#654321';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });
        
        // Bombe plantée avec animation (modes bombe uniquement)
        if (this.gameState && this.gameState.bombPlanted && ['competitive', 'casual'].includes(this.gameMode)) {
            const site = this.map.bombSites[this.gameState.bombSite];
            const bombX = site.x + site.width/2;
            const bombY = site.y + site.height/2;
            
            // Animation de pulsation dangereuse
            const pulse = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
            
            // Aura de danger
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(bombX, bombY, 80 * pulse, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Corps de la bombe
            this.ctx.fillStyle = '#cc0000';
            this.ctx.beginPath();
            this.ctx.arc(bombX, bombY, 25, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Détails de la bombe
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(bombX, bombY, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // LED clignotante
            if (Math.floor(Date.now() / 200) % 2) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.beginPath();
                this.ctx.arc(bombX - 8, bombY - 8, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Zones de respawn (FFA/TDM)
        if (['ffa', 'tdm'].includes(this.gameMode)) {
            const spawns = this.map.spawnPoints[this.gameMode === 'ffa' ? 'FFA' : 'CT'];
            if (spawns) {
                spawns.forEach((spawn, index) => {
                    // Indicateur de spawn subtil
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.fillStyle = this.gameMode === 'ffa' ? '#00ff00' : '#5d79ae';
                    this.ctx.beginPath();
                    this.ctx.arc(spawn.x, spawn.y, 15, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }
        }
    }

    // Dessine les joueurs avec plus de détails
    renderPlayers() {
        Object.values(this.players).forEach(player => {
            if (!player.alive) return;
            
            this.ctx.save();
            
            // Effet de prise de dégâts
            if (Date.now() - player.lastHitTime < 200) {
                this.ctx.globalAlpha = 0.7;
                this.ctx.filter = 'brightness(150%) contrast(150%)';
            }
            
            // Couleur selon le mode de jeu
            let playerColor, playerColorDark;
            if (this.gameMode === 'ffa') {
                // En FFA, chaque joueur a sa propre couleur
                const hue = (player.id.charCodeAt(0) * 137.5) % 360;
                playerColor = `hsl(${hue}, 70%, 50%)`;
                playerColorDark = `hsl(${hue}, 70%, 35%)`;
            } else {
                // Mode équipe classique
                playerColor = player.team === 'CT' ? '#5d79ae' : '#de9b35';
                playerColorDark = player.team === 'CT' ? '#4a6592' : '#b8812b';
            }
            
            // Indicateur de bot
            if (player.isBot) {
                // Aura spéciale pour les bots
                this.ctx.save();
                this.ctx.globalAlpha = 0.3;
                const botGlow = this.ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 30);
                botGlow.addColorStop(0, 'rgba(255, 0, 255, 0.5)');
                botGlow.addColorStop(1, 'transparent');
                this.ctx.fillStyle = botGlow;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
            
            // Ombre du joueur
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(player.x, player.y + 25, 20, 8, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Corps du joueur avec dégradé
            const playerGradient = this.ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 20);
            playerGradient.addColorStop(0, playerColor);
            playerGradient.addColorStop(1, playerColorDark);
            
            this.ctx.fillStyle = playerGradient;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Bordure du joueur
            this.ctx.strokeStyle = playerColor;
            this.ctx.lineWidth = player.id === this.localPlayer?.id ? 3 : 2;
            this.ctx.stroke();
            
            // Direction de vue améliorée
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            this.ctx.lineTo(
                player.x + Math.cos(player.angle) * 35,
                player.y + Math.sin(player.angle) * 35
            );
            this.ctx.stroke();
            
            // Arme visible
            const weapon = this.weapons[player.weapon];
            if (weapon) {
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeText(
                    weapon.icon, 
                    player.x + Math.cos(player.angle) * 30, 
                    player.y + Math.sin(player.angle) * 30
                );
                this.ctx.fillText(
                    weapon.icon, 
                    player.x + Math.cos(player.angle) * 30, 
                    player.y + Math.sin(player.angle) * 30
                );
            }
            
            // Nom du joueur avec fond semi-transparent
            const nameY = player.y - 35;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            const nameWidth = this.ctx.measureText(player.name).width;
            this.ctx.fillRect(player.x - nameWidth/2 - 4, nameY - 8, nameWidth + 8, 16);
            
            // Couleur du nom selon le mode
            if (this.gameMode === 'ffa') {
                this.ctx.fillStyle = playerColor;
            } else {
                this.ctx.fillStyle = player.team === 'CT' ? '#87ceeb' : '#ffa500';
            }
            
            // Préfixe pour les bots
            const displayName = player.isBot ? `🤖 ${player.name}` : player.name;
            this.ctx.fillText(displayName, player.x, nameY);
            
            // Score en FFA
            if (this.gameMode === 'ffa') {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillText(`${player.score || player.kills || 0}`, player.x, nameY + 12);
            }
            
            // Barres de vie et armure
            this.renderPlayerBars(player);
            
            // Indicateurs spéciaux
            if (player.hasBomb && this.gameMode !== 'ffa') {
                this.ctx.font = 'bold 20px Arial';
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillText('💣', player.x, player.y - 45);
            }
            
            if (player.isDefusing) {
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillText('🔧', player.x + 20, player.y - 20);
                
                // Cercle de progression
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, 25, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * 0.5), false);
                this.ctx.stroke();
            }
            
            if (player.isPlanting) {
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.fillText('💣', player.x + 20, player.y - 20);
            }
            
            // Indicateur de cible pour les bots (debug)
            if (player.isBot && player.ai?.target && window.sioShooterApp?.config?.debugMode) {
                this.ctx.strokeStyle = '#ff00ff';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(player.x, player.y);
                this.ctx.lineTo(player.ai.target.x, player.ai.target.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            this.ctx.restore();
        });
    }
    
    // Démarre les timers de jeu selon le mode
    startGameTimers() {
        switch (this.gameMode) {
            case 'competitive':
            case 'casual':
                this.startRoundTimer();
                this.startBuyTimer();
                break;
            case 'ffa':
            case 'tdm':
                this.startMatchTimer();
                break;
            case 'gungame':
                this.startMatchTimer();
                break;
        }
    }
    
    // Timer de match (FFA/TDM)
    startMatchTimer() {
        const timeLimit = this.gameState.timeLimit || 600; // 10 minutes par défaut
        let timeLeft = timeLimit;
        
        this.matchTimer = setInterval(() => {
            timeLeft--;
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.getElementById('gameTimer').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Changement de couleur selon le temps restant
            const timerElement = document.getElementById('gameTimer');
            if (timeLeft <= 30) {
                timerElement.style.color = '#ff4444';
                timerElement.style.animation = 'pulse 1s infinite';
            } else if (timeLeft <= 60) {
                timerElement.style.color = '#ffaa00';
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.matchTimer);
                this.endMatch();
            }
        }, 1000);
    }
    
    // Termine le match
    endMatch() {
        if (this.gameMode === 'ffa') {
            // Trouve le gagnant en FFA
            const sortedPlayers = Object.values(this.players)
                .sort((a, b) => (b.score || b.kills || 0) - (a.score || a.kills || 0));
            
            const winner = sortedPlayers[0];
            this.showGameNotification(`🏆 ${winner.name} gagne avec ${winner.score || winner.kills || 0} points !`, 'success');
            
        } else if (this.gameMode === 'tdm') {
            // Détermine l'équipe gagnante
            const ctScore = Object.values(this.players)
                .filter(p => p.team === 'CT')
                .reduce((sum, p) => sum + (p.kills || 0), 0);
            
            const tScore = Object.values(this.players)
                .filter(p => p.team === 'T')
                .reduce((sum, p) => sum + (p.kills || 0), 0);
            
            const winner = ctScore > tScore ? 'CT' : 'T';
            this.showGameNotification(`🏆 ${winner === 'CT' ? 'Counter-Terrorists' : 'Terrorists'} gagnent ${ctScore}-${tScore} !`, 'success');
        }
        
        // Affiche les statistiques finales
        setTimeout(() => {
            this.showFinalStats();
        }, 3000);
    }
    
    // Affiche les statistiques finales
    showFinalStats() {
        const statsModal = document.createElement('div');
        statsModal.className = 'final-stats-modal';
        
        let statsHTML = '<div class="stats-header"><h2>🏆 STATISTIQUES FINALES</h2></div><div class="stats-content">';
        
        if (this.gameMode === 'ffa') {
            // Leaderboard FFA
            const sortedPlayers = Object.values(this.players)
                .sort((a, b) => (b.score || b.kills || 0) - (a.score || a.kills || 0));
            
            statsHTML += '<div class="ffa-leaderboard">';
            sortedPlayers.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const botIndicator = player.isBot ? '🤖' : '👤';
                statsHTML += `
                    <div class="leaderboard-entry ${index < 3 ? 'podium' : ''}">
                        <span class="rank">${medal}</span>
                        <span class="player-name">${botIndicator} ${player.name}</span>
                        <span class="player-score">${player.score || player.kills || 0}</span>
                        <span class="player-kd">${player.kills || 0}/${player.deaths || 0}</span>
                    </div>
                `;
            });
            statsHTML += '</div>';
        } else {
            // Statistiques par équipe
            const ctPlayers = Object.values(this.players).filter(p => p.team === 'CT');
            const tPlayers = Object.values(this.players).filter(p => p.team === 'T');
            
            statsHTML += '<div class="team-stats">';
            
            [
                { name: 'Counter-Terrorists', players: ctPlayers, color: '#5d79ae' },
                { name: 'Terrorists', players: tPlayers, color: '#de9b35' }
            ].forEach(team => {
                statsHTML += `<div class="team-section" style="border-color: ${team.color}">`;
                statsHTML += `<h3 style="color: ${team.color}">${team.name}</h3>`;
                
                team.players
                    .sort((a, b) => (b.kills || 0) - (a.kills || 0))
                    .forEach(player => {
                        const botIndicator = player.isBot ? '🤖' : '👤';
                        statsHTML += `
                            <div class="player-stat">
                                <span>${botIndicator} ${player.name}</span>
                                <span>${player.kills || 0}K/${player.deaths || 0}D</span>
                            </div>
                        `;
                    });
                
                statsHTML += '</div>';
            });
            
            statsHTML += '</div>';
        }
        
        statsHTML += `
            </div>
            <div class="stats-footer">
                <button class="btn btn-primary" onclick="this.closest('.final-stats-modal').remove(); location.reload();">
                    Nouvelle Partie
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.final-stats-modal').remove(); menuManager.showScreen('lobby');">
                    Retour aux Lobbys
                </button>
            </div>
        `;
        
        statsModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">${statsHTML}</div>
        `;
        
        document.body.appendChild(statsModal);
    }
    
    // Met à jour le HUD selon le mode de jeu
    updateHUD() {
        if (this.gameMode === 'ffa') {
            // Mode FFA : affiche le leaderboard au lieu des scores d'équipe
            this.updateFFALeaderboard();
        } else {
            // Modes d'équipe classiques
            document.getElementById('ctScore').textContent = this.gameState.ctScore;
            document.getElementById('tScore').textContent = this.gameState.tScore;
        }
        
        document.getElementById('currentRound').textContent = this.gameState.currentRound;
        
        if (this.localPlayer) {
            // Stats du joueur
            this.updateHealthBar();
            this.updateArmorBar();
            this.updateWeaponDisplay();
            
            // Argent seulement si pas en FFA
            if (this.gameMode !== 'ffa') {
                this.updateMoneyDisplay();
            } else {
                document.getElementById('playerMoney').textContent = `Score: ${this.localPlayer.score || this.localPlayer.kills || 0}`;
            }
        }
        
        // Statut de la bombe (seulement en mode bombe)
        const bombStatus = document.getElementById('bombStatus');
        if (['competitive', 'casual'].includes(this.gameMode)) {
            if (this.gameState.bombPlanted) {
                bombStatus.textContent = `Bombe plantée sur ${this.gameState.bombSite}`;
                bombStatus.style.display = 'flex';
            } else if (this.localPlayer && this.localPlayer.hasBomb) {
                bombStatus.textContent = 'Vous portez la bombe';
                bombStatus.style.display = 'flex';
            } else {
                bombStatus.style.display = 'none';
            }
        } else {
            bombStatus.style.display = 'none';
        }
    }
    
    // Met à jour le leaderboard FFA
    updateFFALeaderboard() {
        const ctScoreElement = document.getElementById('ctScore');
        const tScoreElement = document.getElementById('tScore');
        
        // Remplace les scores d'équipe par le top 3 FFA
        const sortedPlayers = Object.values(this.players)
            .sort((a, b) => (b.score || b.kills || 0) - (a.score || a.kills || 0))
            .slice(0, 3);
        
        if (sortedPlayers.length > 0) {
            const first = sortedPlayers[0];
            const second = sortedPlayers[1];
            const third = sortedPlayers[2];
            
            ctScoreElement.textContent = first ? `🥇 ${first.name}: ${first.score || first.kills || 0}` : '';
            
            if (second && third) {
                tScoreElement.textContent = `🥈 ${second.name}: ${second.score || second.kills || 0} | 🥉 ${third.name}: ${third.score || third.kills || 0}`;
            } else if (second) {
                tScoreElement.textContent = `🥈 ${second.name}: ${second.score || second.kills || 0}`;
            } else {
                tScoreElement.textContent = '';
            }
        }
    }
    
    // Gestion du menu d'achat selon le mode
    toggleBuyMenu() {
        // Pas de menu d'achat en FFA
        if (this.gameMode === 'ffa') {
            this.showGameNotification('💡 Ramassez les armes sur la carte !', 'info');
            return;
        }
        
        if (!this.localPlayer || !this.localPlayer.alive) return;
        
        // Vérifie si le joueur est dans la zone d'achat
        const buyZone = this.map.buyZones[this.localPlayer.team];
        if (!this.isPlayerInArea(this.localPlayer, buyZone)) {
            this.showGameNotification('Vous devez être dans votre zone de spawn pour acheter', 'warning');
            return;
        }
        
        const buyMenu = document.getElementById('buyMenu');
        const isVisible = buyMenu.style.display !== 'none';
        buyMenu.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.updateBuyMenu();
        }
    }
    
    // Touche un joueur avec gestion du FFA
    hitPlayer(playerId, damage, shooterId) {
        if (!this.players[playerId]) return;
        
        const player = this.players[playerId];
        const shooter = this.players[shooterId];
        const originalHealth = player.health;
        
        // Vérifie le friendly fire
        if (this.gameMode !== 'ffa' && player.team === shooter?.team && !this.lobbyData.settings.friendlyFire) {
            return; // Pas de friendly fire
        }
        
        // Calcule les dégâts avec l'armure
        let actualDamage = damage;
        if (player.armor > 0) {
            const armorReduction = Math.min(actualDamage * 0.5, player.armor);
            actualDamage -= armorReduction;
            player.armor = Math.max(0, player.armor - armorReduction);
        }
        
        player.health = Math.max(0, player.health - actualDamage);
        player.lastHitTime = Date.now();
        
        // Effet visuel de dégâts
        this.showDamageIndicator(actualDamage, player.x, player.y);
        this.playSound('hit');
        
        if (player.health <= 0 && originalHealth > 0) {
            player.alive = false;
            player.lastRespawn = Date.now();
            
            if (shooter) {
                shooter.kills = (shooter.kills || 0) + 1;
                
                // Score différent selon le mode
                if (this.gameMode === 'ffa') {
                    shooter.score = (shooter.score || 0) + 1;
                } else if (this.gameMode === 'tdm') {
                    shooter.score = (shooter.score || 0) + 1;
                }
            }
            
            player.deaths = (player.deaths || 0) + 1;
            
            this.addKillToFeed(shooter?.name || 'Inconnu', player.name, this.localPlayer?.weapon || 'unknown');
            this.playSound('kill');
            
            // Respawn automatique si activé
            if (this.gameState.respawnEnabled) {
                setTimeout(() => {
                    this.respawnPlayer(playerId);
                }, this.gameMode === 'ffa' ? 3000 : 5000);
            }
            
            firebaseManager.reportPlayerDeath(playerId, shooterId);
            
            // Récompense monétaire (sauf FFA)
            if (shooterId === this.localPlayer?.id && this.gameMode !== 'ffa') {
                this.localPlayer.money += 300;
                this.showGameNotification('Élimination ! +$300', 'success');
            }
            
            // Vérifie les conditions de victoire
            this.checkWinConditions();
        }
        
        // Met à jour l'état du joueur touché
        database.ref(`lobbies/${firebaseManager.currentLobby}/players/${playerId}/state`).update({
            health: player.health,
            armor: player.armor,
            alive: player.alive,
            kills: shooter?.kills || 0,
            deaths: player.deaths || 0,
            score: (this.gameMode === 'ffa' || this.gameMode === 'tdm') ? (player.score || player.kills || 0) : undefined
        });
    }
    
    // Vérifie les conditions de victoire selon le mode
    checkWinConditions() {
        switch (this.gameMode) {
            case 'ffa':
                const topPlayer = Object.values(this.players)
                    .reduce((best, player) => 
                        (player.score || player.kills || 0) > (best.score || best.kills || 0) ? player : best
                    );
                
                if ((topPlayer.score || topPlayer.kills || 0) >= (this.gameState.scoreLimit || 30)) {
                    this.endMatch();
                }
                break;
                
            case 'tdm':
                const ctKills = Object.values(this.players)
                    .filter(p => p.team === 'CT')
                    .reduce((sum, p) => sum + (p.kills || 0), 0);
                
                const tKills = Object.values(this.players)
                    .filter(p => p.team === 'T')
                    .reduce((sum, p) => sum + (p.kills || 0), 0);
                
                if (ctKills >= (this.gameState.scoreLimit || 75) || tKills >= (this.gameState.scoreLimit || 75)) {
                    this.endMatch();
                }
                break;
        }
    }

    // Dessine les barres de vie et armure des joueurs
    renderPlayerBars(player) {
        const barWidth = 36;
        const barHeight = 4;
        const barY = player.y - 45;
        
        // Barre de vie
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(player.x - barWidth/2, barY, barWidth, barHeight);
        
        const healthPercentage = player.health / player.maxHealth;
        const healthColor = healthPercentage > 0.6 ? '#4caf50' : 
                           healthPercentage > 0.3 ? '#ffaa00' : '#ff4444';
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(
            player.x - barWidth/2,
            barY,
            healthPercentage * barWidth,
            barHeight
        );
        
        // Barre d'armure (si présente)
        if (player.armor > 0) {
            const armorBarY = barY - 6;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(player.x - barWidth/2, armorBarY, barWidth, barHeight);
            
            const armorPercentage = player.armor / player.maxArmor;
            this.ctx.fillStyle = '#2196f3';
            this.ctx.fillRect(
                player.x - barWidth/2,
                armorBarY,
                armorPercentage * barWidth,
                barHeight
            );
        }
    }

    // Dessine les balles
    renderBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.save();
            
            // Traînée de la balle
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x, bullet.y);
            this.ctx.lineTo(
                bullet.x - Math.cos(bullet.angle) * 20,
                bullet.y - Math.sin(bullet.angle) * 20
            );
            this.ctx.stroke();
            
            // Corps de la balle
            this.ctx.fillStyle = '#ffff88';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    // Effets visuels améliorés
    createMuzzleFlash() {
        const player = this.localPlayer;
        const flashX = player.x + Math.cos(player.angle) * 30;
        const flashY = player.y + Math.sin(player.angle) * 30;
        
        this.effects.push({
            type: 'muzzleFlash',
            x: flashX,
            y: flashY,
            angle: player.angle,
            lifetime: 100,
            maxLifetime: 100
        });
        
        // Particules de fumée
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: flashX,
                y: flashY,
                vx: Math.cos(player.angle) * 50 + (Math.random() - 0.5) * 100,
                vy: Math.sin(player.angle) * 50 + (Math.random() - 0.5) * 100,
                size: Math.random() * 3 + 1,
                color: `rgba(200, 200, 200, ${Math.random() * 0.5 + 0.3})`,
                lifetime: Math.random() * 500 + 200,
                maxLifetime: Math.random() * 500 + 200
            });
        }
    }

    createImpactEffect(x, y) {
        // Étincelles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (Math.random() * 100 + 50),
                vy: Math.sin(angle) * (Math.random() * 100 + 50),
                size: Math.random() * 2 + 1,
                color: `rgba(255, ${Math.random() * 100 + 155}, 0, 1)`,
                lifetime: Math.random() * 300 + 100,
                maxLifetime: Math.random() * 300 + 100
            });
        }
    }

    createBloodEffect(x, y) {
        // Particules de sang
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (Math.random() * 80 + 20),
                vy: Math.sin(angle) * (Math.random() * 80 + 20),
                size: Math.random() * 4 + 2,
                color: `rgba(${Math.random() * 50 + 150}, 0, 0, ${Math.random() * 0.8 + 0.2})`,
                lifetime: Math.random() * 1000 + 500,
                maxLifetime: Math.random() * 1000 + 500
            });
        }
    }

    // Met à jour les particules
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * (1/60);
            particle.y += particle.vy * (1/60);
            particle.vy += 200 * (1/60); // Gravité
            particle.vx *= 0.98; // Friction
            particle.vy *= 0.98;
            particle.lifetime -= 16.67; // 60 FPS
            
            return particle.lifetime > 0;
        });
    }

    // Met à jour les effets
    updateEffects() {
        this.effects = this.effects.filter(effect => {
            effect.lifetime -= 16.67;
            return effect.lifetime > 0;
        });
    }

    // Dessine les particules
    renderParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.lifetime / particle.maxLifetime;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    // Dessine les effets
    renderEffects() {
        this.effects.forEach(effect => {
            if (effect.type === 'muzzleFlash') {
                const alpha = effect.lifetime / effect.maxLifetime;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.translate(effect.x, effect.y);
                this.ctx.rotate(effect.angle);
                
                // Flash principal
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
                gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
                gradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(-15, -15, 30, 30);
                
                this.ctx.restore();
            }
        });
    }

    // Radar amélioré
    renderRadar() {
        const radarSize = 180;
        const mapScale = radarSize / Math.max(this.map.width, this.map.height);
        
        this.radarCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.radarCtx.fillRect(0, 0, radarSize, radarSize);
        
        // Obstacles sur le radar
        this.radarCtx.fillStyle = '#666';
        this.map.obstacles.forEach(obstacle => {
            this.radarCtx.fillRect(
                obstacle.x * mapScale,
                obstacle.y * mapScale,
                obstacle.width * mapScale,
                obstacle.height * mapScale
            );
        });
        
        // Sites de bombe
        Object.entries(this.map.bombSites).forEach(([site, area]) => {
            this.radarCtx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.radarCtx.fillRect(
                area.x * mapScale,
                area.y * mapScale,
                area.width * mapScale,
                area.height * mapScale
            );
            
            this.radarCtx.fillStyle = '#ffff00';
            this.radarCtx.font = '12px Arial';
            this.radarCtx.textAlign = 'center';
            this.radarCtx.fillText(
                site,
                (area.x + area.width/2) * mapScale,
                (area.y + area.height/2) * mapScale + 4
            );
        });
        
        // Joueurs sur le radar
        Object.values(this.players).forEach(player => {
            if (!player.alive) return;
            
            const radarX = player.x * mapScale;
            const radarY = player.y * mapScale;
            
            // Forme différente selon l'équipe
            this.radarCtx.fillStyle = player.team === 'CT' ? '#5d79ae' : '#de9b35';
            
            if (player.team === 'CT') {
                // Triangle pour CT
                this.radarCtx.beginPath();
                this.radarCtx.moveTo(radarX, radarY - 4);
                this.radarCtx.lineTo(radarX - 3, radarY + 2);
                this.radarCtx.lineTo(radarX + 3, radarY + 2);
                this.radarCtx.closePath();
                this.radarCtx.fill();
            } else {
                // Carré pour T
                this.radarCtx.fillRect(radarX - 3, radarY - 3, 6, 6);
            }
            
            // Joueur local avec bordure
            if (player.id === this.localPlayer.id) {
                this.radarCtx.strokeStyle = '#ffffff';
                this.radarCtx.lineWidth = 2;
                this.radarCtx.stroke();
            }
        });
        
        // Bombe plantée
        if (this.gameState && this.gameState.bombPlanted) {
            const site = this.map.bombSites[this.gameState.bombSite];
            const bombX = (site.x + site.width/2) * mapScale;
            const bombY = (site.y + site.height/2) * mapScale;
            
            // Animation clignotante
            if (Math.floor(Date.now() / 500) % 2) {
                this.radarCtx.fillStyle = '#ff0000';
                this.radarCtx.beginPath();
                this.radarCtx.arc(bombX, bombY, 5, 0, Math.PI * 2);
                this.radarCtx.fill();
            }
        }
    }

    // Interface utilisateur améliorée
    updateHUD() {
        // Scores
        document.getElementById('ctScore').textContent = this.gameState.ctScore;
        document.getElementById('tScore').textContent = this.gameState.tScore;
        document.getElementById('currentRound').textContent = this.gameState.currentRound;
        
        if (this.localPlayer) {
            // Stats du joueur
            this.updateHealthBar();
            this.updateArmorBar();
            this.updateWeaponDisplay();
            this.updateMoneyDisplay();
        }
        
        // Statut de la bombe
        const bombStatus = document.getElementById('bombStatus');
        if (this.gameState.bombPlanted) {
            bombStatus.textContent = `Bombe plantée sur ${this.gameState.bombSite}`;
            bombStatus.style.display = 'flex';
        } else if (this.localPlayer && this.localPlayer.hasBomb) {
            bombStatus.textContent = 'Vous portez la bombe';
            bombStatus.style.display = 'flex';
        } else {
            bombStatus.style.display = 'none';
        }
    }

    updateHealthBar() {
        const healthBar = document.getElementById('healthBar');
        const healthText = document.getElementById('playerHealth');
        const percentage = (this.localPlayer.health / this.localPlayer.maxHealth) * 100;
        
        healthBar.style.width = percentage + '%';
        healthText.textContent = this.localPlayer.health;
        
        // Couleur selon la santé
        if (percentage > 60) {
            healthBar.style.background = 'linear-gradient(90deg, #4caf50, #66bb6a)';
        } else if (percentage > 30) {
            healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc33)';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
        }
    }

    updateArmorBar() {
        const armorBar = document.getElementById('armorBar');
        const armorText = document.getElementById('playerArmor');
        const percentage = (this.localPlayer.armor / this.localPlayer.maxArmor) * 100;
        
        armorBar.style.width = percentage + '%';
        armorText.textContent = this.localPlayer.armor;
    }

    updateWeaponDisplay() {
        const weapon = this.weapons[this.localPlayer.weapon];
        
        document.getElementById('weaponIcon').textContent = weapon.icon;
        document.getElementById('weaponName').textContent = weapon.name;
        document.getElementById('playerAmmo').textContent = this.localPlayer.ammo;
        document.getElementById('playerAmmoReserve').textContent = this.localPlayer.ammoReserve;
        
        // Couleur des munitions selon la quantité
        const ammoElement = document.getElementById('playerAmmo');
        const ammoPercentage = this.localPlayer.ammo / weapon.ammo;
        
        if (ammoPercentage <= 0.2) {
            ammoElement.style.color = '#ff4444';
        } else if (ammoPercentage <= 0.5) {
            ammoElement.style.color = '#ffaa00';
        } else {
            ammoElement.style.color = '#ffffff';
        }
    }

    updateMoneyDisplay() {
        document.getElementById('playerMoney').textContent = `$${this.localPlayer.money}`;
    }

    // Gestion des statuts
    showReloadStatus(show) {
        document.getElementById('reloadStatus').style.display = show ? 'flex' : 'none';
    }

    showDefuseStatus(show) {
        document.getElementById('defuseStatus').style.display = show ? 'flex' : 'none';
    }

    updateDefuseProgress(progress) {
        const progressBar = document.querySelector('.defuse-progress');
        if (progressBar) {
            progressBar.style.width = (progress * 100) + '%';
        }
    }

    // Notifications de jeu
    showGameNotification(message, type = 'info') {
        const container = document.getElementById('gameNotifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Supprime après l'animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Kill feed
    addKillToFeed(killer, victim, weapon) {
        const killFeed = document.getElementById('killFeed');
        const killMessage = document.createElement('div');
        killMessage.className = 'kill-message';
        
        const weaponIcon = this.weapons[weapon] ? this.weapons[weapon].icon : '🔫';
        killMessage.innerHTML = `<strong>${killer}</strong> ${weaponIcon} ${victim}`;
        
        killFeed.appendChild(killMessage);
        
        // Supprime après 5 secondes
        setTimeout(() => {
            if (killMessage.parentNode) {
                killMessage.parentNode.removeChild(killMessage);
            }
        }, 5000);
    }

    // Scoreboard
    showScoreboard(show) {
        document.getElementById('scoreboard').style.display = show ? 'block' : 'none';
        
        if (show) {
            this.updateScoreboard();
        }
    }

    updateScoreboard() {
        const ctList = document.getElementById('ctPlayersList');
        const tList = document.getElementById('tPlayersList');
        
        ctList.innerHTML = '';
        tList.innerHTML = '';
        
        Object.values(this.players).forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-score-item';
            playerElement.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-kills">${player.kills}</span>
                <span class="player-deaths">${player.deaths}</span>
                <span class="player-assists">${player.assists}</span>
            `;
            
            if (player.team === 'CT') {
                ctList.appendChild(playerElement);
            } else {
                tList.appendChild(playerElement);
            }
        });
    }

    // Chat amélioré
    sendChatMessage(teamOnly = false) {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            firebaseManager.sendChatMessage(message, teamOnly);
            input.value = '';
        }
    }

    // Audio simulé
    playSound(soundType) {
        const soundIcon = this.sounds[soundType] || '🔊';
        
        // Affiche brièvement l'icône du son
        const soundIndicator = document.createElement('div');
        soundIndicator.textContent = soundIcon;
        soundIndicator.style.position = 'fixed';
        soundIndicator.style.top = '50px';
        soundIndicator.style.right = '50px';
        soundIndicator.style.fontSize = '24px';
        soundIndicator.style.zIndex = '9999';
        soundIndicator.style.opacity = '0.8';
        soundIndicator.style.pointerEvents = 'none';
        
        document.body.appendChild(soundIndicator);
        
        setTimeout(() => {
            if (soundIndicator.parentNode) {
                soundIndicator.parentNode.removeChild(soundIndicator);
            }
        }, 1000);
    }

    // Gestion des événements de fin
    endRound() {
        clearInterval(this.bombTimer);
        clearInterval(this.roundTimer);
        clearInterval(this.buyTimer);
        
        // Logique de fin de round améliorée
        const ctAlive = Object.values(this.players).filter(p => p.team === 'CT' && p.alive).length;
        const tAlive = Object.values(this.players).filter(p => p.team === 'T' && p.alive).length;
        
        let ctWin = false;
        let endReason = '';
        
        if (this.gameState.bombDefused) {
            ctWin = true;
            endReason = 'Bombe désamorcée';
        } else if (this.gameState.bombExploded) {
            ctWin = false;
            endReason = 'Bombe explosée';
        } else if (tAlive === 0) {
            ctWin = true;
            endReason = 'Tous les terroristes éliminés';
        } else if (ctAlive === 0) {
            ctWin = false;
            endReason = 'Tous les CT éliminés';
        } else if (!this.gameState.bombPlanted) {
            ctWin = true;
            endReason = 'Temps écoulé';
        }
        
        // Affiche le résultat
        this.showRoundEndScreen(ctWin, endReason);
        
        firebaseManager.updateScore(ctWin);
        
        // Prépare le prochain round après un délai
        setTimeout(() => {
            this.prepareNextRound();
        }, 5000);
    }

    showRoundEndScreen(ctWin, reason) {
        const endScreen = document.createElement('div');
        endScreen.className = 'round-end';
        endScreen.innerHTML = `
            <h2>${ctWin ? 'COUNTER-TERRORISTS' : 'TERRORISTS'} GAGNENT</h2>
            <p>${reason}</p>
        `;
        
        document.body.appendChild(endScreen);
        
        setTimeout(() => {
            if (endScreen.parentNode) {
                endScreen.parentNode.removeChild(endScreen);
            }
        }, 4000);
    }

    bombExplode() {
        // Effet d'explosion
        this.createExplosionEffect();
        
        database.ref(`lobbies/${firebaseManager.currentLobby}/gameState`).update({
            bombExploded: true
        });
        
        firebaseManager.updateScore(false);
        firebaseManager.sendChatMessage('💥 La bombe a explosé! Les Terroristes gagnent!');
        this.playSound('explosion');
    }

    createExplosionEffect() {
        if (!this.gameState.bombPlanted) return;
        
        const site = this.map.bombSites[this.gameState.bombSite];
        const bombX = site.x + site.width/2;
        const bombY = site.y + site.height/2;
        
        // Crée beaucoup de particules d'explosion
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 500 + 200;
            
            this.particles.push({
                x: bombX,
                y: bombY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 8 + 4,
                color: `rgba(255, ${Math.random() * 100 + 100}, 0, 1)`,
                lifetime: Math.random() * 2000 + 1000,
                maxLifetime: Math.random() * 2000 + 1000
            });
        }
        
        // Secoue l'écran
        this.addCameraShake(20);
    }

    addCameraShake(intensity = 5) {
        const originalX = this.camera.x;
        const originalY = this.camera.y;
        
        let shakeTime = 0;
        const shakeDuration = 200;
        
        const shake = () => {
            if (shakeTime < shakeDuration) {
                this.camera.x = originalX + (Math.random() - 0.5) * intensity;
                this.camera.y = originalY + (Math.random() - 0.5) * intensity;
                shakeTime += 16.67;
                requestAnimationFrame(shake);
            } else {
                this.camera.x = originalX;
                this.camera.y = originalY;
            }
        };
        
        shake();
    }

    prepareNextRound() {
        // Réinitialisation pour le prochain round
        location.reload(); // Simplifié pour cette démo
    }

    // Menu pause
    togglePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        const isVisible = pauseMenu.style.display !== 'none';
        pauseMenu.style.display = isVisible ? 'none' : 'block';
    }
}

// Instance globale
window.game = new Game();