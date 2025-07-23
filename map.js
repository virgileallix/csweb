class MapGenerator {
    constructor() {
        this.mapSize = CONFIG.MAP.SIZE;
        this.wallHeight = CONFIG.MAP.WALL_HEIGHT;
        this.boxHeight = CONFIG.MAP.BOX_HEIGHT;
    }

    generateMap() {
        this.createSkybox();
        this.createGround();
        this.createPerimeterWalls();
        this.createInteriorStructures();
        this.createCover();
        this.createLighting();
        
        console.log('Carte générée avec', obstacles.length, 'obstacles');
    }

    createSkybox() {
        const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.SKY,
            side: THREE.BackSide,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        scene.add(sky);
    }

    createGround() {
        // Sol principal
        const groundGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
        const groundTexture = this.createGroundTexture();
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            map: groundTexture,
            color: CONFIG.COLORS.GROUND
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Bordure décorative
        this.createGroundBorder();
    }

    createGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Texture de terre/sable
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 256, 256);
        
        // Ajout de variations
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(${139 + Math.random() * 40}, ${69 + Math.random() * 20}, ${19 + Math.random() * 20}, 0.3)`;
            ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 10, Math.random() * 10);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createGroundBorder() {
        const borderWidth = 2;
        const borderGeometry = new THREE.PlaneGeometry(this.mapSize + borderWidth * 2, this.mapSize + borderWidth * 2);
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.rotation.x = -Math.PI / 2;
        border.position.y = -0.01;
        border.receiveShadow = true;
        scene.add(border);
    }

    createPerimeterWalls() {
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: CONFIG.COLORS.WALL
        });
        
        const wallThickness = 1;
        const halfSize = this.mapSize / 2;
        
        // Murs principaux
        const wallConfigs = [
            // Mur Nord
            {
                size: [this.mapSize, this.wallHeight, wallThickness],
                position: [0, this.wallHeight / 2, -halfSize]
            },
            // Mur Sud  
            {
                size: [this.mapSize, this.wallHeight, wallThickness],
                position: [0, this.wallHeight / 2, halfSize]
            },
            // Mur Est
            {
                size: [wallThickness, this.wallHeight, this.mapSize],
                position: [halfSize, this.wallHeight / 2, 0]
            },
            // Mur Ouest
            {
                size: [wallThickness, this.wallHeight, this.mapSize],
                position: [-halfSize, this.wallHeight / 2, 0]
            }
        ];

        wallConfigs.forEach(config => {
            const geometry = new THREE.BoxGeometry(...config.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...config.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            obstacles.push(mesh);
        });

        // Créneaux décoratifs sur les murs
        this.addWallDetails();
    }

    addWallDetails() {
        const detailMaterial = new THREE.MeshLambertMaterial({ color: 0xA0A080 });
        const halfSize = this.mapSize / 2;
        
        // Créneaux sur le mur nord
        for (let i = -3; i <= 3; i++) {
            const geometry = new THREE.BoxGeometry(2, 0.5, 0.3);
            const mesh = new THREE.Mesh(geometry, detailMaterial);
            mesh.position.set(i * 6, this.wallHeight + 0.25, -halfSize + 0.15);
            mesh.castShadow = true;
            scene.add(mesh);
        }
    }

    createInteriorStructures() {
        // Structure centrale (comme dans Dust2)
        this.createCentralBuilding();
        
        // Structures latérales
        this.createSideStructures();
        
        // Tunnels et passages
        this.createTunnels();
    }

    createCentralBuilding() {
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
        
        // Bâtiment principal au centre
        const mainBuilding = new THREE.BoxGeometry(8, 3, 6);
        const mainMesh = new THREE.Mesh(mainBuilding, buildingMaterial);
        mainMesh.position.set(0, 1.5, 0);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        scene.add(mainMesh);
        obstacles.push(mainMesh);

        // Toit
        const roofGeometry = new THREE.BoxGeometry(9, 0.2, 7);
        const roofMesh = new THREE.Mesh(roofGeometry, buildingMaterial);
        roofMesh.position.set(0, 3.1, 0);
        roofMesh.castShadow = true;
        scene.add(roofMesh);

        // Entrées (passages)
        this.createBuildingEntrances();
    }

    createBuildingEntrances() {
        const entranceMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        
        // Arcade d'entrée Est
        const eastEntrance = new THREE.BoxGeometry(1.5, 2.5, 0.5);
        const eastMesh = new THREE.Mesh(eastEntrance, entranceMaterial);
        eastMesh.position.set(4.25, 1.25, 0);
        scene.add(eastMesh);
        
        // Arcade d'entrée Ouest
        const westEntrance = new THREE.BoxGeometry(1.5, 2.5, 0.5);
        const westMesh = new THREE.Mesh(westEntrance, entranceMaterial);
        westMesh.position.set(-4.25, 1.25, 0);
        scene.add(westMesh);
    }

    createSideStructures() {
        const structMaterial = new THREE.MeshLambertMaterial({ color: 0xB8860B });
        
        // Structures latérales pour le cover
        const sideStructures = [
            { pos: [15, 1, 15], size: [3, 2, 3] },
            { pos: [-15, 1, -15], size: [3, 2, 3] },
            { pos: [18, 1, -8], size: [2, 2.5, 4] },
            { pos: [-18, 1, 8], size: [2, 2.5, 4] }
        ];

        sideStructures.forEach(struct => {
            const geometry = new THREE.BoxGeometry(...struct.size);
            const mesh = new THREE.Mesh(geometry, structMaterial);
            mesh.position.set(...struct.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            obstacles.push(mesh);
        });
    }

    createTunnels() {
        // Simulation de tunnels avec des murs bas
        const tunnelMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        
        // Tunnel Nord-Sud
        const tunnelWalls = [
            { pos: [8, 0.8, 0], size: [0.5, 1.6, 12] },
            { pos: [-8, 0.8, 0], size: [0.5, 1.6, 12] }
        ];

        tunnelWalls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, tunnelMaterial);
            mesh.position.set(...wall.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            obstacles.push(mesh);
        });
    }

    createCover() {
        const coverMaterial = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.BOX });
        
        // Caisses et barils pour le cover tactique
        const coverObjects = [
            // Caisses empilées
            { pos: [12, 0.5, 8], size: [1, 1, 1], type: 'box' },
            { pos: [12, 1.5, 8], size: [1, 1, 1], type: 'box' },
            { pos: [-12, 0.5, -8], size: [1, 1, 1], type: 'box' },
            { pos: [-12, 1.5, -8], size: [1, 1, 1], type: 'box' },
            
            // Barils
            { pos: [5, 0.8, 12], size: [0.8, 1.6, 0.8], type: 'barrel' },
            { pos: [-5, 0.8, -12], size: [0.8, 1.6, 0.8], type: 'barrel' },
            
            // Murets bas
            { pos: [0, 0.3, 15], size: [6, 0.6, 0.8], type: 'wall' },
            { pos: [0, 0.3, -15], size: [6, 0.6, 0.8], type: 'wall' },
            { pos: [15, 0.3, 0], size: [0.8, 0.6, 6], type: 'wall' },
            { pos: [-15, 0.3, 0], size: [0.8, 0.6, 6], type: 'wall' }
        ];

        coverObjects.forEach(obj => {
            let geometry;
            
            if (obj.type === 'barrel') {
                geometry = new THREE.CylinderGeometry(obj.size[0]/2, obj.size[0]/2, obj.size[1]);
            } else {
                geometry = new THREE.BoxGeometry(...obj.size);
            }
            
            const mesh = new THREE.Mesh(geometry, coverMaterial);
            mesh.position.set(...obj.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            obstacles.push(mesh);
            
            // Détails visuels
            this.addCoverDetails(mesh, obj.type);
        });
    }

    addCoverDetails(mesh, type) {
        if (type === 'box') {
            // Étiquettes sur les caisses
            const labelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const labelGeometry = new THREE.PlaneGeometry(0.5, 0.2);
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.set(0, 0, 0.51);
            mesh.add(label);
        } else if (type === 'barrel') {
            // Cercles métalliques sur les barils
            const ringMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            
            [-0.5, 0, 0.5].forEach(y => {
                const ringGeometry = new THREE.TorusGeometry(0.42, 0.02, 8, 16);
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.position.y = y;
                ring.rotation.x = Math.PI / 2;
                mesh.add(ring);
            });
        }
    }

    createLighting() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        scene.add(ambientLight);

        // Lumière directionnelle principale (soleil)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 50, 25);
        sunLight.castShadow = true;
        
        // Configuration des ombres
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        
        scene.add(sunLight);

        // Lumières d'appoint
        this.createSpotLights();
    }

    createSpotLights() {
        const spotLights = [
            { pos: [0, 8, 0], target: [0, 0, 0], color: 0xffffff, intensity: 0.5 },
            { pos: [15, 6, 15], target: [15, 0, 15], color: 0xffffcc, intensity: 0.3 },
            { pos: [-15, 6, -15], target: [-15, 0, -15], color: 0xffffcc, intensity: 0.3 }
        ];

        spotLights.forEach(config => {
            const light = new THREE.SpotLight(config.color, config.intensity, 30, Math.PI / 6, 0.3);
            light.position.set(...config.pos);
            light.target.position.set(...config.target);
            light.castShadow = true;
            
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            
            scene.add(light);
            scene.add(light.target);
        });
    }

    // Méthode pour obtenir des positions de spawn sûres
    getSafeSpawnPositions() {
        const positions = [
            new THREE.Vector3(-20, 1, -20),
            new THREE.Vector3(20, 1, 20),
            new THREE.Vector3(-20, 1, 20),
            new THREE.Vector3(20, 1, -20),
            new THREE.Vector3(0, 1, 22),
            new THREE.Vector3(0, 1, -22),
            new THREE.Vector3(22, 1, 0),
            new THREE.Vector3(-22, 1, 0)
        ];

        // Filtrer les positions qui ne sont pas dans des obstacles
        return positions.filter(pos => {
            for (let obstacle of obstacles) {
                const box = new THREE.Box3().setFromObject(obstacle);
                box.expandByScalar(2); // Zone de sécurité
                if (box.containsPoint(pos)) {
                    return false;
                }
            }
            return true;
        });
    }
}

// Fonction utilitaire pour créer la carte
function createMap() {
    const mapGenerator = new MapGenerator();
    mapGenerator.generateMap();
    return mapGenerator.getSafeSpawnPositions();
}