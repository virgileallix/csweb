// Point d'entrée principal de l'application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Tactical Shooter - Initialisation...');
    
    // Vérifie la compatibilité du navigateur
    if (!checkBrowserCompatibility()) {
        alert('Votre navigateur n\'est pas compatible avec ce jeu. Veuillez utiliser une version récente de Chrome, Firefox ou Edge.');
        return;
    }
    
    // Initialise l'application
    initializeApp();
});

// Vérifie la compatibilité du navigateur
function checkBrowserCompatibility() {
    // Vérifie Canvas
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) {
        console.error('Canvas non supporté');
        return false;
    }
    
    // Vérifie Firebase
    if (typeof firebase === 'undefined') {
        console.error('Firebase non chargé');
        return false;
    }
    
    return true;
}

// Initialise l'application
function initializeApp() {
    // Configuration initiale
    setupErrorHandling();
    setupPerformanceMonitoring();
    
    // Affiche le menu principal
    console.log('✅ Application initialisée avec succès');
}

// Gestion des erreurs globales
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Erreur globale:', event.error);
        
        // Log l'erreur mais ne crash pas l'application
        if (event.error && event.error.stack) {
            console.error('Stack trace:', event.error.stack);
        }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promise rejetée:', event.reason);
    });
}

// Monitoring des performances
function setupPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
            
            // Affiche les FPS dans la console (peut être amélioré avec un affichage visuel)
            if (fps < 30) {
                console.warn(`⚠️ FPS faibles: ${fps}`);
            }
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        requestAnimationFrame(updateFPS);
    }
    
    // Démarre le monitoring si on est en jeu
    if (window.location.hash === '#debug') {
        updateFPS();
    }
}

// Gestionnaire de déconnexion
window.addEventListener('beforeunload', (event) => {
    // Quitte proprement le lobby si nécessaire
    if (firebaseManager && firebaseManager.currentLobby) {
        firebaseManager.leaveLobby();
    }
});

// Raccourcis clavier globaux
document.addEventListener('keydown', (e) => {
    // ESC pour ouvrir le menu (si en jeu)
    if (e.key === 'Escape' && menuManager.currentScreen === 'game') {
        // Peut implémenter un menu pause ici
        console.log('Menu pause (non implémenté)');
    }
    
    // F11 pour plein écran
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
});

// Bascule en plein écran
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Impossible de passer en plein écran:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Optimisations pour les appareils mobiles
if ('ontouchstart' in window) {
    // Désactive le zoom sur double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Désactive le menu contextuel sur appui long
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Utilitaires globaux
window.utils = {
    // Formate un timestamp en temps relatif
    formatRelativeTime: (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'À l\'instant';
        if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
        return `Il y a ${Math.floor(seconds / 86400)} j`;
    },
    
    // Génère une couleur aléatoire
    randomColor: () => {
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    },
    
    // Interpolation linéaire
    lerp: (start, end, t) => {
        return start + (end - start) * t;
    },
    
    // Limite une valeur entre min et max
    clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    }
};

console.log('🎮 Tactical Shooter - Prêt!');