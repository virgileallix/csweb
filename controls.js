class GameControls {
    constructor() {
        this.isPointerLocked = false;
        this.sensitivity = 0.002;
        this.invertY = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Gestion du verrouillage de la souris
        this.setupPointerLock();
        
        // Événements souris
        this.setupMouseEvents();
        
        // Événements clavier
        this.setupKeyboardEvents();
        
        // Événements fenêtre
        this.setupWindowEvents();
    }

    setupPointerLock() {
        // Demande de verrouillage au clic
        document.addEventListener('click', () => {
            if (gameRunning && !this.isPointerLocked) {
                this.requestPointerLock();
            }
        });

        // Événements de changement de verrouillage
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
            this.updateCursor();
        });

        document.addEventListener('pointerlockerror', () => {
            console.warn('Erreur de verrouillage du pointeur');
        });
    }

    requestPointerLock() {
        document.body.requestPointerLock = document.body.requestPointerLock ||
                                          document.body.mozRequestPointerLock ||
                                          document.body.webkitRequestPointerLock;
        
        if (document.body.requestPointerLock) {
            document.body.requestPointerLock();
        }
    }

    exitPointerLock() {
        document.exitPointerLock = document.exitPointerLock ||
                                  document.mozExitPointerLock ||
                                  document.webkitExitPointerLock;
        
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    updateCursor() {
        if (this.isPointerLocked && gameRunning) {
            document.body.style.cursor = 'none';
            document.body.classList.add('game-active');
        } else {
            document.body.style.cursor = 'default';
            document.body.classList.remove('game-active');
        }
    }

    setupMouseEvents() {
        // Mouvement de la souris pour la rotation de la caméra
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked && gameRunning) {
                this.handleMouseMovement(event);
            }
        });

        // Clics de souris
        document.addEventListener('mousedown', (event) => {
            if (!gameRunning || !this.isPointerLocked) return;

            switch (event.button) {
                case 0: // Clic gauche - Tir
                    this.handlePrimaryFire();
                    break;
                case 2: // Clic droit - Visée (pour l'instant inutilisé)
                    this.handleSecondaryFire();
                    break;
                case 1: // Molette - Changement d'arme rapide
                    event.preventDefault();
                    break;
            }
        });

        // Molette de la souris pour changer d'arme
        document.addEventListener('wheel', (event) => {
            if (!gameRunning || !this.isPointerLocked) return;
            
            event.preventDefault();
            this.handleWeaponScroll(event.deltaY > 0 ? 1 : -1);
        });

        // Désactiver le menu contextuel
        document.addEventListener('contextmenu', (event) => {
            if (gameRunning) {
                event.preventDefault();
            }
        });
    }

    handleMouseMovement(event) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        // Application de la sensibilité
        mouseX -= movementX * this.sensitivity;
        mouseY -= movementY * this.sensitivity * (this.invertY ? -1 : 1);

        // Limitation de l'angle vertical (pas de retournement)
        mouseY = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, mouseY));

        // Application de la rotation à la caméra
        this.updateCameraRotation();
    }

    updateCameraRotation() {
        if (!camera) return;

        camera.rotation.order = 'YXZ';
        camera.rotation.y = mouseX;
        camera.rotation.x = mouseY;
        camera.rotation.z = 0; // Pas de roulis
    }

    handlePrimaryFire() {
        if (player) {
            player.shoot();
        }
    }

    handleSecondaryFire() {
        // Pour l'instant inutilisé - pourrait être la visée
        console.log('Clic droit - visée (à implémenter)');
    }

    handleWeaponScroll(direction) {
        if (!player) return;

        const weapons = Object.keys(player.weapons);
        const currentIndex = weapons.indexOf(player.currentWeapon);
        let newIndex = currentIndex + direction;

        // Boucle circulaire
        if (newIndex >= weapons.length) newIndex = 0;
        if (newIndex < 0) newIndex = weapons.length - 1;

        player.switchWeapon(weapons[newIndex]);
    }

    setupKeyboardEvents() {
        // Appui sur une touche
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // Relâchement d'une touche
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }

    handleKeyDown(event) {
        // Prévenir les actions par défaut pour les touches de jeu
        if (this.isGameKey(event.code)) {
            event.preventDefault();
        }

        keys[event.code] = true;

        // Actions spéciales
        if (gameRunning) {
            switch (event.code) {
                case 'KeyR':
                    if (player) player.reload();
                    break;
                
                case 'Digit1':
                    if (player) player.switchWeapon('ak47');
                    break;
                
                case 'Digit2':
                    if (player) player.switchWeapon('glock');
                    break;
                
                case 'Escape':
                    this.handleEscape();
                    break;
                
                case 'Tab':
                    this.showScoreboard(true);
                    break;
                
                case 'KeyM':
                    this.toggleMap();
                    break;
                
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
                
                case 'KeyP':
                    this.pauseGame();
                    break;
                
                case 'KeyE':
                    // Interaction avec la bombe (handled by bombSystem)
                    break;
            }
        } else {
            // Actions dans le menu
            switch (event.code) {
                case 'Enter':
                    startGame();
                    break;
                case 'Escape':
                    this.showMainMenu();
                    break;
            }
        }
    }

    handleKeyUp(event) {
        keys[event.code] = false;

        // Actions de relâchement
        if (gameRunning) {
            switch (event.code) {
                case 'Tab':
                    this.showScoreboard(false);
                    break;
            }
        }
    }

    isGameKey(keyCode) {
        const gameKeys = [
            'KeyW', 'KeyZ', 'KeyS', 'KeyA', 'KeyQ', 'KeyD', // Mouvement
            'Space', 'ShiftLeft', 'ControlLeft', // Actions
            'KeyR', 'Digit1', 'Digit2', // Armes
            'Tab', 'KeyM', 'KeyF', 'KeyP' // Interface
        ];
        
        return gameKeys.includes(keyCode);
    }

    handleEscape() {
        if (this.isPointerLocked) {
            this.exitPointerLock();
            pauseGame();
        } else {
            this.showMainMenu();
        }
    }

    showScoreboard(show) {
        const scoreboard = document.getElementById('scoreboard');
        if (scoreboard) {
            scoreboard.style.display = show ? 'block' : 'none';
        } else if (show) {
            this.createScoreboard();
        }
    }

    createScoreboard() {
        const scoreboard = document.createElement('div');
        scoreboard.id = 'scoreboard';
        scoreboard.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: monospace;
            z-index: 1500;
            min-width: 300px;
            text-align: center;
        `;
        
        scoreboard.innerHTML = `
            <h3>TABLEAU DE BORD</h3>
            <div style="margin: 10px 0;">
                <div>Éliminations: ${gameState.kills}</div>
                <div>Précision: ${gameState.accuracy}%</div>
                <div>Tirs tirés: ${gameState.shotsFired}</div>
                <div>Tirs réussis: ${gameState.shotsHit}</div>
                <div>Temps écoulé: ${CONFIG.GAME.INITIAL_TIME - gameTime}s</div>
            </div>
            <div style="font-size: 12px; color: #ccc; margin-top: 15px;">
                Maintenez TAB pour afficher
            </div>
        `;
        
        document.body.appendChild(scoreboard);
    }

    toggleMap() {
        const miniMap = document.getElementById('miniMap');
        if (miniMap) {
            const isVisible = miniMap.style.display !== 'none';
            miniMap.style.display = isVisible ? 'none' : 'block';
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Erreur passage en plein écran:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    pauseGame() {
        gameRunning = false;
        this.exitPointerLock();
        
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 2500;
            color: white;
        `;
        
        pauseMenu.innerHTML = `
            <h2>JEU EN PAUSE</h2>
            <button onclick="resumeGame()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">REPRENDRE</button>
            <button onclick="restartGame()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">RECOMMENCER</button>
            <button onclick="showMainMenu()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">MENU PRINCIPAL</button>
            <div style="margin-top: 20px; font-size: 14px; color: #ccc;">
                Appuyez sur P ou Échap pour reprendre
            </div>
        `;
        
        document.body.appendChild(pauseMenu);
    }

    showMainMenu() {
        const menu = document.getElementById('menu');
        const hud = document.getElementById('hud');
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (menu) menu.style.display = 'flex';
        if (hud) hud.style.display = 'none';
        if (pauseMenu) pauseMenu.remove();
        
        gameRunning = false;
        this.exitPointerLock();
    }

    setupWindowEvents() {
        // Redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });

        // Perte de focus
        window.addEventListener('blur', () => {
            if (gameRunning) {
                this.pauseGame();
            }
        });

        // Prévenir la fermeture accidentelle
        window.addEventListener('beforeunload', (event) => {
            if (gameRunning) {
                event.preventDefault();
                event.returnValue = 'Êtes-vous sûr de vouloir quitter la partie ?';
                return event.returnValue;
            }
        });
    }

    // Méthodes de configuration
    setSensitivity(value) {
        this.sensitivity = Math.max(0.0005, Math.min(0.01, value));
    }

    setInvertY(inverted) {
        this.invertY = inverted;
    }

    // Nettoyage
    destroy() {
        this.exitPointerLock();
        // Supprimer tous les event listeners si nécessaire
    }
}

// Fonctions globales pour les boutons
function resumeGame() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) pauseMenu.remove();
    
    gameRunning = true;
    gameControls.requestPointerLock();
}

function restartGame() {
    location.reload();
}

function showMainMenu() {
    gameControls.showMainMenu();
}

// Instance globale des contrôles
let gameControls;