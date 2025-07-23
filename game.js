class Game {
    constructor() {
        this.isInitialized = false;
        this.gameTimer = null;
        this.updateLoop = null;
        this.spawnPositions = [];
        
        // Statistiques de performance
        this.fps = 0;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
    }

    init() {
        if (this.isInitialized) return;

        console.log('Initialisation du jeu...');
        
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupWorld();
        this.setupPlayer();
        this.setupEnemies();
        this.setupUI();
        
        // Initialisation des contrôles
        gameControls = new GameControls();
        
        this.isInitialized = true;
        console.log('Jeu initialisé avec succès!');
    }

    setupScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x404040, 20, 100);
        scene.background = new THREE.Color(CONFIG.COLORS.SKY);
    }

    setupRenderer() {
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(CONFIG.COLORS.SKY);
        
        // Configuration des ombres
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = true;
        
        // Optimisations
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        
        document.getElementById('gameContainer').appendChild(renderer.domElement);
    }

    setupCamera() {
        camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            200 // Far plane
        );
        
        camera.position.set(0, CONFIG.PLAYER.HEIGHT, 0);
        camera.rotation.order = 'YXZ';
        
        // Réinitialisation des rotations
        mouseX = 0;
        mouseY = 0;
    }

    setupWorld() {
        console.log('Génération de la carte...');
        this.spawnPositions = createMap();
        console.log(`Carte créée avec ${this.spawnPositions.length} positions de spawn`);
    }

    setupPlayer() {
        player = new Player();
        console.log('Joueur initialisé');
    }

    setupEnemies() {
        enemies = [];
        
        // Sélectionner des positions de spawn aléatoires
        const shuffledPositions = [...this.spawnPositions].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < CONFIG.GAME.ENEMY_COUNT && i < shuffledPositions.length; i++) {
            const enemyType = Math.random() < 0.7 ? 'terrorist' : 'sniper';
            const enemy = new Enemy(shuffledPositions[i], enemyType);
            enemies.push(enemy);
        }
        
        console.log(`${enemies.length} ennemis créés`);
        this.updateEnemyCount();
    }

    setupUI() {
        this.updateGameStatus();
        this.setupMiniMap();
        this.startGameTimer();
    }

    start() {
        if (!this.isInitialized) {
            this.init();
        }

        // Masquer le menu, afficher le HUD
        document.getElementById('menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        
        // Démarrer le jeu
        gameRunning = true;
        gameTime = CONFIG.GAME.INITIAL_TIME;
        
        // Réinitialiser les statistiques
        gameState.score = 0;
        gameState.kills = 0;
        gameState.accuracy = 0;
        gameState.shotsFired = 0;
        gameState.shotsHit = 0;
        
        // Démarrer les boucles de jeu
        this.startUpdateLoop();
        
        // Demander le verrouillage de la souris
        setTimeout(() => {
            if (gameControls) {
                gameControls.requestPointerLock();
            }
        }, 100);
        
        console.log('Jeu démarré!');
    }

    startUpdateLoop() {
        lastFrameTime = performance.now();
        
        const gameLoop = (currentTime) => {
            if (!gameRunning) return;
            
            const deltaTime = (currentTime - lastFrameTime) / 1000;
            lastFrameTime = currentTime;
            
            this.update(deltaTime);
            this.render();
            this.updateFPS(currentTime);
            
            this.updateLoop = requestAnimationFrame(gameLoop);
        };
        
        this.updateLoop = requestAnimationFrame(gameLoop);
    }

    update(deltaTime) {
        // Mise à jour du joueur
        if (player) {
            player.update(deltaTime);
        }
        
        // Mise à jour des ennemis
        enemies.forEach(enemy => enemy.update(deltaTime));
        
        // Mise à jour des balles
        this.updateBullets(deltaTime);
        
        // Vérification des conditions de victoire/défaite
        this.checkGameState();
    }

    updateBullets(deltaTime) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            if (!bullet.update(deltaTime)) {
                bullet.destroy();
            }
        }
    }

    render() {
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // Affichage optionnel du FPS (pour debug)
            if (this.fps < 30) {
                console.warn(`FPS bas détecté: ${this.fps}`);
            }
        }
    }

    checkGameState() {
        // Vérification de la victoire
        if (enemies.length === 0) {
            this.victory();
        }
        
        // Vérification de la santé du joueur
        if (player && player.health <= 0) {
            this.gameOver('Vous avez été éliminé!');
        }
        
        // Vérification du temps
        if (gameTime <= 0) {
            this.gameOver('Temps écoulé!');
        }
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            if (gameRunning && gameTime > 0) {
                gameTime--;
                this.updateTimeDisplay();
                
                if (gameTime <= 0) {
                    this.gameOver('Temps écoulé!');
                }
            }
        }, 1000);
    }

    updateTimeDisplay() {
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timeElement = document.getElementById('timeLeft');
        if (timeElement) {
            timeElement.textContent = timeString;
            
            // Couleur d'urgence
            if (gameTime <= 30) {
                timeElement.style.color = '#ff0000';
                timeElement.style.animation = 'pulse 1s infinite';
            } else if (gameTime <= 60) {
                timeElement.style.color = '#ffaa00';
            } else {
                timeElement.style.color = '#ffffff';
                timeElement.style.animation = 'none';
            }
        }
    }

    updateEnemyCount() {
        const countElement = document.getElementById('enemyCount');
        if (countElement) {
            countElement.textContent = enemies.length;
        }
    }

    setupMiniMap() {
        const canvas = document.getElementById('miniMap');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        
        this.miniMapCtx = ctx;
        this.updateMiniMap();
        
        // Mise à jour périodique de la mini-carte
        setInterval(() => {
            if (gameRunning) {
                this.updateMiniMap();
            }
        }, 100);
    }

    updateMiniMap() {
        if (!this.miniMapCtx) return;
        
        const ctx = this.miniMapCtx;
        const size = 150;
        const scale = size / CONFIG.MAP.SIZE;
        
        // Effacer la carte
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, size, size);
        
        // Bordure
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
        
        // Obstacles (simplifié)
        ctx.fillStyle = '#666';
        obstacles.forEach(obstacle => {
            const pos = obstacle.position;
            const x = (pos.x + CONFIG.MAP.SIZE/2) * scale;
            const z = (pos.z + CONFIG.MAP.SIZE/2) * scale;
            ctx.fillRect(x - 2, z - 2, 4, 4);
        });
        
        // Ennemis
        ctx.fillStyle = '#ff4444';
        enemies.forEach(enemy => {
            const pos = enemy.position;
            const x = (pos.x + CONFIG.MAP.SIZE/2) * scale;
            const z = (pos.z + CONFIG.MAP.SIZE/2) * scale;
            
            ctx.beginPath();
            ctx.arc(x, z, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Joueur
        if (camera) {
            ctx.fillStyle = '#00ff00';
            const playerX = (camera.position.x + CONFIG.MAP.SIZE/2) * scale;
            const playerZ = (camera.position.z + CONFIG.MAP.SIZE/2) * scale;
            
            ctx.beginPath();
            ctx.arc(playerX, playerZ, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Direction du joueur
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playerX, playerZ);
            const dirX = playerX + Math.sin(mouseX) * 10;
            const dirZ = playerZ + Math.cos(mouseX) * 10;
            ctx.lineTo(dirX, dirZ);
            ctx.stroke();
        }
    }

    updateGameStatus() {
        this.updateEnemyCount();
        this.updateTimeDisplay();
    }

    victory() {
        gameRunning = false;
        
        // Calcul du score final
        const timeBonus = Math.max(0, gameTime * 10);
        const accuracyBonus = Math.round(gameState.accuracy * 5);
        const finalScore = gameState.kills * 100 + timeBonus + accuracyBonus;
        
        const message = `
            🎉 VICTOIRE! 🎉
            
            Tous les terroristes ont été éliminés!
            
            📊 STATISTIQUES:
            • Éliminations: ${gameState.kills}
            • Précision: ${gameState.accuracy}%
            • Temps restant: ${gameTime}s
            • Score final: ${finalScore}
            
            Voulez-vous rejouer?
        `;
        
        setTimeout(() => {
            if (confirm(message)) {
                this.restart();
            } else {
                this.showMainMenu();
            }
        }, 1000);
    }

    gameOver(reason = 'Game Over') {
        gameRunning = false;
        
        const message = `
            💀 ${reason} 💀
            
            📊 STATISTIQUES FINALES:
            • Éliminations: ${gameState.kills}/${CONFIG.GAME.ENEMY_COUNT}
            • Précision: ${gameState.accuracy}%
            • Tirs tirés: ${gameState.shotsFired}
            • Survie: ${CONFIG.GAME.INITIAL_TIME - gameTime}s
            
            Voulez-vous réessayer?
        `;
        
        setTimeout(() => {
            if (confirm(message)) {
                this.restart();
            } else {
                this.showMainMenu();
            }
        }, 1000);
    }

    pause() {
        if (gameRunning) {
            gameRunning = false;
            if (gameControls) {
                gameControls.exitPointerLock();
            }
        }
    }

    resume() {
        if (!gameRunning) {
            gameRunning = true;
            this.startUpdateLoop();
            if (gameControls) {
                gameControls.requestPointerLock();
            }
        }
    }

    restart() {
        this.cleanup();
        location.reload();
    }

    showMainMenu() {
        gameRunning = false;
        this.cleanup();
        
        const menu = document.getElementById('menu');
        const hud = document.getElementById('hud');
        
        if (menu) menu.style.display = 'flex';
        if (hud) hud.style.display = 'none';
        
        if (gameControls) {
            gameControls.exitPointerLock();
        }
    }

    cleanup() {
        // Arrêter les timers
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.updateLoop) {
            cancelAnimationFrame(this.updateLoop);
            this.updateLoop = null;
        }
        
        // Nettoyer les objets du jeu
        bullets.forEach(bullet => bullet.destroy());
        bullets.length = 0;
        
        enemies.forEach(enemy => enemy.destroy());
        enemies.length = 0;
        
        // Réinitialiser les variables globales
        gameRunning = false;
        gameTime = CONFIG.GAME.INITIAL_TIME;
    }

    // Méthodes utilitaires
    getGameStats() {
        return {
            ...gameState,
            fps: this.fps,
            enemiesRemaining: enemies.length,
            timeRemaining: gameTime,
            isRunning: gameRunning
        };
    }

    // Debug
    toggleDebugMode() {
        const debugInfo = document.getElementById('debugInfo') || this.createDebugInfo();
        debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
    }

    createDebugInfo() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debugInfo';
        debugDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: #00ff00;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 3000;
            border-radius: 5px;
        `;
        
        document.body.appendChild(debugDiv);
        
        // Mise à jour périodique des infos de debug
        setInterval(() => {
            if (debugDiv.style.display !== 'none') {
                const stats = this.getGameStats();
                debugDiv.innerHTML = `
                    FPS: ${stats.fps}<br>
                    Position: ${camera.position.x.toFixed(1)}, ${camera.position.z.toFixed(1)}<br>
                    Rotation: ${(mouseX * 180/Math.PI).toFixed(1)}°<br>
                    Ennemis: ${stats.enemiesRemaining}<br>
                    Balles: ${bullets.length}<br>
                    Obstacles: ${obstacles.length}
                `;
            }
        }, 100);
        
        return debugDiv;
    }
}

// Instance globale du jeu
const gameInstance = new Game();

// Fonctions globales pour l'interface
function startGame() {
    gameInstance.start();
}

function pauseGame() {
    gameInstance.pause();
}

function resumeGame() {
    gameInstance.resume();
}

function restartGame() {
    gameInstance.restart();
}

function gameOver(reason) {
    gameInstance.gameOver(reason);
}

function victory() {
    gameInstance.victory();
}

function updateEnemyCount() {
    gameInstance.updateEnemyCount();
}

function showInstructions() {
    document.getElementById('instructions').style.display = 'block';
}

function hideInstructions() {
    document.getElementById('instructions').style.display = 'none';
}

// Initialisation automatique quand la page est chargée
window.addEventListener('load', () => {
    console.log('Mini CSGO: Web Strike - Page chargée');
    
    // Créer le bouton de debug (accessible avec F1)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'F1') {
            event.preventDefault();
            gameInstance.toggleDebugMode();
        }
    });
    
    console.log('Appuyez sur F1 pour afficher les informations de debug');
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur de jeu:', event.error);
    
    if (gameRunning) {
        gameInstance.pause();
        alert('Une erreur est survenue. Le jeu a été mis en pause.');
    }
});

// Export pour utilisation externe (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, gameInstance };
}