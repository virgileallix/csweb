// Système Ranked complet pour SIO SHOOTER
class RankedSystem {
    constructor() {
        this.currentSeason = this.getCurrentSeason();
        this.matchmakingQueue = new Map();
        this.activeMatches = new Map();
        this.rankedMaps = [
            'de_academy', 'de_warehouse', 'de_office', 'de_mirage_sio', 
            'de_inferno_sio', 'de_cache_sio', 'de_overpass_sio'
        ];
        
        // Configuration du système ELO
        this.eloConfig = {
            placement_matches: 10,
            initial_elo: 1000,
            max_elo_change: 50,
            min_elo_change: 1,
            rank_decay_days: 28,
            season_reset_percentage: 0.8
        };
        
        // Système de rangs amélioré
        this.ranks = [
            { name: 'Iron I', elo: 0, icon: '🥉', color: '#8B4513', division: 'Iron' },
            { name: 'Iron II', elo: 100, icon: '🥉', color: '#A0522D', division: 'Iron' },
            { name: 'Iron III', elo: 200, icon: '🥉', color: '#CD853F', division: 'Iron' },
            
            { name: 'Bronze I', elo: 300, icon: '🥈', color: '#CD7F32', division: 'Bronze' },
            { name: 'Bronze II', elo: 400, icon: '🥈', color: '#D2691E', division: 'Bronze' },
            { name: 'Bronze III', elo: 500, icon: '🥈', color: '#DEB887', division: 'Bronze' },
            
            { name: 'Silver I', elo: 600, icon: '🥈', color: '#C0C0C0', division: 'Silver' },
            { name: 'Silver II', elo: 750, icon: '🥈', color: '#D3D3D3', division: 'Silver' },
            { name: 'Silver III', elo: 900, icon: '🥈', color: '#E5E5E5', division: 'Silver' },
            
            { name: 'Gold I', elo: 1100, icon: '🥇', color: '#FFD700', division: 'Gold' },
            { name: 'Gold II', elo: 1300, icon: '🥇', color: '#FFA500', division: 'Gold' },
            { name: 'Gold III', elo: 1500, icon: '🥇', color: '#FF8C00', division: 'Gold' },
            
            { name: 'Platinum I', elo: 1700, icon: '💎', color: '#E5E4E2', division: 'Platinum' },
            { name: 'Platinum II', elo: 1900, icon: '💎', color: '#B0C4DE', division: 'Platinum' },
            { name: 'Platinum III', elo: 2100, icon: '💎', color: '#87CEEB', division: 'Platinum' },
            
            { name: 'Diamond I', elo: 2300, icon: '💎', color: '#00FFFF', division: 'Diamond' },
            { name: 'Diamond II', elo: 2500, icon: '💎', color: '#40E0D0', division: 'Diamond' },
            { name: 'Diamond III', elo: 2700, icon: '💎', color: '#48D1CC', division: 'Diamond' },
            
            { name: 'Master', elo: 2900, icon: '👑', color: '#9370DB', division: 'Master' },
            { name: 'Grandmaster', elo: 3200, icon: '👑', color: '#8A2BE2', division: 'Grandmaster' },
            { name: 'Challenger', elo: 3500, icon: '🌟', color: '#FF1493', division: 'Challenger' }
        ];
        
        this.leaderboard = [];
        this.matchHistory = [];
        
        this.initializeRankedSystem();
    }
    
    // Initialise le système ranked
    initializeRankedSystem() {
        this.loadPlayerRankedData();
        this.loadLeaderboard();
        this.startMatchmakingService();
        this.startRankDecayService();
        this.updateSeasonStatus();
    }
    
    // Obtient la saison actuelle
    getCurrentSeason() {
        const startDate = new Date('2025-01-01');
        const currentDate = new Date();
        const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (currentDate.getMonth() - startDate.getMonth());
        
        const seasonNumber = Math.floor(monthsDiff / 3) + 1; // Saisons de 3 mois
        const year = startDate.getFullYear() + Math.floor((monthsDiff) / 12);
        
        return {
            number: seasonNumber,
            year: year,
            name: `Saison ${seasonNumber} ${year}`,
            startDate: new Date(year, (seasonNumber - 1) * 3, 1),
            endDate: new Date(year, seasonNumber * 3, 0, 23, 59, 59)
        };
    }
    
    // Charge les données ranked du joueur
    loadPlayerRankedData() {
        const savedData = localStorage.getItem('sio-shooter-ranked');
        if (savedData) {
            this.playerRanked = JSON.parse(savedData);
        } else {
            this.playerRanked = {
                elo: this.eloConfig.initial_elo,
                rank: this.getRankFromELO(this.eloConfig.initial_elo),
                placement_matches: 0,
                wins: 0,
                losses: 0,
                winrate: 0,
                peak_elo: this.eloConfig.initial_elo,
                peak_rank: this.getRankFromELO(this.eloConfig.initial_elo),
                current_season: this.currentSeason.number,
                last_played: Date.now(),
                match_history: [],
                preferred_maps: [],
                banned_maps: [],
                mvp_count: 0,
                average_score: 0,
                kd_ratio: 1.0,
                headshot_percentage: 0,
                clutch_rounds: 0,
                ace_rounds: 0
            };
        }
        
        // Vérifie si c'est une nouvelle saison
        if (this.playerRanked.current_season !== this.currentSeason.number) {
            this.handleSeasonReset();
        }
    }
    
