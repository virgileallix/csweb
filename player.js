class Player {
    constructor() {
        this.position = new THREE.Vector3(0, CONFIG.PLAYER.HEIGHT, 0);
        this.velocity = new THREE.Vector3();
        this.health = CONFIG.PLAYER.MAX_HEALTH;
        this.armor = CONFIG.PLAYER.MAX_ARMOR;
        this.isOnGround = true;
        this.isSprinting = false;
        
        // Armes du joueur
        this.weapons = {};
        Object.keys(CONFIG.WEAPONS).forEach(key => {
            this.weapons[key] = { ...CONFIG.WEAPONS[key] };
        });
        
        this.currentWeapon = 'ak47';
        this.lastShot = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
        
        // Statistiques de tir
        this.crosshairAccuracy = 1.0;
        this.recoilAmount = 0;
        
        // Initialisation du HUD
        this.updateHUD();
    }

    update(deltaTime) {
        this.handleMovement(deltaTime);
        this.updateRecoil(deltaTime);
        this.updateReload();
        this.updateCrosshair();
    }

    handleMovement(deltaTime) {
        const speed = CONFIG.PLAYER.SPEED * (this.isSprinting ? CONFIG.PLAYER.SPRINT_MULTIPLIER : 1);
        const direction = new THREE.Vector3();

        // Vérification des touches pressées
        if (keys['KeyW'] || keys['KeyZ']) direction.z -= 1;
        if (keys['KeyS']) direction.z += 1;
        if (keys['KeyA'] || keys['KeyQ']) direction.x -= 1;
        if (keys['KeyD']) direction.x += 1;
        
        // Sprint
        this.isSprinting = keys['ShiftLeft'] && (keys['KeyW'] || keys['KeyZ']);

        // Normaliser et appliquer la direction
        if (direction.length() > 0) {
            direction.normalize();
            
            // Rotation selon la caméra (seulement horizontale)
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
            
            // Application du mouvement
            const movement = direction.multiplyScalar(speed * deltaTime * 60);
            const newPosition = camera.position.clone().add(movement);
            
            // Vérification des collisions avec les obstacles
            if (this.checkCollision(newPosition)) {
                camera.position.copy(newPosition);
            }
        }

        // Saut
        if (keys['Space'] && this.isOnGround) {
            this.velocity.y = CONFIG.PLAYER.JUMP_HEIGHT;
            this.isOnGround = false;
        }

        // Gravité
        if (!this.isOnGround) {
            this.velocity.y += CONFIG.GAME.GRAVITY * deltaTime * 60;
            camera.position.y += this.velocity.y;
            
            if (camera.position.y <= CONFIG.PLAYER.HEIGHT) {
                camera.position.y = CONFIG.PLAYER.HEIGHT;
                this.velocity.y = 0;
                this.isOnGround = true;
            }
        }

        // Limites de la carte
        camera.position.x = Math.max(-CONFIG.MAP.SIZE/2 + 2, Math.min(CONFIG.MAP.SIZE/2 - 2, camera.position.x));
        camera.position.z = Math.max(-CONFIG.MAP.SIZE/2 + 2, Math.min(CONFIG.MAP.SIZE/2 - 2, camera.position.z));
    }

    checkCollision(newPosition) {
        const playerRadius = 0.5;
        
        for (let obstacle of obstacles) {
            const box = new THREE.Box3().setFromObject(obstacle);
            box.expandByScalar(playerRadius);
            
            if (box.containsPoint(newPosition)) {
                return false;
            }
        }
        
        return true;
    }

    updateRecoil(deltaTime) {
        // Réduction progressive du recul
        if (this.recoilAmount > 0) {
            this.recoilAmount -= deltaTime * 3;
            this.recoilAmount = Math.max(0, this.recoilAmount);
        }
        
        // Récupération de la précision
        if (this.crosshairAccuracy < 1.0 && Date.now() - this.lastShot > 500) {
            this.crosshairAccuracy += deltaTime * 2;
            this.crosshairAccuracy = Math.min(1.0, this.crosshairAccuracy);
        }
    }

    updateReload() {
        if (this.isReloading) {
            const reloadTime = this.currentWeapon === 'ak47' ? 2500 : 2000;
            
            if (Date.now() - this.reloadStartTime >= reloadTime) {
                this.finishReload();
            }
        }
    }

    updateCrosshair() {
        const crosshair = document.getElementById('crosshair');
        
        // Modification de la taille selon le mouvement et le recul
        let scale = 1.0;
        
        if (this.isSprinting) scale += 0.3;
        if (this.recoilAmount > 0) scale += this.recoilAmount * 0.5;
        if (!this.isOnGround) scale += 0.2;
        
        crosshair.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        // Couleur selon la précision
        const accuracy = this.crosshairAccuracy;
        const red = Math.floor((1 - accuracy) * 255);
        const green = Math.floor(accuracy * 255);
        const color = `rgb(${red}, ${green}, 0)`;
        
        crosshair.style.setProperty('--crosshair-color', color);
    }

    shoot() {
        const weapon = this.weapons[this.currentWeapon];
        const now = Date.now();
        
        // Vérifications
        if (weapon.ammo <= 0) {
            this.reload();
            return false;
        }
        
        if (this.isReloading) return false;
        
        if (now - this.lastShot < 60000 / weapon.fireRate) return false;

        // Tir
        weapon.ammo--;
        this.lastShot = now;
        gameState.shotsFired++;

        // Effets visuels et sonores
        SOUNDS.shoot();
        this.addRecoil();

        // Création du projectile
        const bullet = new Bullet(
            camera.position.clone(),
            camera.getWorldDirection(new THREE.Vector3()),
            weapon,
            'player'
        );
        bullets.push(bullet);
        scene.add(bullet.mesh);

        this.updateHUD();
        this.updateAccuracy();
        return true;
    }

    addRecoil() {
        const weapon = this.weapons[this.currentWeapon];
        this.recoilAmount += weapon.recoil;
        this.crosshairAccuracy -= weapon.recoil * 0.5;
        this.crosshairAccuracy = Math.max(0.3, this.crosshairAccuracy);
        
        // Recul visuel de la caméra
        mouseY += weapon.recoil * 0.02;
        mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
        
        // Animation du crosshair
        const crosshair = document.getElementById('crosshair');
        crosshair.classList.add('shooting');
        setTimeout(() => crosshair.classList.remove('shooting'), 100);
    }

    reload() {
        const weapon = this.weapons[this.currentWeapon];
        const maxAmmo = CONFIG.WEAPONS[this.currentWeapon].ammo;
        
        if (weapon.reserveAmmo <= 0 || weapon.ammo >= maxAmmo || this.isReloading) {
            return;
        }

        this.isReloading = true;
        this.reloadStartTime = Date.now();
        SOUNDS.reload();
        
        // Mise à jour du HUD
        this.updateHUD();
    }

    finishReload() {
        const weapon = this.weapons[this.currentWeapon];
        const maxAmmo = CONFIG.WEAPONS[this.currentWeapon].ammo;
        
        const needed = maxAmmo - weapon.ammo;
        const available = Math.min(needed, weapon.reserveAmmo);
        
        weapon.ammo += available;
        weapon.reserveAmmo -= available;
        
        this.isReloading = false;
        this.updateHUD();
        
        // Supprimer l'indicateur de rechargement
        const reloadIndicator = document.querySelector('.reloading');
        if (reloadIndicator) {
            reloadIndicator.remove();
        }
    }

    switchWeapon(weaponKey) {
        if (this.weapons[weaponKey] && !this.isReloading) {
            this.currentWeapon = weaponKey;
            this.updateHUD();
        }
    }

    takeDamage(damage, zone = 'chest') {
        let finalDamage = damage;
        
        // Application des dégâts selon la zone
        const multiplier = CONFIG.DAMAGE_MULTIPLIERS[zone] || 1;
        finalDamage *= multiplier;
        
        // Protection de l'armure
        if (this.armor > 0 && (zone === 'chest' || zone === 'stomach')) {
            const armorAbsorbed = Math.min(finalDamage * 0.5, this.armor);
            this.armor -= armorAbsorbed;
            this.armor = Math.max(0, this.armor);
            finalDamage -= armorAbsorbed;
        }

        this.health -= finalDamage;
        this.health = Math.max(0, this.health);

        // Effets visuels
        this.showDamageIndicator(finalDamage, zone);
        this.createBloodEffect();
        
        this.updateHUD();
        
        return this.health <= 0;
    }

    showDamageIndicator(damage, zone) {
        const indicator = document.createElement('div');
        indicator.className = 'damage-indicator';
        indicator.textContent = `-${Math.round(damage)} ${zone.toUpperCase()}`;
        indicator.style.left = Math.random() * 200 + window.innerWidth/2 - 100 + 'px';
        indicator.style.top = Math.random() * 100 + window.innerHeight/2 - 50 + 'px';
        
        // Couleur selon la zone
        if (zone === 'head') indicator.style.color = '#ffff00';
        else if (zone === 'chest') indicator.style.color = '#ff0000';
        else indicator.style.color = '#ff6666';
        
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 1000);
    }

    createBloodEffect() {
        // Effet de sang sur les bords de l'écran
        const blood = document.createElement('div');
        blood.className = 'blood-splatter';
        blood.style.left = '0';
        blood.style.top = '0';
        blood.style.width = '100vw';
        blood.style.height = '100vh';
        blood.style.background = 'radial-gradient(circle at center, transparent 60%, rgba(255,0,0,0.1) 100%)';
        blood.style.pointerEvents = 'none';
        blood.style.zIndex = '999';
        
        document.body.appendChild(blood);
        setTimeout(() => blood.remove(), 500);
    }

    updateHUD() {
        document.getElementById('healthValue').textContent = Math.round(this.health);
        document.getElementById('armorValue').textContent = Math.round(this.armor);
        
        const weapon = this.weapons[this.currentWeapon];
        document.getElementById('currentAmmo').textContent = weapon.ammo;
        document.getElementById('reserveAmmo').textContent = weapon.reserveAmmo;
        document.getElementById('weaponName').textContent = weapon.name;
        
        // Couleur selon les munitions
        const ammoElement = document.getElementById('currentAmmo');
        if (weapon.ammo === 0) {
            ammoElement.style.color = '#ff0000';
        } else if (weapon.ammo <= 5) {
            ammoElement.style.color = '#ffaa00';
        } else {
            ammoElement.style.color = '#ffffff';
        }
        
        // Affichage du rechargement
        if (this.isReloading) {
            const progress = Math.min(1, (Date.now() - this.reloadStartTime) / 2000);
            ammoElement.textContent = `RECHARGEMENT ${Math.round(progress * 100)}%`;
        }
    }

    updateAccuracy() {
        gameState.accuracy = gameState.shotsFired > 0 ? 
            Math.round((gameState.shotsHit / gameState.shotsFired) * 100) : 0;
    }
}