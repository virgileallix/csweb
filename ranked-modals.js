// Extensions pour les modals du système ranked
class RankedModals {
    constructor() {
        this.rankedSystem = window.rankedSystem;
    }
    
    // Modal des préférences de cartes
    showMapPreferencesModal() {
        const modal = document.createElement('div');
        modal.className = 'map-preferences-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🗺️ Préférences de Cartes</h2>
                    <button class="modal-close" onclick="this.closest('.map-preferences-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="map-preferences-info">
                        <p>Sélectionnez vos cartes préférées et celles que vous souhaitez éviter en ranked.</p>
                        <div class="preference-legend">
                            <span class="legend-item"><span class="pref-indicator liked">💚</span> Préférée</span>
                            <span class="legend-item"><span class="pref-indicator neutral">⚪</span> Neutre</span>
                            <span class="legend-item"><span class="pref-indicator banned">❌</span> Éviter</span>
                        </div>
                    </div>
                    
                    <div class="maps-grid">
                        ${this.generateRankedMapsGrid()}
                    </div>
                    
                    <div class="map-stats">
                        <h3>📊 Vos Statistiques par Carte</h3>
                        <div class="stats-grid">
                            ${this.generateMapStats()}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.map-preferences-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="rankedModals.saveMapPreferences()">
                        💾 Sauvegarder
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.initializeMapPreferencesEvents();
    }
    