    // Gère le reset de saison
    handleSeasonReset() {
        const oldElo = this.playerRanked.elo;
        const newElo = Math.floor(oldElo * this.eloConfig.season_reset_percentage);
        
        // Archive les stats de la saison précédente
        const seasonArchive = {
            season: this.playerRanked.current_season,
            final_elo: oldElo,
            final_rank: this.playerRanked.rank,
            wins: this.playerRanked.wins,
            losses: this.playerRanked.losses,
            mvp_count: this.playerRanked.mvp_count,
            peak_elo: this.playerRanked.peak_elo,
            peak_rank: this.playerRanked.peak_rank
        };
        
        if (!this.playerRanked.season_history) {
            this.playerRanked.season_history = [];
        }
        this.playerRanked.season_history.push(seasonArchive);
        
        // Reset pour la nouvelle saison
        this.playerRanked.elo = newElo;
        this.playerRanked.rank = this.getRankFromELO(newElo);
        this.playerRanked.placement_matches = 0;
        this.playerRanked.wins = 0;
        this.playerRanked.losses = 0;
        this.playerRanked.current_season = this.currentSeason.number;
        this.playerRanked.match_history = [];
        
        this.savePlayerRankedData();
        
        this.showSeasonResetNotification(seasonArchive, newElo);
    }
    
