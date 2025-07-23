class Enemy {
    constructor(position, type = 'terrorist') {
        this.position = position.clone();
        this.health = CONFIG.ENEMY.HEALTH;
        this.maxHealth = CONFIG.ENEMY.HEALTH;
        this.type = type;
        
        // IA States
        this.state = 'patrol'; // patrol, alert, chase, attack, dead
        this.lastSeen = 0;
        this.target = null;
        this.lastShot = 0;
        this.alertLevel = 0;
        
        // Mouvement
        this.patrolPoints = [];
        this.currentPatrol = 0;
        this.moveDirection = new THREE.Vector3();
        this.rotationY = 0;
        this.targetRotation = 0;
        
        // Statistiques
        this.accuracy = CONFIG.ENEMY.ACCURACY;
        this.reactionTime = 800 + Math.random() * 400; // 800-1200ms
        this.lastPlayerSighting = 0;
        
        this.createMesh();
        this.setupPatrol();
        this.setupBehavior();
    }

    createMesh() {
        // Corps principal
        const bodyGeometry = new THREE.BoxGeometry(0.6, 1.6, 0.4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: CONFIG.COLORS.ENEMY
        });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        
        // Tête pour les headshots
        const headGeometry = new THREE.SphereGeometry(0.25);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: CONFIG.COLORS.ENEMY_HEAD
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.set(0, 0.9, 0);
        this.head.castShadow = true;
        this.mesh.add(this.head);
        
        // "Arme" visuelle
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
        const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weapon.position.set(0.3, 0.3, 0.4);
        this.mesh.add(this.weapon);
        
        // Barre de vie
        this.createHealthBar();
        
        scene.add(this.mesh);
    }

    createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        
        this.healthBarTexture = new THREE.CanvasTexture(canvas);
        this.healthBarMaterial = new THREE.SpriteMaterial({ 
            map: this.healthBarTexture,
            transparent: true
        });
        this.healthBarSprite = new THREE.Sprite(this.healthBarMaterial);
        this.healthBarSprite.scale.set(2, 0.3, 1);
        this.healthBarSprite.position.set(0, 2, 0);
        this.mesh.add(this.healthBarSprite);
        
        this.updateHealthBar();
    }

    updateHealthBar() {
        const canvas = this.healthBarTexture.image;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 8);
        
        const healthPercent = this.health / this.maxHealth;
        const width = 60 * healthPercent;
        
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(2, 2, width, 4);
        
        this.healthBarTexture.needsUpdate = true;
    }

    setupPatrol() {
        // Génération de points de patrouille autour de la position initiale
        const basePos = this.position.clone();
        const patrolRadius = 8;
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const patrolPoint = new THREE.Vector3(
                basePos.x + Math.cos(angle) * patrolRadius,
                basePos.y,
                basePos.z + Math.sin(angle) * patrolRadius
            );
            
            // Vérifier que le point est dans les limites
            patrolPoint.x = Math.max(-CONFIG.MAP.SIZE/2 + 3, Math.min(CONFIG.MAP.SIZE/2 - 3, patrolPoint.x));
            patrolPoint.z = Math.max(-CONFIG.MAP.SIZE/2 + 3, Math.min(CONFIG.MAP.SIZE/2 - 3, patrolPoint.z));
            
            this.patrolPoints.push(patrolPoint);
        }
    }

    setupBehavior() {
        // Variabilité du comportement selon le type
        if (this.type === 'sniper') {
            this.accuracy *= 1.5;
            this.reactionTime *= 0.7;
        } else if (this.type === 'rusher') {
            this.accuracy *= 0.8;
            this.reactionTime *= 1.3;
        }
    }

    update(deltaTime) {
        if (this.state === 'dead') return;
        
        this.updateAI(deltaTime);
        this.updateMovement(deltaTime);
        this.updateRotation(deltaTime);
        this.updatePosition();
        this.updateAlertLevel(deltaTime);
    }

    updateAI(deltaTime) {
        const playerPos = camera.position;
        const distance = this.position.distanceTo(playerPos);
        const canSeePlayer = this.canSeePlayer(playerPos);
        
        // Machine à états
        switch (this.state) {
            case 'patrol':
                if (canSeePlayer && distance < CONFIG.ENEMY.DETECTION_RANGE) {
                    this.state = 'alert';
                    this.lastPlayerSighting = Date.now();
                    this.target = playerPos.clone();
                    this.alertLevel = 1.0;
                }
                this.patrol();
                break;
                
            case 'alert':
                if (canSeePlayer) {
                    this.lastPlayerSighting = Date.now();
                    this.target = playerPos.clone();
                    
                    if (Date.now() - this.lastPlayerSighting < this.reactionTime) {
                        if (distance < CONFIG.ENEMY.ATTACK_RANGE) {
                            this.state = 'attack';
                        } else {
                            this.state = 'chase';
                        }
                    }
                } else if (Date.now() - this.lastPlayerSighting > 3000) {
                    this.state = 'patrol';
                    this.alertLevel = 0;
                }
                break;
                
            case 'chase':
                if (canSeePlayer) {
                    this.target = playerPos.clone();
                    this.lastPlayerSighting = Date.now();
                    
                    if (distance < CONFIG.ENEMY.ATTACK_RANGE) {
                        this.state = 'attack';
                    }
                } else if (Date.now() - this.lastPlayerSighting > 5000) {
                    this.state = 'patrol';
                }
                break;
                
            case 'attack':
                if (canSeePlayer && distance < CONFIG.ENEMY.ATTACK_RANGE) {
                    this.target = playerPos.clone();
                    this.attackPlayer();
                } else if (!canSeePlayer || distance > CONFIG.ENEMY.ATTACK_RANGE) {
                    this.state = 'chase';
                }
                break;
        }
    }

    canSeePlayer(playerPos) {
        // Raycast simple pour vérifier la ligne de vue
        const direction = playerPos.clone().sub(this.position).normalize();
        const distance = this.position.distanceTo(playerPos);
        
        // Vérification d'obstacles entre l'ennemi et le joueur
        const raycaster = new THREE.Raycaster(this.position, direction, 0, distance);
        const intersects = raycaster.intersectObjects(obstacles);
        
        // Si pas d'obstacles, peut voir le joueur
        return intersects.length === 0;
    }

    updateMovement(deltaTime) {
        let speed = CONFIG.ENEMY.SPEED;
        
        if (this.state === 'chase') {
            speed = CONFIG.ENEMY.CHASE_SPEED;
        }
        
        if (this.moveDirection.length() > 0) {
            const movement = this.moveDirection.clone().normalize().multiplyScalar(speed * deltaTime * 60);
            const newPosition = this.position.clone().add(movement);
            
            // Vérification des collisions
            if (this.checkCollision(newPosition)) {
                this.position.copy(newPosition);
            } else {
                // Si collision, changer de direction
                this.findAlternativePath();
            }
        }
    }

    updateRotation(deltaTime) {
        // Rotation fluide vers la cible
        const rotationSpeed = 3 * deltaTime * 60;
        const rotationDiff = this.targetRotation - this.rotationY;
        
        if (Math.abs(rotationDiff) > 0.1) {
            this.rotationY += Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), rotationSpeed);
        }
        
        this.mesh.rotation.y = this.rotationY;
    }

    updatePosition() {
        this.mesh.position.copy(this.position);
    }

    updateAlertLevel(deltaTime) {
        if (this.alertLevel > 0) {
            this.alertLevel -= deltaTime * 0.5;
            this.alertLevel = Math.max(0, this.alertLevel);
            
            // Changement de couleur selon le niveau d'alerte
            const alertColor = new THREE.Color().lerpColors(
                new THREE.Color(CONFIG.COLORS.ENEMY),
                new THREE.Color(0xff0000),
                this.alertLevel
            );
            this.mesh.material.color = alertColor;
        }
    }

    patrol() {
        if (this.patrolPoints.length === 0) return;
        
        const targetPoint = this.patrolPoints[this.currentPatrol];
        const direction = targetPoint.clone().sub(this.position);
        const distance = direction.length();
        
        if (distance < 1.5) {
            // Arrivé au point, passer au suivant
            this.currentPatrol = (this.currentPatrol + 1) % this.patrolPoints.length;
            
            // Pause à chaque point
            setTimeout(() => {
                if (this.state === 'patrol') {
                    const nextTarget = this.patrolPoints[this.currentPatrol];
                    this.setMoveTarget(nextTarget);
                }
            }, 1000 + Math.random() * 2000);
        } else {
            this.setMoveTarget(targetPoint);
        }
    }

    setMoveTarget(target) {
        this.moveDirection = target.clone().sub(this.position).normalize();
        
        // Calculer la rotation cible
        this.targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
    }

    attackPlayer() {
        const now = Date.now();
        if (now - this.lastShot < CONFIG.ENEMY.FIRE_RATE) return;
        
        this.lastShot = now;
        
        // Viser le joueur
        const playerPos = camera.position.clone();
        const aimDirection = playerPos.sub(this.position).normalize();
        this.targetRotation = Math.atan2(aimDirection.x, aimDirection.z);
        
        // Tirer avec une certaine précision
        if (Math.random() < this.accuracy) {
            const bullet = new EnemyBullet(
                this.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                aimDirection,
                Math.random() * (CONFIG.ENEMY.DAMAGE_RANGE[1] - CONFIG.ENEMY.DAMAGE_RANGE[0]) + CONFIG.ENEMY.DAMAGE_RANGE[0]
            );
            bullets.push(bullet);
            scene.add(bullet.mesh);
        }
    }

    checkCollision(newPosition) {
        const enemyRadius = 0.4;
        
        for (let obstacle of obstacles) {
            const box = new THREE.Box3().setFromObject(obstacle);
            box.expandByScalar(enemyRadius);
            
            if (box.containsPoint(newPosition)) {
                return false;
            }
        }
        
        return true;
    }

    findAlternativePath() {
        // Essayer différentes directions quand bloqué
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0.7, 0, 0.7),
            new THREE.Vector3(-0.7, 0, 0.7),
            new THREE.Vector3(0.7, 0, -0.7),
            new THREE.Vector3(-0.7, 0, -0.7)
        ];
        
        for (let dir of directions) {
            const testPos = this.position.clone().add(dir.multiplyScalar(0.5));
            if (this.checkCollision(testPos)) {
                this.moveDirection = dir.normalize();
                break;
            }
        }
    }

    takeDamage(damage, zone = 'chest') {
        // Multiplicateur selon la zone
        const multiplier = CONFIG.DAMAGE_MULTIPLIERS[zone] || 1;
        const finalDamage = damage * multiplier;
        
        this.health -= finalDamage;
        this.health = Math.max(0, this.health);

        // Passer en état d'alerte
        this.state = 'alert';
        this.alertLevel = 1.0;
        this.lastPlayerSighting = Date.now();

        // Effets visuels
        this.showDamageNumber(finalDamage, zone);
        this.updateHealthBar();
        
        // Animation de hit
        this.mesh.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (this.health > 0) {
                this.mesh.material.color.setHex(CONFIG.COLORS.ENEMY);
            }
        }, 100);

        return this.health <= 0;
    }

    showDamageNumber(damage, zone) {
        const screenPos = this.getScreenPosition();
        const indicator = document.createElement('div');
        indicator.className = 'hit-indicator';
        indicator.textContent = `-${Math.round(damage)}`;
        indicator.style.left = screenPos.x + 'px';
        indicator.style.top = screenPos.y + 'px';
        
        // Couleur selon la zone et les dégâts
        if (zone === 'head') {
            indicator.style.color = '#ffff00';
            indicator.style.fontSize = '28px';
        } else if (damage > 50) {
            indicator.style.color = '#ff0000';
        } else {
            indicator.style.color = '#ff6666';
        }
        
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 800);
    }

    getScreenPosition() {
        const vector = this.mesh.position.clone();
        vector.project(camera);
        
        return {
            x: (vector.x + 1) * window.innerWidth / 2,
            y: (-vector.y + 1) * window.innerHeight / 2
        };
    }

    destroy() {
        this.state = 'dead';
        
        // Animation de mort
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.y = 0.3;
        
        // Suppression après un délai
        setTimeout(() => {
            scene.remove(this.mesh);
        }, 2000);
    }
}