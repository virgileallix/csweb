// Système de chat multijoueur
class ChatSystem {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.maxMessages = 50;
        this.currentInput = '';
        
        this.createChatUI();
        this.setupChatListeners();
        this.setupKeyboardShortcuts();
    }

    createChatUI() {
        // Container principal du chat
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatContainer';
        chatContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 400px;
            height: 300px;
            background: rgba(0,0,0,0.8);
            border-radius: 8px;
            border: 2px solid #333;
            display: flex;
            flex-direction: column;
            z-index: 1500;
            transition: all 0.3s ease;
            transform: translateY(${this.isOpen ? '0' : '250px'});
        `;
        
        // Zone des messages
        const messagesArea = document.createElement('div');
        messagesArea.id = 'chatMessages';
        messagesArea.style.cssText = `
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            font-size: 14px;
            color: white;
            font-family: monospace;
        `;
        
        // Zone de saisie
        const inputArea = document.createElement('div');
        inputArea.id = 'chatInputArea';
        inputArea.style.cssText = `
            padding: 10px;
            border-top: 1px solid #444;
            display: flex;
            gap: 8px;
        `;
        
        // Input de chat
        const chatInput = document.createElement('input');
        chatInput.id = 'chatInput';
        chatInput.type = 'text';
        chatInput.placeholder = 'Tapez votre message... (T pour chat équipe, Y pour tous)';
        chatInput.maxLength = 120;
        chatInput.style.cssText = `
            flex: 1;
            padding: 8px;
            background: rgba(255,255,255,0.1);
            border: 1px solid #555;
            border-radius: 4px;
            color: white;
            outline: none;
        `;
        
        // Bouton envoyer
        const sendButton = document.createElement('button');
        sendButton.id = 'chatSend';
        sendButton.textContent = 'ENVOYER';
        sendButton.style.cssText = `
            padding: 8px 15px;
            background: #4CAF50;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-weight: bold;
        `;
        
        // Assembler l'interface
        inputArea.appendChild(chatInput);
        inputArea.appendChild(sendButton);
        chatContainer.appendChild(messagesArea);
        chatContainer.appendChild(inputArea);
        document.body.appendChild(chatContainer);
        
        // Messages récents (mini-chat)
        const miniChat = document.createElement('div');
        miniChat.id = 'miniChat';
        miniChat.style.cssText = `
            position: absolute;
            bottom: 340px;
            left: 20px;
            width: 400px;
            max-height: 150px;
            overflow: hidden;
            pointer-events: none;
            z-index: 1400;
        `;
        document.body.appendChild(miniChat);
        
        // Indicateur de frappe
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typingIndicator';
        typingIndicator.style.cssText = `
            position: absolute;
            bottom: 325px;
            left: 20px;
            background: rgba(0,0,0,0.7);
            color: #aaa;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
            z-index: 1450;
        `;
        document.body.appendChild(typingIndicator);
    }

    setupChatListeners() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('chatSend');
        
        // Envoyer avec Entrée
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.toggleChat(false);
            }
        });
        
        // Envoyer avec le bouton
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Indicateur de frappe
        let typingTimer;
        chatInput.addEventListener('input', () => {
            this.sendTypingIndicator(true);
            
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                this.sendTypingIndicator(false);
            }, 2000);
        });
        
        // Écouter les messages Firebase
        if (multiplayer && multiplayer.matchId) {
            this.listenForMessages();
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!gameRunning) return;
            
            // T = Chat équipe, Y = Chat global
            if ((e.key === 't' || e.key === 'T') && !this.isOpen) {
                e.preventDefault();
                this.toggleChat(true, 'team');
            } else if ((e.key === 'y' || e.key === 'Y') && !this.isOpen) {
                e.preventDefault();
                this.toggleChat(true, 'all');
            }
        });
    }

    toggleChat(open, mode = 'all') {
        this.isOpen = open;
        this.chatMode = mode;
        
        const chatContainer = document.getElementById('chatContainer');
        const chatInput = document.getElementById('chatInput');
        
        if (open) {
            chatContainer.style.transform = 'translateY(0)';
            chatInput.focus();
            chatInput.placeholder = mode === 'team' ? 
                'Message équipe... (ESC pour fermer)' : 
                'Message global... (ESC pour fermer)';
            
            // Désactiver les contrôles du jeu
            if (gameControls) {
                gameControls.exitPointerLock();
            }
        } else {
            chatContainer.style.transform = 'translateY(250px)';
            chatInput.blur();
            chatInput.value = '';
            
            // Réactiver les contrôles du jeu
            if (gameControls && gameRunning) {
                setTimeout(() => {
                    gameControls.requestPointerLock();
                }, 100);
            }
        }
    }

    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message || !multiplayer || !multiplayer.matchId) return;
        
        try {
            const messageData = {
                playerId: multiplayer.playerId,
                playerName: multiplayer.playerName,
                team: multiplayer.playerTeam,
                message: message,
                mode: this.chatMode, // 'team' ou 'all'
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await database.ref(`matches/${multiplayer.matchId}/chat/${messageId}`).set(messageData);
            
            chatInput.value = '';
            this.toggleChat(false);
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            this.displayMessage('SYSTÈME', 'Erreur envoi du message', 'system', 'error');
        }
    }

    listenForMessages() {
        if (!multiplayer || !multiplayer.matchId) return;
        
        const chatRef = database.ref(`matches/${multiplayer.matchId}/chat`);
        
        chatRef.on('child_added', (snapshot) => {
            const messageData = snapshot.val();
            this.displayMessage(
                messageData.playerName,
                messageData.message,
                messageData.mode,
                this.getMessageType(messageData)
            );
        });
        
        // Écouter les indicateurs de frappe
        const typingRef = database.ref(`matches/${multiplayer.matchId}/typing`);
        typingRef.on('value', (snapshot) => {
            this.updateTypingIndicator(snapshot.val() || {});
        });
    }

    getMessageType(messageData) {
        if (messageData.mode === 'team') {
            return messageData.team === multiplayer.playerTeam ? 'team-own' : 'team-enemy';
        }
        return messageData.playerId === multiplayer.playerId ? 'own' : 'other';
    }

    displayMessage(playerName, message, mode, type) {
        // Ajouter au tableau des messages
        this.messages.push({ playerName, message, mode, type, timestamp: Date.now() });
        
        // Limiter le nombre de messages
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        
        // Afficher dans le chat complet
        this.updateChatDisplay();
        
        // Afficher dans le mini-chat
        this.updateMiniChat(playerName, message, type);
    }

    updateChatDisplay() {
        const messagesArea = document.getElementById('chatMessages');
        if (!messagesArea) return;
        
        messagesArea.innerHTML = this.messages.map(msg => {
            const color = this.getMessageColor(msg.type);
            const prefix = this.getMessagePrefix(msg.mode, msg.type);
            const time = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            return `
                <div style="margin: 2px 0; color: ${color};">
                    <span style="color: #666; font-size: 11px;">[${time}]</span>
                    <span style="font-weight: bold;">${prefix}${msg.playerName}:</span>
                    <span style="color: white;">${this.escapeHtml(msg.message)}</span>
                </div>
            `;
        }).join('');
        
        // Scroll vers le bas
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    updateMiniChat(playerName, message, type) {
        const miniChat = document.getElementById('miniChat');
        if (!miniChat) return;
        
        const color = this.getMessageColor(type);
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: ${color};
            padding: 4px 8px;
            margin: 1px 0;
            border-radius: 4px;
            font-size: 13px;
            font-family: monospace;
            border-left: 3px solid ${color};
            animation: slideInLeft 0.3s ease-out;
        `;
        
        messageElement.innerHTML = `
            <span style="font-weight: bold;">${playerName}:</span>
            <span style="color: white;">${this.escapeHtml(message)}</span>
        `;
        
        // Ajouter le message
        miniChat.appendChild(messageElement);
        
        // Supprimer les anciens messages (garder seulement 5)
        while (miniChat.children.length > 5) {
            miniChat.removeChild(miniChat.firstChild);
        }
        
        // Faire disparaître le message après 8 secondes
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.remove();
                    }
                }, 500);
            }
        }, 8000);
    }

    getMessageColor(type) {
        switch (type) {
            case 'own': return '#00ff00';
            case 'team-own': return '#4CAF50';
            case 'team-enemy': return '#F44336';
            case 'system': return '#ffff00';
            case 'error': return '#ff4444';
            default: return '#ffffff';
        }
    }

    getMessagePrefix(mode, type) {
        if (mode === 'team') {
            return type === 'team-own' ? '[ÉQUIPE] ' : '[ENNEMI] ';
        }
        return '';
    }

    async sendTypingIndicator(isTyping) {
        if (!multiplayer || !multiplayer.matchId) return;
        
        try {
            if (isTyping) {
                await database.ref(`matches/${multiplayer.matchId}/typing/${multiplayer.playerId}`).set({
                    playerName: multiplayer.playerName,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                await database.ref(`matches/${multiplayer.matchId}/typing/${multiplayer.playerId}`).remove();
            }
        } catch (error) {
            // Ignorer les erreurs d'indicateur de frappe
        }
    }

    updateTypingIndicator(typingData) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        // Filtrer les utilisateurs qui tapent (pas nous)
        const typingUsers = Object.entries(typingData)
            .filter(([playerId, data]) => playerId !== multiplayer.playerId)
            .map(([playerId, data]) => data.playerName);
        
        if (typingUsers.length === 0) {
            typingIndicator.style.display = 'none';
        } else {
            const text = typingUsers.length === 1 ? 
                `${typingUsers[0]} est en train d'écrire...` :
                `${typingUsers.slice(0, 2).join(', ')} ${typingUsers.length > 2 ? `et ${typingUsers.length - 2} autres` : ''} écrivent...`;
            
            typingIndicator.textContent = text;
            typingIndicator.style.display = 'block';
        }
    }

    // Messages système prédéfinis
    sendSystemMessage(type, data = {}) {
        const messages = {
            'round_start': `🚀 Round ${data.round} - ${data.side}`,
            'bomb_planted': `💣 Bombe plantée au site ${data.site} par ${data.player}!`,
            'bomb_defused': `✅ Bombe désamorcée par ${data.player}!`,
            'player_killed': `💀 ${data.victim} a été éliminé par ${data.killer}`,
            'round_win_ct': `🏆 Les Counter-Terrorists gagnent le round!`,
            'round_win_t': `🏆 Les Terrorists gagnent le round!`,
            'match_start': `🎮 Match commencé - ${data.map}`,
            'player_joined': `👋 ${data.player} a rejoint la partie`,
            'player_left': `👋 ${data.player} a quitté la partie`
        };
        
        const message = messages[type] || `Événement: ${type}`;
        this.displayMessage('SYSTÈME', message, 'system', 'system');
    }

    // Commandes de chat
    processCommand(message) {
        if (!message.startsWith('/')) return false;
        
        const [command, ...args] = message.slice(1).split(' ');
        
        switch (command.toLowerCase()) {
            case 'help':
                this.displayMessage('AIDE', 'Commandes: /help, /ping, /time, /players', 'system', 'system');
                break;
                
            case 'ping':
                this.displayMessage('PING', `Latence: ${networkManager?.lastLatency || 'N/A'}ms`, 'system', 'system');
                break;
                
            case 'time':
                const time = new Date().toLocaleTimeString('fr-FR');
                this.displayMessage('TEMPS', time, 'system', 'system');
                break;
                
            case 'players':
                const playerCount = Object.keys(multiplayer?.multiplayerPlayers || {}).length;
                this.displayMessage('JOUEURS', `${playerCount} joueurs connectés`, 'system', 'system');
                break;
                
            default:
                this.displayMessage('ERREUR', `Commande inconnue: /${command}`, 'system', 'error');
        }
        
        return true;
    }

    // Utilitaires
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Nettoyage
    destroy() {
        // Supprimer les listeners Firebase
        if (multiplayer && multiplayer.matchId) {
            database.ref(`matches/${multiplayer.matchId}/chat`).off();
            database.ref(`matches/${multiplayer.matchId}/typing`).off();
        }
        
        // Supprimer les éléments UI
        const elements = ['chatContainer', 'miniChat', 'typingIndicator'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        this.messages = [];
    }
}

// Styles CSS pour les animations de chat
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    @keyframes slideInLeft {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    #chatMessages::-webkit-scrollbar {
        width: 8px;
    }
    
    #chatMessages::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
    }
    
    #chatMessages::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 4px;
    }
    
    #chatMessages::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
    }
    
    #chatInput:focus {
        border-color: #4CAF50;
        box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
    }
    
    #chatSend:hover {
        background: #45a049;
    }
`;

document.head.appendChild(chatStyles);

// Instance globale du système de chat
let chatSystem = null;