    // Affiche la notification de reset de saison
    showSeasonResetNotification(oldSeasonData, newElo) {
        const notification = document.createElement('div');
        notification.className = 'season-reset-notification';
        notification.innerHTML = `
            <div class="season-reset-content">
                <h2>🎊 NOUVELLE SAISON !</h2>
                <div class="season-info">
                    <h3>${this.currentSeason.name}</h3>
                    <p>Votre ELO a été ajusté pour la nouvelle saison</p>
                </div>
                <div class="elo-adjustment">
                    <div class="old-elo">
                        <span class="label">ELO Précédent:</span>
                        <span class="value">${oldSeasonData.final_elo}</span>
                        <span class="rank">${oldSeasonData.final_rank.name}</span>
                    </div>
                    <div class="arrow">→</div>
                    <div class="new-elo">
                        <span class="label">Nouvel ELO:</span>
                        <span class="value">${newElo}</span>
                        <span class="rank">${this.getRankFromELO(newElo).name}</span>
                    </div>
                </div>
                <p class="season-message">Bonne chance pour cette nouvelle saison !</p>
                <button class="btn btn-primary" onclick="this.closest('.season-reset-notification').remove()">
                    Commencer la Saison
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
    }
    
    // Obtient le rang depuis l'ELO
    getRankFromELO(elo) {
        let rank = this.ranks[0];
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (elo >= this.ranks[i].elo) {
                rank = this.ranks[i];
                break;
            }
        }
        return rank;
    }
    
    // Sauvegarde les données ranked
    savePlayerRankedData() {
        localStorage.setItem('sio-shooter-ranked', JSON.stringify(this.playerRanked));
    }
    
    // Démarre le service de matchmaking
    startMatchmakingService() {
        this.matchmakingInterval = setInterval(() => {
            this.processMatchmakingQueue();
        }, 5000); // Vérifie toutes les 5 secondes
    }
    
    // Rejoint la file d'attente ranked
    async joinRankedQueue(gameMode = 'competitive') {
        if (!firebaseManager.currentUser) {
            throw new Error('Vous devez être connecté pour jouer en ranked');
        }
        
        // Vérifie les conditions pour jouer en ranked
        if (this.playerRanked.placement_matches < this.eloConfig.placement_matches && 
            this.playerRanked.elo === this.eloConfig.initial_elo) {
            // Premier placement match
            this.showPlacementMatchInfo();
        }
        
        const queueData = {
            playerId: firebaseManager.currentUser.id,
            playerName: firebaseManager.currentUser.name,
            elo: this.playerRanked.elo,
            rank: this.playerRanked.rank,
            joinTime: Date.now(),
            gameMode: gameMode,
            region: 'EU-West', // Peut être détecté automatiquement
            preferredMaps: this.playerRanked.preferred_maps || [],
            bannedMaps: this.playerRanked.banned_maps || []
        };
        
        // Ajoute à la queue Firebase
        await database.ref(`ranked_queue/${firebaseManager.currentUser.id}`).set(queueData);
        
        this.showQueueStatus(true);
        this.startQueueTimer();
        
        console.log('🎯 Ajouté à la file d\'attente ranked');
    }
    
    // Quitte la file d'attente
    async leaveRankedQueue() {
        if (!firebaseManager.currentUser) return;
        
        await database.ref(`ranked_queue/${firebaseManager.currentUser.id}`).remove();
        
        this.showQueueStatus(false);
        this.stopQueueTimer();
        
        console.log('🚪 Quitté la file d\'attente ranked');
    }
    
    // Traite la file d'attente de matchmaking
    async processMatchmakingQueue() {
        try {
            const snapshot = await database.ref('ranked_queue').once('value');
            if (!snapshot.exists()) return;
            
            const queueData = snapshot.val();
            const players = Object.values(queueData);
            
            if (players.length < 10) return; // Pas assez de joueurs
            
            // Trie les joueurs par ELO
            players.sort((a, b) => a.elo - b.elo);
            
            // Trouve des matchs équilibrés
            const matches = this.findBalancedMatches(players);
            
            for (const match of matches) {
                await this.createRankedMatch(match);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du matchmaking:', error);
        }
    }
    
    // Trouve des matchs équilibrés
    findBalancedMatches(players) {
        const matches = [];
        const used = new Set();
        
        for (let i = 0; i < players.length - 9; i++) {
            if (used.has(players[i].playerId)) continue;
            
            const potential_match = [players[i]];
            used.add(players[i].playerId);
            
            // Trouve 9 autres joueurs avec un ELO similaire
            for (let j = i + 1; j < players.length && potential_match.length < 10; j++) {
                if (used.has(players[j].playerId)) continue;
                
                const eloDiff = Math.abs(players[i].elo - players[j].elo);
                const maxDiff = this.getMaxELODifference();
                
                if (eloDiff <= maxDiff) {
                    potential_match.push(players[j]);
                    used.add(players[j].playerId);
                }
            }
            
            if (potential_match.length === 10) {
                matches.push(potential_match);
            } else {
                // Libère les joueurs si pas assez pour un match
                potential_match.forEach(p => used.delete(p.playerId));
            }
        }
        
        return matches;
    }
    
    // Obtient la différence ELO maximale autorisée
    getMaxELODifference() {
        // Plus permissif aux heures creuses
        const hour = new Date().getHours();
        const isOffPeak = hour < 8 || hour > 22;
        
        return isOffPeak ? 300 : 200;
    }
    
    // Crée un match ranked
    async createRankedMatch(players) {
        const matchId = this.generateMatchId();
        
        // Équilibre les équipes par ELO
        const teams = this.balanceTeamsByELO(players);
        
        // Sélectionne la map
        const selectedMap = await this.selectMapForMatch(players);
        
        const matchData = {
            id: matchId,
            type: 'ranked',
            status: 'map_selection',
            created: Date.now(),
            players: {},
            teams: teams,
            map: selectedMap,
            averageELO: {
                ct: this.calculateAverageELO(teams.CT),
                t: this.calculateAverageELO(teams.T)
            },
            gameState: {
                ctScore: 0,
                tScore: 0,
                currentRound: 1,
                status: 'warmup'
            },
            settings: {
                gameMode: 'competitive',
                teamSize: 5,
                maxRounds: 30,
                roundTime: 115,
                friendlyFire: false,
                allowSpectators: true
            }
        };
        
        // Ajoute les joueurs au match
        players.forEach(player => {
            const team = teams.CT.includes(player.playerId) ? 'CT' : 'T';
            matchData.players[player.playerId] = {
                id: player.playerId,
                name: player.playerName,
                team: team,
                elo: player.elo,
                rank: player.rank,
                ready: false,
                connected: false
            };
        });
        
        // Sauvegarde le match
        await database.ref(`ranked_matches/${matchId}`).set(matchData);
        
        // Supprime les joueurs de la queue
        for (const player of players) {
            await database.ref(`ranked_queue/${player.playerId}`).remove();
        }
        
        // Notifie les joueurs
        this.notifyPlayersMatchFound(players, matchId);
        
        console.log(`🎯 Match ranked créé: ${matchId}`);
    }
    
    // Équilibre les équipes par ELO
    balanceTeamsByELO(players) {
        // Algorithme pour équilibrer les équipes
        players.sort((a, b) => b.elo - a.elo);
        
        const ct = [];
        const t = [];
        
        // Snake draft: alternance du plus fort au plus faible
        for (let i = 0; i < players.length; i++) {
            if (i % 4 === 0 || i % 4 === 3) {
                ct.push(players[i].playerId);
            } else {
                t.push(players[i].playerId);
            }
        }
        
        return { CT: ct, T: t };
    }
    
    // Calcule l'ELO moyen d'une équipe
    calculateAverageELO(teamPlayerIds) {
        const elos = teamPlayerIds.map(id => 
            this.matchmakingQueue.get(id)?.elo || this.eloConfig.initial_elo
        );
        return Math.round(elos.reduce((sum, elo) => sum + elo, 0) / elos.length);
    }
    
    // Sélectionne une map pour le match
    async selectMapForMatch(players) {
        // Analyse les maps préférées et bannies des joueurs
        const mapPreferences = this.analyzeMapPreferences(players);
        
        // Sélectionne la map la plus équitable
        let selectedMap = this.rankedMaps[0];
        let bestScore = -999;
        
        for (const map of this.rankedMaps) {
            const score = mapPreferences[map] || 0;
            if (score > bestScore) {
                bestScore = score;
                selectedMap = map;
            }
        }
        
        return selectedMap;
    }
    
    // Analyse les préférences de maps
    analyzeMapPreferences(players) {
        const preferences = {};
        
        this.rankedMaps.forEach(map => {
            let score = 0;
            
            players.forEach(player => {
                if (player.preferredMaps && player.preferredMaps.includes(map)) {
                    score += 2;
                }
                if (player.bannedMaps && player.bannedMaps.includes(map)) {
                    score -= 5;
                }
            });
            
            preferences[map] = score;
        });
        
        return preferences;
    }
    
    // Notifie les joueurs qu'un match a été trouvé
    notifyPlayersMatchFound(players, matchId) {
        // Utilise Firebase pour notifier
        players.forEach(player => {
            database.ref(`player_notifications/${player.playerId}`).push({
                type: 'match_found',
                matchId: matchId,
                timestamp: Date.now(),
                message: 'Match trouvé ! Cliquez pour accepter.'
            });
        });
    }
    
    // Accepte un match
    async acceptMatch(matchId) {
        const matchRef = database.ref(`ranked_matches/${matchId}`);
        const snapshot = await matchRef.once('value');
        
        if (!snapshot.exists()) {
            throw new Error('Match introuvable');
        }
        
        const matchData = snapshot.val();
        
        // Met à jour le statut du joueur
        await matchRef.child(`players/${firebaseManager.currentUser.id}`).update({
            ready: true,
            connected: true,
            acceptedAt: Date.now()
        });
        
        // Vérifie si tous les joueurs ont accepté
        const allReady = Object.values(matchData.players)
            .every(player => player.ready || player.id === firebaseManager.currentUser.id);
        
        if (allReady) {
            await matchRef.update({
                status: 'starting',
                startTime: Date.now()
            });
            
            this.startRankedMatch(matchId);
        }
    }
    
    // Démarre un match ranked
    async startRankedMatch(matchId) {
        // Crée un lobby temporaire pour le match
        const lobbyCode = this.generateLobbyCode();
        const matchData = (await database.ref(`ranked_matches/${matchId}`).once('value')).val();
        
        const lobbyData = {
            code: lobbyCode,
            type: 'ranked',
            matchId: matchId,
            host: Object.keys(matchData.players)[0],
            created: Date.now(),
            status: 'starting',
            players: matchData.players,
            gameState: matchData.gameState,
            settings: matchData.settings,
            map: matchData.map,
            averageELO: matchData.averageELO
        };
        
        await database.ref(`lobbies/${lobbyCode}`).set(lobbyData);
        
        // Transfère tous les joueurs vers le lobby
        Object.keys(matchData.players).forEach(playerId => {
            database.ref(`player_notifications/${playerId}`).push({
                type: 'match_starting',
                lobbyCode: lobbyCode,
                matchId: matchId,
                timestamp: Date.now()
            });
        });
        
        console.log(`🎮 Match ranked démarré: ${matchId} -> ${lobbyCode}`);
    }
    
    // Termine un match ranked et met à jour les ELOs
    async finishRankedMatch(matchId, results) {
        const matchData = (await database.ref(`ranked_matches/${matchId}`).once('value')).val();
        if (!matchData) return;
        
        const ctWin = results.ctScore > results.tScore;
        const mvpPlayer = results.mvp;
        
        // Met à jour l'ELO de chaque joueur
        for (const [playerId, playerData] of Object.entries(matchData.players)) {
            const won = (playerData.team === 'CT' && ctWin) || (playerData.team === 'T' && !ctWin);
            const isMVP = playerId === mvpPlayer;
            
            const stats = results.playerStats[playerId] || {};
            const performance = this.calculatePerformanceRating(stats, matchData.averageELO);
            
            await this.updatePlayerELO(playerId, {
                won: won,
                isMVP: isMVP,
                performance: performance,
                teamELO: matchData.averageELO[playerData.team.toLowerCase()],
                enemyELO: matchData.averageELO[playerData.team === 'CT' ? 't' : 'ct'],
                isPlacement: this.isPlacementMatch(playerId),
                stats: stats
            });
        }
        
        // Archive le match
        await database.ref(`ranked_matches_history/${matchId}`).set({
            ...matchData,
            results: results,
            finishedAt: Date.now()
        });
        
        await database.ref(`ranked_matches/${matchId}`).remove();
        
        console.log(`✅ Match ranked terminé: ${matchId}`);
    }
    
    // Calcule la note de performance
    calculatePerformanceRating(stats, averageELO) {
        const kd = (stats.kills || 0) / Math.max(stats.deaths || 1, 1);
        const adr = stats.averageDamagePerRound || 0;
        const rating = (kd * 0.4) + (adr / 100 * 0.3) + ((stats.mvpRounds || 0) * 0.3);
        
        return Math.max(0.5, Math.min(2.0, rating));
    }
    
    // Vérifie si c'est un match de placement
    isPlacementMatch(playerId) {
        // Charge les données du joueur pour vérifier
        const playerData = this.getPlayerRankedData(playerId);
        return playerData && playerData.placement_matches < this.eloConfig.placement_matches;
    }
    
    // Met à jour l'ELO d'un joueur
    async updatePlayerELO(playerId, matchData) {
        let playerRanked = this.getPlayerRankedData(playerId);
        if (!playerRanked) return;
        
        const oldELO = playerRanked.elo;
        const oldRank = this.getRankFromELO(oldELO);
        
        // Calcule le changement d'ELO
        let eloChange;
        
        if (matchData.isPlacement) {
            // Changements plus importants pendant les placements
            eloChange = this.calculatePlacementELOChange(matchData);
            playerRanked.placement_matches++;
        } else {
            eloChange = this.calculateStandardELOChange(matchData);
        }
        
        // Applique le changement
        playerRanked.elo = Math.max(0, oldELO + eloChange);
        playerRanked.last_played = Date.now();
        
        // Met à jour les statistiques
        if (matchData.won) {
            playerRanked.wins++;
        } else {
            playerRanked.losses++;
        }
        
        playerRanked.winrate = (playerRanked.wins / (playerRanked.wins + playerRanked.losses)) * 100;
        
        // Records personnels
        if (playerRanked.elo > playerRanked.peak_elo) {
            playerRanked.peak_elo = playerRanked.elo;
            playerRanked.peak_rank = this.getRankFromELO(playerRanked.elo);
        }
        
        // Ajoute à l'historique
        playerRanked.match_history.unshift({
            date: Date.now(),
            eloChange: eloChange,
            newELO: playerRanked.elo,
            won: matchData.won,
            mvp: matchData.isMVP,
            performance: matchData.performance,
            stats: matchData.stats
        });
        
        // Limite l'historique
        if (playerRanked.match_history.length > 50) {
            playerRanked.match_history = playerRanked.match_history.slice(0, 50);
        }
        
        const newRank = this.getRankFromELO(playerRanked.elo);
        
        // Sauvegarde
        if (playerId === firebaseManager.currentUser?.id) {
            this.playerRanked = playerRanked;
            this.savePlayerRankedData();
            
            // Notification de changement de rang
            if (newRank.name !== oldRank.name) {
                this.showRankChangeNotification(oldRank, newRank, newRank.elo > oldRank.elo);
            }
        }
        
        // Met à jour le leaderboard
        this.updateLeaderboard(playerId, playerRanked);
        
        return {
            oldELO: oldELO,
            newELO: playerRanked.elo,
            change: eloChange,
            oldRank: oldRank,
            newRank: newRank
        };
    }
    
    // Calcule le changement d'ELO pour les placements
    calculatePlacementELOChange(matchData) {
        const baseChange = matchData.won ? 40 : -20;
        const performanceMultiplier = matchData.performance;
        const mvpBonus = matchData.isMVP ? 10 : 0;
        
        return Math.round(baseChange * performanceMultiplier + mvpBonus);
    }
    
    // Calcule le changement d'ELO standard
    calculateStandardELOChange(matchData) {
        const expectedScore = 1 / (1 + Math.pow(10, (matchData.enemyELO - matchData.teamELO) / 400));
        const actualScore = matchData.won ? 1 : 0;
        
        const kFactor = this.getKFactor(matchData.teamELO);
        let eloChange = Math.round(kFactor * (actualScore - expectedScore));
        
        // Ajustements
        eloChange *= matchData.performance;
        if (matchData.isMVP && matchData.won) eloChange += 5;
        
        // Limites
        eloChange = Math.max(-this.eloConfig.max_elo_change, 
                           Math.min(this.eloConfig.max_elo_change, eloChange));
        
        return Math.round(eloChange);
    }
    
    // Obtient le facteur K selon l'ELO
    getKFactor(elo) {
        if (elo < 1200) return 30;
        if (elo < 2000) return 25;
        if (elo < 2400) return 20;
        return 15;
    }
    
    // Affiche la notification de changement de rang
    showRankChangeNotification(oldRank, newRank, isPromotion) {
        const notification = document.createElement('div');
        notification.className = `rank-change-notification ${isPromotion ? 'promotion' : 'demotion'}`;
        
        notification.innerHTML = `
            <div class="rank-change-overlay"></div>
            <div class="rank-change-content">
                <h2>${isPromotion ? '🎉 PROMOTION!' : '😞 RÉTROGRADATION'}</h2>
                <div class="rank-transition">
                    <div class="rank-display old-rank">
                        <div class="rank-icon" style="color: ${oldRank.color}">${oldRank.icon}</div>
                        <div class="rank-name">${oldRank.name}</div>
                    </div>
                    <div class="transition-arrow">${isPromotion ? '↗️' : '↘️'}</div>
                    <div class="rank-display new-rank">
                        <div class="rank-icon" style="color: ${newRank.color}">${newRank.icon}</div>
                        <div class="rank-name">${newRank.name}</div>
                    </div>
                </div>
                <div class="rank-message">
                    ${isPromotion ? 
                        'Félicitations pour votre promotion ! Continuez sur cette lancée !' : 
                        'Ne vous découragez pas ! Vous reviendrez plus fort !'}
                </div>
                <button class="btn btn-primary" onclick="this.closest('.rank-change-notification').remove()">
                    Continuer
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Suppression automatique après 8 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }
        }, 8000);
    }
    
    // Interface utilisateur
    showRankedInterface() {
        const rankedInterface = document.createElement('div');
        rankedInterface.id = 'rankedInterface';
        rankedInterface.className = 'ranked-interface';
        
        rankedInterface.innerHTML = `
            <div class="ranked-header">
                <h2>🏆 MODE CLASSÉ</h2>
                <div class="season-info">
                    <span class="season-name">${this.currentSeason.name}</span>
                    <span class="season-end">Se termine le ${this.currentSeason.endDate.toLocaleDateString('fr-FR')}</span>
                </div>
            </div>
            
            <div class="ranked-content">
                <div class="player-rank-card">
                    <div class="rank-display-large">
                        <div class="rank-icon" style="color: ${this.playerRanked.rank.color}">
                            ${this.playerRanked.rank.icon}
                        </div>
                        <div class="rank-info">
                            <h3>${this.playerRanked.rank.name}</h3>
                            <div class="elo-display">
                                <span class="current-elo">${this.playerRanked.elo}</span>
                                <span class="elo-label">ELO</span>
                            </div>
                            <div class="rank-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${this.calculateRankProgress()}%"></div>
                                </div>
                                <span class="progress-text">${this.getRankProgressText()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rank-stats">
                        <div class="stat-item">
                            <span class="stat-value">${this.playerRanked.wins}W / ${this.playerRanked.losses}L</span>
                            <span class="stat-label">Victoires / Défaites</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.playerRanked.winrate.toFixed(1)}%</span>
                            <span class="stat-label">Taux de Victoire</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.playerRanked.peak_rank.name}</span>
                            <span class="stat-label">Meilleur Rang</span>
                        </div>
                    </div>
                </div>
                
                <div class="ranked-actions">
                    <button id="findRankedMatch" class="btn btn-primary btn-large">
                        <i class="icon">🎯</i>
                        <span>RECHERCHER UN MATCH</span>
                        <div class="btn-subtitle">Compétitif 5v5</div>
                    </button>
                    
                    <div class="queue-options">
                        <button id="mapPreferences" class="btn btn-secondary">
                            <i class="icon">🗺️</i> Préférences de Cartes
                        </button>
                        <button id="viewLeaderboard" class="btn btn-secondary">
                            <i class="icon">🏆</i> Classement
                        </button>
                        <button id="matchHistory" class="btn btn-secondary">
                            <i class="icon">📊</i> Historique
                        </button>
                    </div>
                    
                    ${this.playerRanked.placement_matches < this.eloConfig.placement_matches ? 
                        `<div class="placement-matches-info">
                            <h4>🎯 Matches de Placement</h4>
                            <p>Complétez ${this.eloConfig.placement_matches - this.playerRanked.placement_matches} matches de plus pour obtenir votre rang officiel</p>
                            <div class="placement-progress">
                                <div class="placement-dots">
                                    ${Array.from({length: this.eloConfig.placement_matches}, (_, i) => 
                                        `<div class="placement-dot ${i < this.playerRanked.placement_matches ? 'completed' : ''}"></div>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>` : ''}
                </div>
            </div>
            
            <div class="ranked-footer">
                <button id="backToLobby" class="btn btn-outline">
                    <i class="icon">⬅️</i> Retour
                </button>
            </div>
        `;
        
        // Remplace le contenu de l'écran lobby
        const lobbyScreen = document.getElementById('lobbyScreen');
        lobbyScreen.innerHTML = '';
        lobbyScreen.appendChild(rankedInterface);
        
        this.initializeRankedInterfaceEvents();
    }
    
    // Calcule le progrès vers le prochain rang
    calculateRankProgress() {
        const currentRank = this.playerRanked.rank;
        const nextRankIndex = this.ranks.findIndex(r => r.name === currentRank.name) + 1;
        
        if (nextRankIndex >= this.ranks.length) return 100;
        
        const nextRank = this.ranks[nextRankIndex];
        const currentELO = this.playerRanked.elo;
        const currentRankELO = currentRank.elo;
        const nextRankELO = nextRank.elo;
        
        const progress = ((currentELO - currentRankELO) / (nextRankELO - currentRankELO)) * 100;
        return Math.max(0, Math.min(100, progress));
    }
    
    // Obtient le texte de progression
    getRankProgressText() {
        const nextRankIndex = this.ranks.findIndex(r => r.name === this.playerRanked.rank.name) + 1;
        
        if (nextRankIndex >= this.ranks.length) {
            return 'Rang Maximum Atteint';
        }
        
        const nextRank = this.ranks[nextRankIndex];
        const eloNeeded = nextRank.elo - this.playerRanked.elo;
        
        return eloNeeded > 0 ? `${eloNeeded} ELO pour ${nextRank.name}` : `Prêt pour ${nextRank.name}`;
    }
    
    // Initialise les événements de l'interface ranked
    initializeRankedInterfaceEvents() {
        document.getElementById('findRankedMatch').addEventListener('click', () => {
            this.joinRankedQueue();
        });
        
        document.getElementById('mapPreferences').addEventListener('click', () => {
            window.rankedModals.showMapPreferencesModal();
        });
        
        document.getElementById('viewLeaderboard').addEventListener('click', () => {
            window.rankedModals.showLeaderboardModal();
        });
        
        document.getElementById('matchHistory').addEventListener('click', () => {
            window.rankedModals.showMatchHistoryModal();
        });
        
        document.getElementById('backToLobby').addEventListener('click', () => {
            document.getElementById('rankedInterface').remove();
            this.showNormalLobbyInterface();
        });
    }
    
    // Rejoint la file d'attente ranked (version améliorée)
    async joinRankedQueue(gameMode = 'competitive') {
        if (!firebaseManager.currentUser) {
            throw new Error('Vous devez être connecté pour jouer en ranked');
        }
        
        // Vérifie les conditions pour jouer en ranked
        if (this.playerRanked.placement_matches < this.eloConfig.placement_matches && 
            this.playerRanked.elo === this.eloConfig.initial_elo) {
            // Premier placement match
            window.rankedModals.showPlacementMatchInfo();
        }
        
        try {
            // Ajoute à la queue Firebase
            await firebaseManager.joinRankedQueue(this.playerRanked);
            
            // Affiche l'interface de queue
            window.rankedModals.showRankedQueue();
            
            // Écoute les notifications de match
            this.listenForMatchNotifications();
            
            console.log('🎯 Ajouté à la file d\'attente ranked');
            
            // Simule la recherche pour la démo (à supprimer en production)
            setTimeout(() => {
                this.simulateMatchFound();
            }, Math.random() * 30000 + 10000); // 10-40 secondes
            
        } catch (error) {
            if (window.menuManager) {
                window.menuManager.showNotification('❌ Erreur lors de la connexion à la queue', 'error', 3000);
            }
            console.error('❌ Erreur queue ranked:', error);
        }
    }
    
    // Écoute les notifications de match
    listenForMatchNotifications() {
        firebaseManager.listenToMatchNotifications((notification) => {
            if (notification.type === 'match_found') {
                this.handleMatchFound(notification);
            } else if (notification.type === 'match_starting') {
                this.handleMatchStarting(notification);
            }
        });
    }
    
    // Gère la notification de match trouvé
    handleMatchFound(notification) {
        // Cache la queue
        window.rankedModals.hideRankedQueue();
        
        // Affiche le modal d'acceptation
        this.showMatchAcceptModal(notification.matchId);
    }
    
    // Affiche le modal d'acceptation de match
    showMatchAcceptModal(matchId) {
        const modal = document.createElement('div');
        modal.className = 'match-accept-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🎯 MATCH TROUVÉ !</h2>
                    <div class="accept-timer">
                        <div class="timer-circle">
                            <span id="acceptTimer">30</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="match-info">
                        <div class="match-detail">
                            <span class="label">Mode:</span>
                            <span class="value">Compétitif 5v5</span>
                        </div>
                        <div class="match-detail">
                            <span class="label">ELO Moyen:</span>
                            <span class="value">~${this.playerRanked.elo} ±50</span>
                        </div>
                        <div class="match-detail">
                            <span class="label">Temps estimé:</span>
                            <span class="value">45-60 minutes</span>
                        </div>
                    </div>
                    
                    <div class="accept-warning">
                        <p>⚠️ Si vous refusez ou ne répondez pas, vous recevrez une pénalité de temps d'attente.</p>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button id="declineMatch" class="btn btn-danger">
                        ❌ Refuser
                    </button>
                    <button id="acceptMatch" class="btn btn-primary btn-large">
                        ✅ ACCEPTER
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Démarre le timer de 30 secondes
        let timeLeft = 30;
        const timerInterval = setInterval(() => {
            timeLeft--;
            const timerElement = document.getElementById('acceptTimer');
            if (timerElement) {
                timerElement.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                this.handleMatchTimeout(matchId);
                modal.remove();
            }
        }, 1000);
        
        // Événements
        document.getElementById('acceptMatch').addEventListener('click', () => {
            clearInterval(timerInterval);
            this.acceptMatch(matchId);
            modal.remove();
        });
        
        document.getElementById('declineMatch').addEventListener('click', () => {
            clearInterval(timerInterval);
            this.declineMatch(matchId);
            modal.remove();
        });
    }
    
    // Accepte un match
    async acceptMatch(matchId) {
        try {
            await firebaseManager.acceptRankedMatch(matchId);
            
            // Affiche l'attente des autres joueurs
            this.showWaitingForPlayers(matchId);
            
        } catch (error) {
            if (window.menuManager) {
                window.menuManager.showNotification('❌ Erreur lors de l\'acceptation', 'error', 3000);
            }
            console.error('❌ Erreur acceptation match:', error);
        }
    }
    
    // Refuse un match
    async declineMatch(matchId) {
        try {
            await firebaseManager.declineRankedMatch(matchId);
            
            if (window.menuManager) {
                window.menuManager.showNotification('🚫 Match refusé', 'info', 2000);
            }
            
            // Applique une pénalité de queue
            this.applyQueuePenalty('decline');
            
        } catch (error) {
            console.error('❌ Erreur refus match:', error);
        }
    }
    
    // Gère le timeout de match
    handleMatchTimeout(matchId) {
        firebaseManager.declineRankedMatch(matchId);
        
        if (window.menuManager) {
            window.menuManager.showNotification('⏰ Temps d\'acceptation écoulé', 'warning', 3000);
        }
        
        // Applique une pénalité plus sévère
        this.applyQueuePenalty('timeout');
    }
    
    // Applique une pénalité de queue
    applyQueuePenalty(reason) {
        const penalties = {
            'decline': 5 * 60 * 1000,  // 5 minutes
            'timeout': 10 * 60 * 1000, // 10 minutes
            'abandon': 30 * 60 * 1000  // 30 minutes
        };
        
        const penaltyTime = penalties[reason] || penalties.decline;
        const endTime = Date.now() + penaltyTime;
        
        // Sauvegarde la pénalité
        localStorage.setItem('sio-shooter-queue-penalty', endTime.toString());
        
        const minutes = Math.ceil(penaltyTime / 60000);
        if (window.menuManager) {
            window.menuManager.showNotification(
                `⏰ Pénalité de ${minutes} minutes appliquée`, 
                'warning', 
                5000
            );
        }
    }
    
    // Vérifie s'il y a une pénalité active
    hasActivePenalty() {
        const penaltyEnd = localStorage.getItem('sio-shooter-queue-penalty');
        if (!penaltyEnd) return false;
        
        const endTime = parseInt(penaltyEnd);
        if (Date.now() < endTime) {
            const remainingMinutes = Math.ceil((endTime - Date.now()) / 60000);
            return remainingMinutes;
        }
        
        // Supprime la pénalité expirée
        localStorage.removeItem('sio-shooter-queue-penalty');
        return false;
    }
    
    // Affiche l'attente des autres joueurs
    showWaitingForPlayers(matchId) {
        const modal = document.createElement('div');
        modal.className = 'waiting-players-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>⏳ EN ATTENTE DES AUTRES JOUEURS</h2>
                </div>
                
                <div class="modal-body">
                    <div class="players-status">
                        <div class="status-grid">
                            ${Array.from({length: 10}, (_, i) => `
                                <div class="player-status" id="player${i}">
                                    <div class="status-indicator pending"></div>
                                    <span>Joueur ${i + 1}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="waiting-info">
                        <p>Tous les joueurs doivent accepter le match pour qu'il commence.</p>
                        <p>Si un joueur refuse, une nouvelle recherche sera lancée.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Simule l'acceptation progressive des joueurs
        this.simulatePlayerAcceptance();
    }
    
    // Simule l'acceptation des joueurs (pour la démo)
    simulatePlayerAcceptance() {
        const players = document.querySelectorAll('.player-status');
        let acceptedCount = 1; // Le joueur local a déjà accepté
        
        // Marque le joueur local comme accepté
        if (players[0]) {
            players[0].querySelector('.status-indicator').className = 'status-indicator accepted';
            players[0].querySelector('span').textContent = firebaseManager.currentUser?.name || 'Vous';
        }
        
        const acceptInterval = setInterval(() => {
            if (acceptedCount >= 10) {
                clearInterval(acceptInterval);
                this.handleAllPlayersAccepted();
                return;
            }
            
            // Acceptation aléatoire avec 90% de chance
            if (Math.random() > 0.1) {
                const player = players[acceptedCount];
                if (player) {
                    player.querySelector('.status-indicator').className = 'status-indicator accepted';
                    player.querySelector('span').textContent = `Joueur ${acceptedCount + 1}`;
                }
                acceptedCount++;
            } else {
                // 10% de chance qu'un joueur refuse
                this.handlePlayerDeclined();
                clearInterval(acceptInterval);
                return;
            }
        }, Math.random() * 2000 + 1000); // 1-3 secondes entre chaque acceptation
    }
    
    // Gère le cas où tous les joueurs ont accepté
    handleAllPlayersAccepted() {
        // Cache le modal d'attente
        const modal = document.querySelector('.waiting-players-modal');
        if (modal) {
            modal.remove();
        }
        
        // Affiche la notification de démarrage
        if (window.menuManager) {
            window.menuManager.showNotification('🎮 Tous les joueurs ont accepté ! Démarrage du match...', 'success', 3000);
        }
        
        // Simule le démarrage du match
        setTimeout(() => {
            this.startRankedMatch();
        }, 3000);
    }
    
    // Gère le cas où un joueur a refusé
    handlePlayerDeclined() {
        const modal = document.querySelector('.waiting-players-modal');
        if (modal) {
            modal.remove();
        }
        
        if (window.menuManager) {
            window.menuManager.showNotification('❌ Un joueur a refusé le match. Nouvelle recherche...', 'warning', 3000);
        }
        
        // Relance automatiquement la recherche
        setTimeout(() => {
            this.joinRankedQueue();
        }, 2000);
    }
    
    // Démarre un match ranked
    startRankedMatch() {
        // Pour cette démo, on crée un lobby normal mais marqué comme ranked
        const settings = {
            gameMode: 'competitive',
            teamSize: 5,
            maxPlayers: 10,
            roundTime: 115,
            maxRounds: 30,
            isPrivate: false,
            enableBots: true,
            botDifficulty: 'hard', // Bots plus difficiles en ranked
            autoBalance: true,
            fillSlots: false, // Pas de remplissage en ranked
            mapName: this.selectRankedMap(),
            isRanked: true // Marqueur spécial
        };
        
        firebaseManager.createLobby(settings).then(lobbyCode => {
            // Navigue vers le lobby
            if (window.menuManager) {
                window.menuManager.joinLobbyRoom(lobbyCode);
            }
        }).catch(error => {
            console.error('❌ Erreur création lobby ranked:', error);
            if (window.menuManager) {
                window.menuManager.showNotification('❌ Erreur lors du démarrage du match', 'error', 3000);
            }
        });
    }
    
    // Sélectionne une carte pour le ranked
    selectRankedMap() {
        const availableMaps = this.rankedMaps.filter(map => 
            !this.playerRanked.banned_maps?.includes(map)
        );
        
        // Priorise les cartes préférées
        const preferredMaps = availableMaps.filter(map => 
            this.playerRanked.preferred_maps?.includes(map)
        );
        
        if (preferredMaps.length > 0) {
            return preferredMaps[Math.floor(Math.random() * preferredMaps.length)];
        }
        
        return availableMaps[Math.floor(Math.random() * availableMaps.length)] || 'de_academy';
    }
    
    // Simule la découverte d'un match (pour la démo)
    simulateMatchFound() {
        const notification = {
            type: 'match_found',
            matchId: 'match_' + Date.now(),
            timestamp: Date.now(),
            message: 'Match trouvé ! Cliquez pour accepter.'
        };
        
        this.handleMatchFound(notification);
    }
    
    // Quitte la file d'attente ranked
    async leaveRankedQueue() {
        try {
            await firebaseManager.leaveRankedQueue();
            
            // Cache les modals de queue
            window.rankedModals.hideRankedQueue();
            
            console.log('🚪 Quitté la file d\'attente ranked');
        } catch (error) {
            console.error('❌ Erreur sortie queue:', error);
        }
    }
    
    // Affiche l'interface normale du lobby
    showNormalLobbyInterface() {
        // Recharge l'interface normale - à implémenter selon votre logique existante
        if (window.menuManager) {
            window.menuManager.refreshLobbies();
        }
    }
    
    // Utilitaires
    generateMatchId() {
        return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateLobbyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    getPlayerRankedData(playerId) {
        // Charge depuis Firebase ou localStorage selon le joueur
        if (playerId === firebaseManager.currentUser?.id) {
            return this.playerRanked;
        }
        
        // Pour les autres joueurs, utiliser Firebase
        // return await database.ref(`player_ranked/${playerId}`).once('value').val();
        return null; // Simplifié pour cette démo
    }
    
    // Services de maintenance
    startRankDecayService() {
        // Vérifie la dégradation des rangs pour inactivité
        setInterval(() => {
            this.checkRankDecay();
        }, 24 * 60 * 60 * 1000); // Une fois par jour
    }
    
    checkRankDecay() {
        const daysSinceLastPlayed = (Date.now() - this.playerRanked.last_played) / (24 * 60 * 60 * 1000);
        
        if (daysSinceLastPlayed > this.eloConfig.rank_decay_days && this.playerRanked.elo > 2000) {
            const decayAmount = Math.floor(daysSinceLastPlayed - this.eloConfig.rank_decay_days) * 5;
            this.playerRanked.elo = Math.max(2000, this.playerRanked.elo - decayAmount);
            
            this.savePlayerRankedData();
            
            if (decayAmount > 0) {
                this.showRankDecayNotification(decayAmount);
            }
        }
    }
    
    showRankDecayNotification(decayAmount) {
        if (window.menuManager) {
            window.menuManager.showNotification(
                `⏰ Votre rang a diminué de ${decayAmount} ELO pour inactivité`, 
                'warning', 
                5000
            );
        }
    }
    
    updateSeasonStatus() {
        const now = Date.now();
        const seasonEnd = this.currentSeason.endDate.getTime();
        const timeLeft = seasonEnd - now;
        
        if (timeLeft < 7 * 24 * 60 * 60 * 1000) { // Moins d'une semaine
            this.showSeasonEndingNotification(timeLeft);
        }
    }
    
    showSeasonEndingNotification(timeLeft) {
        const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
        
        if (window.menuManager) {
            window.menuManager.showNotification(
                `⏰ La saison se termine dans ${days} jour${days > 1 ? 's' : ''} !`, 
                'info', 
                5000
            );
        }
    }
    
    loadLeaderboard() {
        // Charge le leaderboard depuis Firebase
        database.ref('leaderboard').orderByChild('elo').limitToLast(100).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    this.leaderboard = Object.values(snapshot.val())
                        .sort((a, b) => b.elo - a.elo);
                }
            });
    }
    
    updateLeaderboard(playerId, playerData) {
        // Met à jour le leaderboard
        database.ref(`leaderboard/${playerId}`).update({
            name: playerData.name || firebaseManager.currentUser?.name || 'Joueur',
            elo: playerData.elo,
            rank: playerData.rank,
            wins: playerData.wins,
            losses: playerData.losses,
            lastPlayed: playerData.last_played
        });
    }
}

// Export pour utilisation globale
window.rankedSystem = new RankedSystem();