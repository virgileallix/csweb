// Système de bombe pour le mode Bomb Defusal
class BombSystem {
    constructor() {
        this.bombSites = [];
        this.plantedBomb = null;
        this.defuseProgress = 0;
        this.plantProgress = 0;
        this.isPlanting = false;
        this.isDefusing = false;
        this.bombTimer = 40; // 40 secondes comme CSGO
        this.defuseTime = 10; // 10 secondes pour désamorcer (5 avec kit)
        this.plantTime = 4; // 4 secondes pour planter
        
        this.createBombSites();
        this.setupBombUI();
    }

    createBombSites() {
        // Site A (position gauche de la carte)
        const siteA = {
            id: 'A',
            position: new THREE.Vector3(-15, 0.1, 10),
            radius: 3,
            mesh: null,
            planted: false
        };
        
        // Site B (position droite de la carte)  
        const siteB = {
            id: 'B',
            position: new THREE.Vector3(15, 0.1, -10),
            radius: 3,
            mesh: null,
            planted: false
        };
        
        this.bombSites = [siteA, siteB];
        
        // Créer les meshs visuels des sites
        this.createBombSiteVisuals();
    }

    createBombSiteVisuals() {
        const siteMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
        });
        
        this.bombSites.forEach(site => {
            // Cercle au sol pour marquer le site
            const circleGeometry = new THREE.CircleGeometry(site.radius, 32);
            const circle = new THREE.Mesh(circleGeometry, siteMaterial);
            circle.rotation.x = -Math.PI / 2;
            circle.position.copy(site.position);
            scene.add(circle);
            site.mesh = circle;
            
            // Panneau indicateur
            const panelGeometry = new THREE.PlaneGeometry(2, 1);
            const panelMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                transparent: true,
                opacity: 0.8
            });
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            panel.position.set(site.position.x, 2, site.position.z);
            scene.add(panel);
            
            // Texte du site
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`SITE ${site.id}`, 128, 80);
            
            const texture = new THREE.CanvasTexture(canvas);
            const textMaterial = new THREE.MeshBasicMaterial({ map: texture });
            const textMesh = new THREE.Mesh(panelGeometry, textMaterial);
            textMesh.position.set(site.position.x, 2.1, site.position.z);
            scene.add(textMesh);
        });
    }

    setupBombUI() {
        // Interface de plantation/désamorçage
        const bombUI = document.createElement('div');
        bombUI.id = 'bombUI';
        bombUI.style.cssText = `
            position: absolute;
            bottom: 200px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            padding: 20px;
            border-radius: 10px;
            color: white;
            text-align: center;
            display: none;
            z-index: 1500;
            min-width: 300px;
            border: 2px solid #ffff00;
        `;
        document.body.appendChild(bombUI);

        // Timer de la bombe
        const bombTimer = document.createElement('div');
        bombTimer.id = 'bombTimer';
        bombTimer.style.cssText = `
            position: absolute;
            top: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,0,0,0.9);
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            display: none;
            z-index: 1500;
            animation: pulse 1s infinite;
        `;
        document.body.appendChild(bombTimer);
    }

    update() {
        if (!gameRunning) return;
        
        this.checkBombInteraction();
        this.updateBombTimer();
        this.updateProgressBars();
    }

    checkBombInteraction() {
        if (!player || !camera) return;
        
        const playerPos = camera.position;
        
        // Vérifier si le joueur peut planter la bombe
        if (multiplayer && multiplayer.playerTeam === 'T' && !this.plantedBomb) {
            const nearestSite = this.getNearestBombSite(playerPos);
            
            if (nearestSite && this.isPlayerInSite(playerPos, nearestSite)) {
                this.showPlantUI(nearestSite);
                
                if (keys['KeyE'] && !this.isPlanting) {
                    this.startPlanting(nearestSite);
                }
            } else {
                this.hideBombUI();
            }
        }
        
        // Vérifier si le joueur peut désamorcer la bombe
        if (multiplayer && multiplayer.playerTeam === 'CT' && this.plantedBomb) {
            const distanceToBomb = playerPos.distanceTo(this.plantedBomb.position);
            
            if (distanceToBomb < 2) {
                this.showDefuseUI();
                
                if (keys['KeyE'] && !this.isDefusing) {
                    this.startDefusing();
                }
            } else {
                this.hideBombUI();
            }
        }
    }

    getNearestBombSite(playerPos) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.bombSites.forEach(site => {
            const distance = playerPos.distanceTo(site.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = site;
            }
        });
        
        return nearest;
    }

    isPlayerInSite(playerPos, site) {
        const distance = playerPos.distanceTo(site.position);
        return distance <= site.radius;
    }

    showPlantUI(site) {
        const bombUI = document.getElementById('bombUI');
        bombUI.style.display = 'block';
        bombUI.innerHTML = `
            <h3>📍 SITE ${site.id}</h3>
            <p>Maintenez <strong>E</strong> pour planter la bombe</p>
            <div style="margin-top: 10px; color: #ffff00;">
                ⚠️ Vous êtes exposé pendant la plantation !
            </div>
        `;
    }

    showDefuseUI() {
        const bombUI = document.getElementById('bombUI');
        bombUI.style.display = 'block';
        bombUI.innerHTML = `
            <h3>💣 BOMBE PLANTÉE</h3>
            <p>Maintenez <strong>E</strong> pour désamorcer</p>
            <div style="margin-top: 10px; color: #ff6666;">
                ⚠️ Désamorçage en cours...
            </div>
        `;
    }

    hideBombUI() {
        const bombUI = document.getElementById('bombUI');
        bombUI.style.display = 'none';
        
        // Arrêter les actions en cours
        if (this.isPlanting) {
            this.stopPlanting();
        }
        if (this.isDefusing) {
            this.stopDefusing();
        }
    }

    startPlanting(site) {
        if (this.isPlanting) return;
        
        this.isPlanting = true;
        this.plantProgress = 0;
        this.currentPlantSite = site;
        
        // Animation de plantation
        this.plantInterval = setInterval(() => {
            this.plantProgress += 100 / (this.plantTime * 10); // 10 FPS
            
            if (this.plantProgress >= 100) {
                this.completePlanting();
            } else if (!keys['KeyE']) {
                this.stopPlanting();
            }
        }, 100);
        
        // Son de plantation
        SOUNDS.bombPlantStart();
    }

    stopPlanting() {
        if (!this.isPlanting) return;
        
        this.isPlanting = false;
        this.plantProgress = 0;
        
        if (this.plantInterval) {
            clearInterval(this.plantInterval);
            this.plantInterval = null;
        }
        
        SOUNDS.bombPlantStop();
    }

    completePlanting() {
        this.stopPlanting();
        
        const site = this.currentPlantSite;
        
        // Créer la bombe plantée
        this.plantedBomb = {
            position: site.position.clone(),
            site: site.id,
            plantedAt: Date.now(),
            timer: this.bombTimer,
            mesh: this.createBombMesh(site.position)
        };
        
        site.planted = true;
        
        // Synchroniser avec Firebase
        if (multiplayer) {
            multiplayer.plantBomb();
        }
        
        // Démarrer le timer de la bombe
        this.startBombTimer();
        
        // Sons et effets
        SOUNDS.bombPlantComplete();
        this.showBombPlantedMessage(site.id);
        
        this.hideBombUI();
    }

    createBombMesh(position) {
        // Modèle de bombe (simple pour l'instant)
        const bombGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.8);
        const bombMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            emissive: 0x330000
        });
        const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
        bomb.position.copy(position);
        bomb.position.y += 0.15;
        
        // LEDs clignotantes
        const ledGeometry = new THREE.SphereGeometry(0.05);
        const ledMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000
        });
        
        for (let i = 0; i < 3; i++) {
            const led = new THREE.Mesh(ledGeometry, ledMaterial);
            led.position.set(-0.2 + i * 0.2, 0.1, 0.3);
            bomb.add(led);
        }
        
        scene.add(bomb);
        return bomb;
    }

    startBombTimer() {
        const bombTimerDiv = document.getElementById('bombTimer');
        bombTimerDiv.style.display = 'block';
        
        this.bombTimerInterval = setInterval(() => {
            if (this.plantedBomb) {
                const elapsed = (Date.now() - this.plantedBomb.plantedAt) / 1000;
                const remaining = Math.max(0, this.bombTimer - elapsed);
                
                bombTimerDiv.textContent = `💣 ${remaining.toFixed(1)}s`;
                
                // Changement de couleur selon le temps restant
                if (remaining <= 10) {
                    bombTimerDiv.style.background = 'rgba(255,0,0,0.95)';
                    bombTimerDiv.style.animation = 'pulse 0.5s infinite';
                } else if (remaining <= 20) {
                    bombTimerDiv.style.background = 'rgba(255,100,0,0.9)';
                } else {
                    bombTimerDiv.style.background = 'rgba(255,0,0,0.9)';
                }
                
                if (remaining <= 0) {
                    this.explodeBomb();
                }
            }
        }, 100);
    }

    startDefusing() {
        if (this.isDefusing) return;
        
        this.isDefusing = true;
        this.defuseProgress = 0;
        
        // Animation de désamorçage
        this.defuseInterval = setInterval(() => {
            this.defuseProgress += 100 / (this.defuseTime * 10); // 10 FPS
            
            if (this.defuseProgress >= 100) {
                this.completeDefusing();
            } else if (!keys['KeyE']) {
                this.stopDefusing();
            }
        }, 100);
        
        // Son de désamorçage
        SOUNDS.bombDefuseStart();
    }

    stopDefusing() {
        if (!this.isDefusing) return;
        
        this.isDefusing = false;
        this.defuseProgress = 0;
        
        if (this.defuseInterval) {
            clearInterval(this.defuseInterval);
            this.defuseInterval = null;
        }
        
        SOUNDS.bombDefuseStop();
    }

    completeDefusing() {
        this.stopDefusing();
        
        // Bombe désamorcée !
        if (this.plantedBomb && this.plantedBomb.mesh) {
            scene.remove(this.plantedBomb.mesh);
        }
        
        // Arrêter le timer
        if (this.bombTimerInterval) {
            clearInterval(this.bombTimerInterval);
            this.bombTimerInterval = null;
        }
        
        // Cacher le timer
        document.getElementById('bombTimer').style.display = 'none';
        
        // Réinitialiser l'état
        this.resetBombState();
        
        // Synchroniser avec Firebase
        if (multiplayer) {
            multiplayer.defuseBomb();
        }
        
        // Sons et effets
        SOUNDS.bombDefuseComplete();
        this.showBombDefusedMessage();
        
        // CT gagnent le round
        if (multiplayer && multiplayer.isHost) {
            multiplayer.endRound('CT', 'Bomb defused');
        }
        
        this.hideBombUI();
    }

    explodeBomb() {
        if (!this.plantedBomb) return;
        
        // Effets d'explosion
        this.createExplosionEffect();
        
        // Arrêter le timer
        if (this.bombTimerInterval) {
            clearInterval(this.bombTimerInterval);
            this.bombTimerInterval = null;
        }
        
        // Cacher le timer
        document.getElementById('bombTimer').style.display = 'none';
        
        // Dégâts d'explosion à tous les joueurs proches
        this.dealExplosionDamage();
        
        // Réinitialiser l'état
        this.resetBombState();
        
        // Sons et effets
        SOUNDS.bombExplode();
        this.showBombExplodedMessage();
        
        // T gagnent le round
        if (multiplayer && multiplayer.isHost) {
            multiplayer.endRound('T', 'Bomb exploded');
        }
    }

    createExplosionEffect() {
        if (!this.plantedBomb) return;
        
        const explosionPos = this.plantedBomb.position;
        
        // Particules d'explosion
        const particleCount = 50;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5)
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(explosionPos);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 15,
                (Math.random() - 0.5) * 20
            );
            
            particles.add(particle);
        }
        
        scene.add(particles);
        
        // Animation des particules
        let time = 0;
        const animateExplosion = () => {
            time += 0.016;
            
            particles.children.forEach(particle => {
                particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
                particle.velocity.y -= 0.5; // Gravité
                particle.material.opacity = Math.max(0, 1 - time * 2);
            });
            
            if (time < 2) {
                requestAnimationFrame(animateExplosion);
            } else {
                scene.remove(particles);
            }
        };
        
        animateExplosion();
        
        // Flash d'explosion
        this.createExplosionFlash();
    }

    createExplosionFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,100,0,0.3));
            pointer-events: none;
            z-index: 2000;
            animation: explosionFlash 0.5s ease-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes explosionFlash {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 500);
    }

    dealExplosionDamage() {
        if (!this.plantedBomb || !camera) return;
        
        const explosionPos = this.plantedBomb.position;
        const playerPos = camera.position;
        const distance = playerPos.distanceTo(explosionPos);
        
        // Dégâts selon la distance
        let damage = 0;
        if (distance < 5) {
            damage = 200; // Mort instantanée
        } else if (distance < 10) {
            damage = 100 - (distance - 5) * 15;
        } else if (distance < 15) {
            damage = 50 - (distance - 10) * 8;
        }
        
        if (damage > 0 && player) {
            if (player.takeDamage(damage, 'chest')) {
                // Le joueur est mort dans l'explosion
                gameOver('Tué par l\'explosion de la bombe');
            }
        }
    }

    resetBombState() {
        // Supprimer le mesh de la bombe
        if (this.plantedBomb && this.plantedBomb.mesh) {
            scene.remove(this.plantedBomb.mesh);
        }
        
        // Réinitialiser les sites
        this.bombSites.forEach(site => {
            site.planted = false;
        });
        
        this.plantedBomb = null;
        this.isPlanting = false;
        this.isDefusing = false;
        this.plantProgress = 0;
        this.defuseProgress = 0;
    }

    updateBombTimer() {
        // Déjà géré dans startBombTimer()
    }

    updateProgressBars() {
        const bombUI = document.getElementById('bombUI');
        if (!bombUI || bombUI.style.display === 'none') return;
        
        // Barre de progression plantation
        if (this.isPlanting) {
            const progressHTML = `
                <div style="width: 100%; background: #333; height: 10px; border-radius: 5px; margin-top: 10px;">
                    <div style="width: ${this.plantProgress}%; background: #ffff00; height: 100%; border-radius: 5px; transition: width 0.1s;"></div>
                </div>
                <div style="margin-top: 5px; font-size: 14px;">Plantation: ${Math.round(this.plantProgress)}%</div>
            `;
            
            if (!bombUI.innerHTML.includes('Plantation:')) {
                bombUI.innerHTML += progressHTML;
            } else {
                // Mettre à jour seulement la barre
                const progressBar = bombUI.querySelector('div div');
                const progressText = bombUI.querySelector('div:last-child');
                if (progressBar) progressBar.style.width = this.plantProgress + '%';
                if (progressText) progressText.textContent = `Plantation: ${Math.round(this.plantProgress)}%`;
            }
        }
        
        // Barre de progression désamorçage
        if (this.isDefusing) {
            const progressHTML = `
                <div style="width: 100%; background: #333; height: 10px; border-radius: 5px; margin-top: 10px;">
                    <div style="width: ${this.defuseProgress}%; background: #00ff00; height: 100%; border-radius: 5px; transition: width 0.1s;"></div>
                </div>
                <div style="margin-top: 5px; font-size: 14px;">Désamorçage: ${Math.round(this.defuseProgress)}%</div>
            `;
            
            if (!bombUI.innerHTML.includes('Désamorçage:')) {
                bombUI.innerHTML += progressHTML;
            } else {
                // Mettre à jour seulement la barre
                const progressBar = bombUI.querySelector('div div');
                const progressText = bombUI.querySelector('div:last-child');
                if (progressBar) progressBar.style.width = this.defuseProgress + '%';
                if (progressText) progressText.textContent = `Désamorçage: ${Math.round(this.defuseProgress)}%`;
            }
        }
    }

    showBombPlantedMessage(siteId) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255,0,0,0.95);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 2500;
            animation: messageSlide 3s ease-out forwards;
        `;
        
        message.innerHTML = `
            💣 BOMBE PLANTÉE AU SITE ${siteId} !<br>
            <span style="font-size: 16px;">Les Counter-Terrorists doivent désamorcer la bombe !</span>
        `;
        
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    }

    showBombDefusedMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,255,0,0.95);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 2500;
            animation: messageSlide 3s ease-out forwards;
        `;
        
        message.innerHTML = `
            ✅ BOMBE DÉSAMORCÉE !<br>
            <span style="font-size: 16px;">Les Counter-Terrorists gagnent le round !</span>
        `;
        
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    }

    showBombExplodedMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255,50,0,0.95);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 2500;
            animation: messageSlide 3s ease-out forwards;
        `;
        
        message.innerHTML = `
            💥 LA BOMBE A EXPLOSÉ !<br>
            <span style="font-size: 16px;">Les Terrorists gagnent le round !</span>
        `;
        
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    }

    // Méthodes pour le nettoyage
    destroy() {
        this.resetBombState();
        
        if (this.bombTimerInterval) {
            clearInterval(this.bombTimerInterval);
        }
        
        if (this.plantInterval) {
            clearInterval(this.plantInterval);
        }
        
        if (this.defuseInterval) {
            clearInterval(this.defuseInterval);
        }
        
        // Supprimer les éléments UI
        const bombUI = document.getElementById('bombUI');
        const bombTimer = document.getElementById('bombTimer');
        
        if (bombUI) bombUI.remove();
        if (bombTimer) bombTimer.remove();
        
        // Supprimer les meshs des sites
        this.bombSites.forEach(site => {
            if (site.mesh) {
                scene.remove(site.mesh);
            }
        });
    }
}

// Ajout des sons pour la bombe
Object.assign(SOUNDS, {
    bombPlantStart: () => {
        console.log('🔊 Son: Début plantation bombe');
        // TODO: Ajouter le vrai son
    },
    
    bombPlantStop: () => {
        console.log('🔊 Son: Arrêt plantation bombe');
    },
    
    bombPlantComplete: () => {
        console.log('🔊 Son: Bombe plantée');
        // Effet visuel flash
        const flash = document.createElement('div');
        flash.className = 'muzzle-flash active';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
    },
    
    bombDefuseStart: () => {
        console.log('🔊 Son: Début désamorçage');
    },
    
    bombDefuseStop: () => {
        console.log('🔊 Son: Arrêt désamorçage');
    },
    
    bombDefuseComplete: () => {
        console.log('🔊 Son: Bombe désamorcée');
        // Effet visuel vert
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, #00ff00, transparent);
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
            z-index: 1999;
            animation: successFlash 0.5s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes successFlash {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(3); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 500);
    },
    
    bombExplode: () => {
        console.log('🔊 Son: Explosion bombe');
        // Vibration si disponible
        if (navigator.vibrate) {
            navigator.vibrate([500, 100, 500]);
        }
    }
});

// Instance globale du système de bombe
let bombSystem = null;