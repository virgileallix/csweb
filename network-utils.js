// Utilitaires réseau pour optimiser les performances multijoueur
class NetworkManager {
    constructor() {
        this.updateQueue = [];
        this.lastUpdate = 0;
        this.updateRate = 100; // 10 FPS pour les mises à jour réseau
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = true;
        
        this.setupConnectionMonitoring();
    }

    setupConnectionMonitoring() {
        // Surveiller la connexion Firebase
        database.ref('.info/connected').on('value', (snapshot) => {
            this.isConnected = snapshot.val();
            
            if (this.isConnected) {
                console.log('✅ Connexion Firebase rétablie');
                this.reconnectAttempts = 0;
                this.showConnectionStatus('Connecté', '#4CAF50');
            } else {
                console.warn('❌ Connexion Firebase perdue');
                this.showConnectionStatus('Déconnecté', '#F44336');
                this.attemptReconnect();
            }
        });
    }

    showConnectionStatus(status, color) {
        let statusElement = document.getElementById('connectionStatus');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'connectionStatus';
            statusElement.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 3000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }
        
        statusElement.textContent = `🌐 ${status}`;
        statusElement.style.borderLeft = `3px solid ${color}`;
        
        // Masquer après 3 secondes si connecté
        if (this.isConnected) {
            setTimeout(() => {
                if (statusElement && this.isConnected) {
                    statusElement.style.opacity = '0.3';
                }
            }, 3000);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showReconnectDialog();
            return;
        }

