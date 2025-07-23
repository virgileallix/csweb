class Bullet {
    constructor(position, direction, weapon, owner = 'player') {
        this.position = position.clone();
        this.direction = direction.clone().normalize();
        this.weapon = weapon;
        this.owner = owner;
        this.speed = weapon.bulletSpeed || 60;
        this.life = 150; // Distance maximale en unités
        this.damage = weapon.damage;
        
        // Ajout d'un peu d'imprécision selon l'arme
        this.addInaccuracy();
        
        // Création du mesh visuel
        this.createVisual();
    }

    addInaccuracy() {
        const inaccuracy = 1 - this.weapon.accuracy;
        const spread = inaccuracy * 0.1;
        
        // Ajout d'un angle aléatoire
        this.direction.x += (Math.random() - 0.5) * spread;
        this.direction.y += (Math.random() - 0.5) * spread;
        this.direction.z += (Math.random() - 0.5) * spread;
        this.direction.normalize();
    }

    createVisual() {
        // Tracer de balle (ligne jaune)
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5);
        const material = new THREE.MeshBasicMaterial({ 
            color: CONFIG.COLORS.BULLET,
            emissive: CONFIG.COLORS.BULLET,
            emissiveIntensity: 0.3
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Orienter la balle dans la direction du mouvement
        this.mesh.lookAt(this.position.clone().add(this.direction));
        this.mesh.rotateX(Math.PI / 2);
    }

    update(deltaTime) {
        // Mouvement de la balle
        const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(movement);
        this.mesh.position.copy(this.position);
        
        // Réduction de la durée de vie
        this.life -= this.speed * deltaTime;

        // Vérification des collisions
        this.checkCollisions();

        // Gravité légère pour les balles (réalisme)
        this.direction.y += CONFIG.GAME.GRAVITY * deltaTime;
        this.direction.normalize();

        return this.life > 0;
    }

    checkCollisions() {
        // Collision avec les ennemis (si tirée par le joueur)
        if (this.owner === 'player') {
            enemies.forEach((enemy, index) => {
                if (this.position.distanceTo(enemy.position) < 1.2) {
                    const zone = this.getHitZone(enemy);
                    const damage = this.damage[zone];
                    
                    // Statistiques
                    gameState.shotsHit++;
                    SOUNDS.hit();
                    
                    if (enemy.takeDamage(damage, zone)) {
                        enemy.destroy();
                        enemies.splice(index, 1);
                        gameState.kills++;
                        updateEnemyCount();
                    }
                    
                    this.destroy();
                    return;
                }
            });
        }

        // Collision avec le joueur (si tirée par un ennemi)
        if (this.owner === 'enemy') {
            const playerPos = camera.position;
            if (this.position.distanceTo(playerPos) < 0.8) {
                const zone = this.getPlayerHitZone();
                const damage = this.damage[zone] || 25;
                
                if (player.takeDamage(damage, zone)) {
                    gameOver('Vous avez été éliminé!');
                }
                
                this.destroy();
                return;
            }
        }

        // Collision avec les obstacles
        let hitObstacle = false;
        obstacles.forEach(obstacle => {
            const box = new THREE.Box3().setFromObject(obstacle);
            if (box.containsPoint(this.position)) {
                hitObstacle = true;
            }
        });

        // Collision avec le sol
        if (this.position.y <= 0.1) {
            hitObstacle = true;
        }

        // Collision avec les limites de la carte
        if (Math.abs(this.position.x) > CONFIG.MAP.SIZE/2 || 
            Math.abs(this.position.z) > CONFIG.MAP.SIZE/2) {
            hitObstacle = true;
        }

        if (hitObstacle) {
            this.createImpactEffect();
            this.destroy();
        }
    }

    getHitZone(enemy) {
        const relativePos = this.position.clone().sub(enemy.position);
        const distance = relativePos.length();
        
        // Plus précis selon la distance
        if (distance > 15) {
            // À longue distance, plus difficile de toucher la tête
            if (relativePos.y > 0.7) return Math.random() < 0.7 ? 'head' : 'chest';
        } else {
            if (relativePos.y > 0.6) return 'head';
        }
        
        if (relativePos.y > 0.2) return 'chest';
        if (relativePos.y > -0.4) return 'stomach';
        return 'legs';
    }

    getPlayerHitZone() {
        // Zone de hit aléatoire pour les tirs ennemis
        const zones = ['head', 'chest', 'stomach', 'legs'];
        const weights = [0.1, 0.4, 0.3, 0.2]; // Probabilités
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < zones.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return zones[i];
            }
        }
        
        return 'chest';
    }

    createImpactEffect() {
        // Effet visuel d'impact
        const particles = new THREE.Group();
        
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.SphereGeometry(0.02);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffaa00,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(this.position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ));
            
            particles.add(particle);
        }
        
        scene.add(particles);
        
        // Supprimer les particules après un court moment
        setTimeout(() => {
            scene.remove(particles);
        }, 300);
    }

    destroy() {
        if (this.mesh && this.mesh.parent) {
            scene.remove(this.mesh);
        }
        
        const index = bullets.indexOf(this);
        if (index > -1) {
            bullets.splice(index, 1);
        }
    }
}

// Classe pour les balles ennemies (légèrement différente)
class EnemyBullet extends Bullet {
    constructor(position, direction, damage = 25) {
        const fakeWeapon = {
            damage: { chest: damage },
            accuracy: 0.6,
            bulletSpeed: 40
        };
        
        super(position, direction, fakeWeapon, 'enemy');
        
        // Couleur différente pour les balles ennemies
        this.mesh.material.color.setHex(0xff4444);
        this.mesh.material.emissive.setHex(0xff4444);
    }
}