    // Génère la grille des cartes ranked
    generateRankedMapsGrid() {
        const rankedMaps = [
            { id: 'de_academy', name: 'SIO Academy', icon: '🏢', difficulty: 'Facile' },
            { id: 'de_mirage_sio', name: 'Mirage SIO', icon: '🏰', difficulty: 'Moyen' },
            { id: 'de_inferno_sio', name: 'Inferno SIO', icon: '🇮🇹', difficulty: 'Difficile' },
            { id: 'de_cache_sio', name: 'Cache SIO', icon: '☢️', difficulty: 'Moyen' },
            { id: 'de_overpass_sio', name: 'Overpass SIO', icon: '🌉', difficulty: 'Difficile' },
            { id: 'de_train_sio', name: 'Train SIO', icon: '🚂', difficulty: 'Moyen' },
            { id: 'de_vertigo_sio', name: 'Vertigo SIO', icon: '🏗️', difficulty: 'Difficile' }
        ];
        
        return rankedMaps.map(map => {
            const currentPref = this.rankedSystem.playerRanked.preferred_maps?.includes(map.id) ? 'liked' :
                               this.rankedSystem.playerRanked.banned_maps?.includes(map.id) ? 'banned' : 'neutral';
            
            return `
                <div class="map-card ${currentPref}" data-map="${map.id}" data-preference="${currentPref}">
                    <div class="map-preview">
                        <div class="map-icon">${map.icon}</div>
                        <div class="map-overlay">
                            <div class="preference-buttons">
                                <button class="pref-btn like ${currentPref === 'liked' ? 'active' : ''}" 
                                        data-pref="liked" title="Préférée">💚</button>
                                <button class="pref-btn neutral ${currentPref === 'neutral' ? 'active' : ''}" 
                                        data-pref="neutral" title="Neutre">⚪</button>
                                <button class="pref-btn ban ${currentPref === 'banned' ? 'active' : ''}" 
                                        data-pref="banned" title="Éviter">❌</button>
                            </div>
                        </div>
                    </div>
                    <div class="map-info">
                        <h3>${map.name}</h3>
                        <div class="map-difficulty ${map.difficulty.toLowerCase()}">${map.difficulty}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Génère les statistiques par carte
    generateMapStats() {
        const mapStats = this.getPlayerMapStats();
        
        return Object.entries(mapStats).map(([mapId, stats]) => `
            <div class="map-stat-item">
                <div class="map-name">${this.getMapDisplayName(mapId)}</div>
                <div class="stat-bars">
                    <div class="stat-bar">
                        <span class="stat-label">Victoires: ${stats.wins}</span>
                        <div class="bar-fill" style="width: ${(stats.wins / (stats.wins + stats.losses)) * 100 || 0}%"></div>
                    </div>
                    <div class="stat-value">${stats.winrate.toFixed(1)}%</div>
                </div>
                <div class="games-played">${stats.wins + stats.losses} parties</div>
            </div>
        `).join('');
    }
    
    // Obtient les stats du joueur par carte
    getPlayerMapStats() {
        const defaultStats = { wins: 0, losses: 0, winrate: 0 };
        const maps = ['de_academy', 'de_mirage_sio', 'de_inferno_sio', 'de_cache_sio', 
                     'de_overpass_sio', 'de_train_sio', 'de_vertigo_sio'];
        
        const stats = {};
        maps.forEach(mapId => {
            // Simule des stats aléatoires pour la démo
            const wins = Math.floor(Math.random() * 20);
            const losses = Math.floor(Math.random() * 15);
            stats[mapId] = {
                wins: wins,
                losses: losses,
                winrate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
            };
        });
        
        return stats;
    }
    
    // Obtient le nom d'affichage d'une carte
    getMapDisplayName(mapId) {
        const names = {
            'de_academy': 'SIO Academy',
            'de_mirage_sio': 'Mirage SIO',
            'de_inferno_sio': 'Inferno SIO',
            'de_cache_sio': 'Cache SIO',
            'de_overpass_sio': 'Overpass SIO',
            'de_train_sio': 'Train SIO',
            'de_vertigo_sio': 'Vertigo SIO'
        };
        return names[mapId] || mapId;
    }
    
    // Initialise les événements des préférences de cartes
    initializeMapPreferencesEvents() {
        document.querySelectorAll('.pref-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const mapCard = btn.closest('.map-card');
                const mapId = mapCard.dataset.map;
                const preference = btn.dataset.pref;
                
                // Met à jour l'UI
                mapCard.querySelectorAll('.pref-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                mapCard.className = `map-card ${preference}`;
                mapCard.dataset.preference = preference;
            });
        });
    }
    
    // Sauvegarde les préférences de cartes
    saveMapPreferences() {
        const preferences = {
            preferred_maps: [],
            banned_maps: []
        };
        
        document.querySelectorAll('.map-card').forEach(card => {
            const mapId = card.dataset.map;
            const pref = card.dataset.preference;
            
            if (pref === 'liked') {
                preferences.preferred_maps.push(mapId);
            } else if (pref === 'banned') {
                preferences.banned_maps.push(mapId);
            }
        });
        
        // Sauvegarde dans le système ranked
        this.rankedSystem.playerRanked.preferred_maps = preferences.preferred_maps;
        this.rankedSystem.playerRanked.banned_maps = preferences.banned_maps;
        this.rankedSystem.savePlayerRankedData();
        
        // Ferme le modal
        document.querySelector('.map-preferences-modal').remove();
        
        // Notification
        if (window.menuManager) {
            window.menuManager.showNotification('💾 Préférences de cartes sauvegardées', 'success', 3000);
        }
    }
    
    // Modal du leaderboard
    showLeaderboardModal() {
        const modal = document.createElement('div');
        modal.className = 'leaderboard-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>🏆 Classement Global</h2>
                    <div class="leaderboard-tabs">
                        <button class="tab-btn active" data-tab="global">Global</button>
                        <button class="tab-btn" data-tab="friends">Amis</button>
                        <button class="tab-btn" data-tab="regional">Région</button>
                    </div>
                    <button class="modal-close" onclick="this.closest('.leaderboard-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="leaderboard-filters">
                        <select id="seasonFilter" class="filter-select">
                            <option value="current">Saison Actuelle</option>
                            <option value="all">Tous les Temps</option>
                        </select>
                        <select id="rankFilter" class="filter-select">
                            <option value="all">Tous les Rangs</option>
                            <option value="challenger">Challenger</option>
                            <option value="grandmaster">Grandmaster</option>
                            <option value="master">Master</option>
                            <option value="diamond">Diamond</option>
                        </select>
                    </div>
                    
                    <div class="leaderboard-content">
                        <div class="tab-content active" data-tab="global">
                            ${this.generateLeaderboard('global')}
                        </div>
                        <div class="tab-content" data-tab="friends">
                            ${this.generateLeaderboard('friends')}
                        </div>
                        <div class="tab-content" data-tab="regional">
                            ${this.generateLeaderboard('regional')}
                        </div>
                    </div>
                    
                    <div class="player-position">
                        <h3>Votre Position</h3>
                        <div class="current-player-rank">
                            <span class="rank-position">#${Math.floor(Math.random() * 1000) + 100}</span>
                            <div class="player-info">
                                <span class="player-name">${firebaseManager.currentUser?.name || 'Joueur'}</span>
                                <span class="player-elo">${this.rankedSystem.playerRanked.elo} ELO</span>
                                <span class="player-rank">${this.rankedSystem.playerRanked.rank.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.leaderboard-modal').remove()">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.initializeLeaderboardEvents();
    }
    
    // Génère le leaderboard
    generateLeaderboard(type) {
        // Génère des données factices pour la démo
        const players = this.generateLeaderboardData(type);
        
        return `
            <div class="leaderboard-table">
                <div class="leaderboard-header">
                    <div class="rank-col">Rang</div>
                    <div class="player-col">Joueur</div>
                    <div class="elo-col">ELO</div>
                    <div class="tier-col">Tier</div>
                    <div class="winrate-col">WR</div>
                    <div class="games-col">Parties</div>
                </div>
                <div class="leaderboard-body">
                    ${players.map((player, index) => `
                        <div class="leaderboard-row ${player.isCurrentPlayer ? 'current-player' : ''}">
                            <div class="rank-col">
                                <span class="rank-number">#${index + 1}</span>
                                ${index < 3 ? ['🥇', '🥈', '🥉'][index] : ''}
                            </div>
                            <div class="player-col">
                                <div class="player-avatar">${player.isBot ? '🤖' : '👤'}</div>
                                <span class="player-name">${player.name}</span>
                                ${player.isCurrentPlayer ? '<span class="you-indicator">(Vous)</span>' : ''}
                            </div>
                            <div class="elo-col">
                                <span class="elo-value">${player.elo}</span>
                                <span class="elo-change ${player.eloChange >= 0 ? 'positive' : 'negative'}">
                                    ${player.eloChange >= 0 ? '+' : ''}${player.eloChange}
                                </span>
                            </div>
                            <div class="tier-col">
                                <div class="rank-display">
                                    <span class="rank-icon" style="color: ${player.rank.color}">${player.rank.icon}</span>
                                    <span class="rank-name">${player.rank.name}</span>
                                </div>
                            </div>
                            <div class="winrate-col">${player.winrate}%</div>
                            <div class="games-col">${player.gamesPlayed}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Génère des données de leaderboard factices
    generateLeaderboardData(type) {
        const players = [];
        const currentUserIncluded = Math.random() > 0.7; // 30% de chance d'être dans le top
        
        for (let i = 0; i < 50; i++) {
            const elo = 3500 - (i * (Math.random() * 50 + 30));
            const rank = this.rankedSystem.getRankFromELO(elo);
            const gamesPlayed = Math.floor(Math.random() * 100) + 50;
            const wins = Math.floor(gamesPlayed * (0.4 + Math.random() * 0.4));
            
            players.push({
                name: this.generateRandomPlayerName(),
                elo: Math.round(elo),
                rank: rank,
                winrate: Math.round((wins / gamesPlayed) * 100),
                gamesPlayed: gamesPlayed,
                eloChange: Math.floor((Math.random() - 0.5) * 40),
                isBot: Math.random() > 0.8,
                isCurrentPlayer: currentUserIncluded && i === 25 // Milieu du classement
            });
        }
        
        return players;
    }
    
    // Génère un nom de joueur aléatoire
    generateRandomPlayerName() {
        const prefixes = ['Pro', 'Elite', 'Mega', 'Super', 'Ultra', 'Neo', 'Alpha', 'Beta'];
        const names = ['Gamer', 'Player', 'Shooter', 'Sniper', 'Warrior', 'Hunter', 'Master', 'Legend'];
        const suffixes = ['2025', 'Pro', 'GG', 'YT', 'TTV', '69', '420', 'XD'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const suffix = Math.random() > 0.5 ? suffixes[Math.floor(Math.random() * suffixes.length)] : '';
        
        return prefix + name + suffix;
    }
    
    // Initialise les événements du leaderboard
    initializeLeaderboardEvents() {
        // Onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                
                // Met à jour les boutons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Met à jour le contenu
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelector(`[data-tab="${tab}"].tab-content`).classList.add('active');
            });
        });
        
        // Filtres
        document.getElementById('seasonFilter').addEventListener('change', () => {
            this.filterLeaderboard();
        });
        
        document.getElementById('rankFilter').addEventListener('change', () => {
            this.filterLeaderboard();
        });
    }
    
    // Filtre le leaderboard
    filterLeaderboard() {
        // Recharge le leaderboard avec les nouveaux filtres
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const content = document.querySelector(`[data-tab="${activeTab}"].tab-content`);
        content.innerHTML = this.generateLeaderboard(activeTab);
    }
    
    // Modal de l'historique des matchs
    showMatchHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'match-history-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>📊 Historique des Matchs</h2>
                    <div class="history-stats">
                        <div class="stat-item">
                            <span class="stat-value">${this.rankedSystem.playerRanked.wins + this.rankedSystem.playerRanked.losses}</span>
                            <span class="stat-label">Parties Jouées</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.rankedSystem.playerRanked.winrate.toFixed(1)}%</span>
                            <span class="stat-label">Win Rate</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.calculateAverageELOChange()}</span>
                            <span class="stat-label">ELO Moyen/Match</span>
                        </div>
                    </div>
                    <button class="modal-close" onclick="this.closest('.match-history-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="history-filters">
                        <select id="historyTypeFilter" class="filter-select">
                            <option value="all">Tous les Matchs</option>
                            <option value="competitive">Compétitif</option>
                            <option value="placement">Placement</option>
                        </select>
                        <select id="historyResultFilter" class="filter-select">
                            <option value="all">Tous les Résultats</option>
                            <option value="wins">Victoires</option>
                            <option value="losses">Défaites</option>
                            <option value="mvp">MVP</option>
                        </select>
                    </div>
                    
                    <div class="elo-graph">
                        <h3>📈 Évolution de l'ELO</h3>
                        <div class="graph-container">
                            ${this.generateELOGraph()}
                        </div>
                    </div>
                    
                    <div class="match-list">
                        <h3>Derniers Matchs</h3>
                        ${this.generateMatchHistory()}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.exportMatchHistory()">
                        📥 Exporter
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.match-history-modal').remove()">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.initializeMatchHistoryEvents();
    }
    
    // Calcule le changement d'ELO moyen
    calculateAverageELOChange() {
        const history = this.rankedSystem.playerRanked.match_history || [];
        if (history.length === 0) return '+0';
        
        const average = history.reduce((sum, match) => sum + match.eloChange, 0) / history.length;
        return (average >= 0 ? '+' : '') + Math.round(average);
    }
    
    // Génère le graphique d'ELO
    generateELOGraph() {
        const history = this.rankedSystem.playerRanked.match_history || [];
        if (history.length === 0) {
            return '<div class="no-data">Aucune donnée disponible</div>';
        }
        
        // Génère un graphique SVG simple
        const maxELO = Math.max(...history.map(m => m.newELO));
        const minELO = Math.min(...history.map(m => m.newELO));
        const range = maxELO - minELO || 100;
        
        const points = history.slice(-20).reverse().map((match, index) => {
            const x = (index / 19) * 100;
            const y = 100 - ((match.newELO - minELO) / range) * 100;
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <svg class="elo-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="eloGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:#4CAF50;stop-opacity:0.1" />
                    </linearGradient>
                </defs>
                <polyline points="${points}" fill="none" stroke="#4CAF50" stroke-width="0.5"/>
                <polygon points="${points} 100,100 0,100" fill="url(#eloGradient)"/>
            </svg>
            <div class="graph-labels">
                <span class="min-elo">${minELO}</span>
                <span class="max-elo">${maxELO}</span>
            </div>
        `;
    }
    
    // Génère l'historique des matchs
    generateMatchHistory() {
        const history = this.rankedSystem.playerRanked.match_history || [];
        
        if (history.length === 0) {
            return '<div class="no-matches">Aucun match joué en ranked</div>';
        }
        
        return history.slice(0, 20).map(match => {
            const date = new Date(match.date);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="match-item ${match.won ? 'victory' : 'defeat'}">
                    <div class="match-result">
                        <div class="result-indicator ${match.won ? 'win' : 'loss'}">
                            ${match.won ? '✅' : '❌'}
                        </div>
                        <div class="match-type">Compétitif</div>
                    </div>
                    
                    <div class="match-details">
                        <div class="match-map">
                            <span class="map-name">${this.getMapDisplayName('de_academy')}</span>
                            <span class="match-duration">45:23</span>
                        </div>
                        <div class="match-stats">
                            <span>K: ${match.stats?.kills || Math.floor(Math.random() * 30)}</span>
                            <span>D: ${match.stats?.deaths || Math.floor(Math.random() * 25)}</span>
                            <span>A: ${match.stats?.assists || Math.floor(Math.random() * 15)}</span>
                            ${match.mvp ? '<span class="mvp-badge">⭐ MVP</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="match-elo">
                        <div class="elo-change ${match.eloChange >= 0 ? 'positive' : 'negative'}">
                            ${match.eloChange >= 0 ? '+' : ''}${match.eloChange}
                        </div>
                        <div class="final-elo">${match.newELO} ELO</div>
                    </div>
                    
                    <div class="match-time">
                        ${timeAgo}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Obtient le temps écoulé depuis une date
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Il y a ${minutes} min`;
        return 'À l\'instant';
    }
    
    // Initialise les événements de l'historique
    initializeMatchHistoryEvents() {
        document.getElementById('historyTypeFilter').addEventListener('change', () => {
            this.filterMatchHistory();
        });
        
        document.getElementById('historyResultFilter').addEventListener('change', () => {
            this.filterMatchHistory();
        });
    }
    
    // Filtre l'historique des matchs
    filterMatchHistory() {
        // Recharge l'historique avec les nouveaux filtres
        const matchList = document.querySelector('.match-list');
        matchList.innerHTML = '<h3>Derniers Matchs</h3>' + this.generateMatchHistory();
    }
    
    // Exporte l'historique des matchs
    exportMatchHistory() {
        const history = this.rankedSystem.playerRanked.match_history || [];
        const csvContent = this.convertToCSV(history);
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sio-shooter-match-history-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        if (window.menuManager) {
            window.menuManager.showNotification('📥 Historique exporté avec succès', 'success', 3000);
        }
    }
    
    // Convertit l'historique en CSV
    convertToCSV(data) {
        const headers = ['Date', 'Résultat', 'ELO Change', 'Nouvel ELO', 'MVP', 'Kills', 'Deaths', 'Assists'];
        const csvRows = [headers.join(',')];
        
        data.forEach(match => {
            const row = [
                new Date(match.date).toLocaleDateString('fr-FR'),
                match.won ? 'Victoire' : 'Défaite',
                match.eloChange,
                match.newELO,
                match.mvp ? 'Oui' : 'Non',
                match.stats?.kills || 0,
                match.stats?.deaths || 0,
                match.stats?.assists || 0
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    // Modal d'information sur les placements
    showPlacementMatchInfo() {
        const modal = document.createElement('div');
        modal.className = 'placement-info-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🎯 Matchs de Placement</h2>
                    <button class="modal-close" onclick="this.closest('.placement-info-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="placement-explanation">
                        <h3>Comment fonctionnent les matchs de placement ?</h3>
                        <p>Les matchs de placement déterminent votre rang initial en mode classé. Voici ce que vous devez savoir :</p>
                        
                        <div class="placement-features">
                            <div class="feature-item">
                                <div class="feature-icon">🎮</div>
                                <div class="feature-text">
                                    <h4>10 Matchs Requis</h4>
                                    <p>Vous devez terminer 10 matchs de placement pour obtenir votre rang officiel.</p>
                                </div>
                            </div>
                            
                            <div class="feature-item">
                                <div class="feature-icon">📈</div>
                                <div class="feature-text">
                                    <h4>Impact Plus Important</h4>
                                    <p>Vos performances ont un impact plus important sur votre ELO pendant les placements.</p>
                                </div>
                            </div>
                            
                            <div class="feature-item">
                                <div class="feature-icon">⚖️</div>
                                <div class="feature-text">
                                    <h4>Matchmaking Équilibré</h4>
                                    <p>Vous serez confronté à des joueurs de différents niveaux pour évaluer votre niveau.</p>
                                </div>
                            </div>
                            
                            <div class="feature-item">
                                <div class="feature-icon">🏆</div>
                                <div class="feature-text">
                                    <h4>Rang Basé sur les Performances</h4>
                                    <p>Votre rang final dépendra de vos victoires ET de vos performances individuelles.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="placement-tips">
                            <h4>💡 Conseils pour les Placements</h4>
                            <ul>
                                <li>Concentrez-vous sur le jeu d'équipe et la communication</li>
                                <li>Visez la victoire plutôt que les statistiques individuelles</li>
                                <li>Restez positif même en cas de défaite</li>
                                <li>Apprenez de chaque match pour vous améliorer</li>
                            </ul>
                        </div>
                        
                        <div class="current-progress">
                            <h4>🎯 Votre Progression</h4>
                            <div class="placement-progress-bar">
                                <div class="progress-fill" style="width: ${(this.rankedSystem.playerRanked.placement_matches / 10) * 100}%"></div>
                                <span class="progress-text">
                                    ${this.rankedSystem.playerRanked.placement_matches} / 10 matchs terminés
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.placement-info-modal').remove()">
                        Compris ! Commencer les Placements
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Modal de file d'attente ranked
    showRankedQueue() {
        const queueModal = document.createElement('div');
        queueModal.className = 'ranked-queue-modal';
        queueModal.innerHTML = `
            <div class="queue-overlay">
                <div class="queue-content">
                    <div class="queue-header">
                        <h2>🎯 RECHERCHE RANKED</h2>
                        <div class="queue-rank-info">
                            <span class="rank-icon" style="color: ${this.rankedSystem.playerRanked.rank.color}">
                                ${this.rankedSystem.playerRanked.rank.icon}
                            </span>
                            <span class="rank-name">${this.rankedSystem.playerRanked.rank.name}</span>
                            <span class="elo-value">${this.rankedSystem.playerRanked.elo} ELO</span>
                        </div>
                    </div>
                    
                    <div class="queue-animation">
                        <div class="search-radar">
                            <div class="radar-sweep"></div>
                            <div class="radar-blips">
                                <div class="blip blip-1"></div>
                                <div class="blip blip-2"></div>
                                <div class="blip blip-3"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="queue-info">
                        <div class="queue-time">
                            <span class="time-label">Temps d'attente:</span>
                            <span id="rankedQueueTime" class="time-value">00:00</span>
                        </div>
                        
                        <div class="queue-stats">
                            <div class="stat-item">
                                <span class="stat-label">Joueurs en recherche:</span>
                                <span class="stat-value">~${Math.floor(Math.random() * 30) + 10}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Temps estimé:</span>
                                <span class="stat-value">~3 min</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Fourchette ELO:</span>
                                <span class="stat-value">±200</span>
                            </div>
                        </div>
                        
                        <div class="queue-tips">
                            <h4>⚡ Pendant l'attente :</h4>
                            <ul>
                                <li>Vérifiez votre équipement audio</li>
                                <li>Préparez votre stratégie mentalement</li>
                                <li>Restez concentré et détendu</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="queue-actions">
                        <button id="cancelRankedQueue" class="btn btn-danger">
                            <i class="icon">❌</i> Annuler la Recherche
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(queueModal);
        
        // Démarre le timer
        this.startRankedQueueTimer();
        
        // Événement d'annulation
        document.getElementById('cancelRankedQueue').addEventListener('click', () => {
            this.cancelRankedQueue();
        });
    }
    
    // Démarre le timer de la queue ranked
    startRankedQueueTimer() {
        this.rankedQueueStartTime = Date.now();
        this.rankedQueueTimer = setInterval(() => {
            const elapsed = Date.now() - this.rankedQueueStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const timerElement = document.getElementById('rankedQueueTime');
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    // Annule la queue ranked
    cancelRankedQueue() {
        if (this.rankedQueueTimer) {
            clearInterval(this.rankedQueueTimer);
            this.rankedQueueTimer = null;
        }
        
        // Supprime le modal
        const modal = document.querySelector('.ranked-queue-modal');
        if (modal) {
            modal.remove();
        }
        
        // Annule la recherche côté serveur
        if (window.rankedSystem) {
            window.rankedSystem.leaveRankedQueue();
        }
        
        if (window.menuManager) {
            window.menuManager.showNotification('🚫 Recherche ranked annulée', 'info', 2000);
        }
    }
    
    // Cache la queue ranked
    hideRankedQueue() {
        if (this.rankedQueueTimer) {
            clearInterval(this.rankedQueueTimer);
            this.rankedQueueTimer = null;
        }
        
        const modal = document.querySelector('.ranked-queue-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Instance globale
window.rankedModals = new RankedModals();