        this.reconnectAttempts++;
        console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            // Firebase gère automatiquement la reconnexion
            // On vérifie juste l'état
            if (!this.isConnected) {
                this.attemptReconnect();
            }
        }, 2000 * this.reconnectAttempts); // Délai croissant
    }

    showReconnectDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 5000;
            border: 2px solid #F44336;
        `;
        
        dialog.innerHTML = `
            <h3>❌ Connexion perdue</h3>
            <p>Impossible de se reconnecter au serveur.</p>
            <br>
            <button onclick="location.reload()" style="padding: 10px 20px; margin: 5px;">
                RECHARGER LA PAGE
            </button>
            <button onclick="this.parentElement.remove()" style="padding: 10px 20px; margin: 5px;">
                CONTINUER HORS LIGNE
            </button>
        `;
        
        document.body.appendChild(dialog);
    }

    // Optimisation des mises à jour réseau
    queueUpdate(type, data) {
        this.updateQueue.push({
            type,
            data,
            timestamp: Date.now()
        });
    }

    processUpdateQueue() {
        const now = Date.now();
        
        if (now - this.lastUpdate < this.updateRate) {
            return; // Pas encore temps de mettre à jour
        }
        
        if (this.updateQueue.length === 0) {
            return;
        }
        
        // Grouper les mises à jour par type
        const grouped = {};
        this.updateQueue.forEach(update => {
            if (!grouped[update.type]) {
                grouped[update.type] = [];
            }
            grouped[update.type].push(update);
        });
        
        // Traiter chaque type
        Object.entries(grouped).forEach(([type, updates]) => {
            switch (type) {
                case 'player_position':
                    this.sendPlayerPosition(updates[updates.length - 1].data); // Seule la dernière position
                    break;
                case 'player_shot':
                    updates.forEach(update => this.sendPlayerShot(update.data));
                    break;
                case 'player_damage':
                    updates.forEach(update => this.sendPlayerDamage(update.data));
                    break;
            }
        });
        
        // Vider la queue
        this.updateQueue = [];
        this.lastUpdate = now;
    }

    async sendPlayerPosition(data) {
        if (!multiplayer || !multiplayer.matchId || !this.isConnected) return;
        
        try {
            await database.ref(`matches/${multiplayer.matchId}/playersState/${multiplayer.playerId}`).update({
                position: data.position,
                rotation: data.rotation,
                health: data.health,
                alive: data.alive,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.warn('Erreur envoi position:', error);
        }
    }

    async sendPlayerShot(data) {
        if (!multiplayer || !multiplayer.matchId || !this.isConnected) return;
        
        try {
            const shotId = 'shot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await database.ref(`matches/${multiplayer.matchId}/shots/${shotId}`).set({
                playerId: multiplayer.playerId,
                position: data.position,
                direction: data.direction,
                weapon: data.weapon,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.warn('Erreur envoi tir:', error);
        }
    }

    async sendPlayerDamage(data) {
        if (!multiplayer || !multiplayer.matchId || !this.isConnected) return;
        
        try {
            const damageId = 'damage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await database.ref(`matches/${multiplayer.matchId}/damage/${damageId}`).set({
                attackerId: multiplayer.playerId,
                victimId: data.victimId,
                damage: data.damage,
                zone: data.zone,
                weapon: data.weapon,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.warn('Erreur envoi dégâts:', error);
        }
    }

    // Nettoyage automatique des anciennes données
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupOldData();
        }, 60000); // Toutes les minutes
    }

    async cleanupOldData() {
        if (!multiplayer || !multiplayer.matchId || !this.isConnected) return;
        
        try {
            const cutoffTime = Date.now() - 300000; // 5 minutes
            
            // Nettoyer les anciens tirs
            const shotsRef = database.ref(`matches/${multiplayer.matchId}/shots`);
            const shotsSnapshot = await shotsRef.orderByChild('timestamp').endAt(cutoffTime).once('value');
            
            if (shotsSnapshot.exists()) {
                shotsSnapshot.forEach(child => {
                    child.ref.remove();
                });
            }
            
            // Nettoyer les anciens dégâts
            const damageRef = database.ref(`matches/${multiplayer.matchId}/damage`);
            const damageSnapshot = await damageRef.orderByChild('timestamp').endAt(cutoffTime).once('value');
            
            if (damageSnapshot.exists()) {
                damageSnapshot.forEach(child => {
                    child.ref.remove();
                });
            }
            
        } catch (error) {
            console.warn('Erreur nettoyage données:', error);
        }
    }

    // Gestion des latences
    measureLatency() {
        const start = Date.now();
        
        database.ref('.info/serverTimeOffset').once('value', () => {
            const latency = Date.now() - start;
            this.updateLatencyDisplay(latency);
        });
    }

    updateLatencyDisplay(latency) {
        let latencyElement = document.getElementById('latencyDisplay');
        
        if (!latencyElement) {
            latencyElement = document.createElement('div');
            latencyElement.id = 'latencyDisplay';
            latencyElement.style.cssText = `
                position: absolute;
                top: 40px;
                right: 10px;
                background: rgba(0,0,0,0.6);
                color: white;
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 11px;
                z-index: 3000;
            `;
            document.body.appendChild(latencyElement);
        }
        
        // Couleur selon la latence
        let color = '#4CAF50'; // Vert
        if (latency > 100) color = '#FF9800'; // Orange
        if (latency > 200) color = '#F44336'; // Rouge
        
        latencyElement.textContent = `📶 ${latency}ms`;
        latencyElement.style.color = color;
    }

    // Compression des données pour économiser la bande passante
    compressPlayerData(data) {
        return {
            p: [
                Math.round(data.position.x * 100) / 100,
                Math.round(data.position.y * 100) / 100,
                Math.round(data.position.z * 100) / 100
            ],
            r: [
                Math.round(data.rotation.x * 1000) / 1000,
                Math.round(data.rotation.y * 1000) / 1000
            ],
            h: Math.round(data.health),
            a: data.alive,
            t: Date.now()
        };
    }

    decompressPlayerData(compressed) {
        return {
            position: {
                x: compressed.p[0],
                y: compressed.p[1],
                z: compressed.p[2]
            },
            rotation: {
                x: compressed.r[0],
                y: compressed.r[1]
            },
            health: compressed.h,
            alive: compressed.a,
            timestamp: compressed.t
        };
    }

    // Prédiction de mouvement pour compenser la latence
    interpolatePlayerPosition(lastPosition, currentPosition, alpha) {
        return {
            x: lastPosition.x + (currentPosition.x - lastPosition.x) * alpha,
            y: lastPosition.y + (currentPosition.y - lastPosition.y) * alpha,
            z: lastPosition.z + (currentPosition.z - lastPosition.z) * alpha
        };
    }

    // Détection de triche basique
    validatePlayerData(playerId, data) {
        const lastData = this.lastPlayerData?.[playerId];
        
        if (!lastData) {
            this.lastPlayerData = this.lastPlayerData || {};
            this.lastPlayerData[playerId] = data;
            return true;
        }
        
        // Vérifier vitesse de déplacement
        const distance = Math.sqrt(
            Math.pow(data.position.x - lastData.position.x, 2) +
            Math.pow(data.position.z - lastData.position.z, 2)
        );
        
        const timeDiff = (data.timestamp - lastData.timestamp) / 1000;
        const speed = distance / timeDiff;
        
        if (speed > 20) { // Vitesse max théorique
            console.warn(`Vitesse suspecte détectée pour ${playerId}: ${speed.toFixed(2)} u/s`);
            return false;
        }
        
        this.lastPlayerData[playerId] = data;
        return true;
    }

    // Méthodes utilitaires
    isOnline() {
        return this.isConnected && navigator.onLine;
    }

    getNetworkQuality() {
        // Estimer la qualité réseau basé sur la latence et les erreurs
        if (!this.isConnected) return 'offline';
        
        const connection = navigator.connection;
        if (connection) {
            if (connection.effectiveType === '4g') return 'excellent';
            if (connection.effectiveType === '3g') return 'good';
            if (connection.effectiveType === '2g') return 'poor';
        }
        
        return 'unknown';
    }

    destroy() {
        // Nettoyer les listeners Firebase
        database.ref('.info/connected').off();
        
        // Supprimer les éléments UI
        const elements = ['connectionStatus', 'latencyDisplay'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        // Vider les queues
        this.updateQueue = [];
    }
}

// Instance globale du gestionnaire réseau
let networkManager = null;

// Initialiser le gestionnaire réseau après Firebase
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && database) {
            networkManager = new NetworkManager();
            networkManager.startCleanupTimer();
            
            // Mesurer la latence toutes les 10 secondes
            setInterval(() => {
                if (networkManager.isOnline()) {
                    networkManager.measureLatency();
                }
            }, 10000);
            
            // Traiter la queue de mises à jour
            setInterval(() => {
                networkManager.processUpdateQueue();
            }, 50); // 20 FPS pour le traitement
        }
    }, 1000);
});