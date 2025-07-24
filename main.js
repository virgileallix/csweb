// Point d'entrée principal de SIO SHOOTER - Enhanced Edition
class SIOShooterApp {
    constructor() {
        this.version = '2.1.0';
        this.buildNumber = '20241224';
        this.isDebugMode = window.location.hash.includes('debug');
        this.performanceMonitor = null;
        this.analyticsData = {
            sessionsStarted: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            errors: []
        };
        
        // Configuration du jeu
        this.config = {
            maxFPS: 144,
            targetFPS: 60,
            enableVSync: true,
            antiAliasing: true,
            particleQuality: 'high', // low, medium, high
            soundEnabled: true,
            musicEnabled: true,
            debugMode: this.isDebugMode
        };
        
        this.startTime = Date.now();
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fpsHistory = [];
        
        console.log(`🎮 SIO SHOOTER v${this.version} - Initialisation...`);
        this.initialize();
    }
    
    // Initialisation principale
    async initialize() {
        try {
            // Étape 1: Vérification de compatibilité
            await this.checkBrowserCompatibility();
            
            // Étape 2: Chargement des ressources
            await this.loadResources();
            
            // Étape 3: Configuration des systèmes
            this.setupSystems();
            
            // Étape 4: Initialisation de l'interface
            this.initializeUI();
            
            // Étape 5: Démarrage de l'application
            this.startApplication();
            
            console.log('✅ SIO SHOOTER initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur critique lors de l\'initialisation:', error);
            this.handleCriticalError(error);
        }
    }
    
    // Vérifie la compatibilité du navigateur
    async checkBrowserCompatibility() {
        const checks = {
            canvas: this.checkCanvasSupport(),
            webgl: this.checkWebGLSupport(),
            localStorage: this.checkLocalStorageSupport(),
            requestAnimationFrame: this.checkAnimationFrameSupport(),
            firebase: this.checkFirebaseSupport(),
            modernJS: this.checkModernJSSupport()
        };
        
        const results = {};
        const failures = [];
        
        for (const [feature, check] of Object.entries(checks)) {
            try {
                results[feature] = await check;
                if (!results[feature]) {
                    failures.push(feature);
                }
            } catch (error) {
                results[feature] = false;
                failures.push(feature);
                console.warn(`❌ ${feature} non supporté:`, error);
            }
        }
        
        if (failures.length > 0) {
            const criticalFeatures = ['canvas', 'firebase', 'requestAnimationFrame'];
            const criticalFailures = failures.filter(f => criticalFeatures.includes(f));
            
            if (criticalFailures.length > 0) {
                throw new Error(`Fonctionnalités critiques manquantes: ${criticalFailures.join(', ')}`);
            } else {
                console.warn('⚠️ Certaines fonctionnalités ne sont pas supportées:', failures);
                this.showCompatibilityWarning(failures);
            }
        }
        
        // Sauvegarde les résultats pour usage ultérieur
        this.compatibility = results;
        
        console.log('✅ Vérification de compatibilité terminée:', results);
    }
    
    // Vérifications individuelles
    checkCanvasSupport() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }
    
    checkWebGLSupport() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    }
    
    checkLocalStorageSupport() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    checkAnimationFrameSupport() {
        return !!(window.requestAnimationFrame || 
                 window.mozRequestAnimationFrame || 
                 window.webkitRequestAnimationFrame);
    }
    
    checkFirebaseSupport() {
        return typeof firebase !== 'undefined';
    }
    
    checkModernJSSupport() {
        try {
            // Teste quelques fonctionnalités ES6+
            const arrow = () => true;
            const {test} = {test: true};
            const spread = [...[1, 2, 3]];
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Charge les ressources nécessaires
    async loadResources() {
        const loadingSteps = [
            { name: 'Configuration', weight: 10 },
            { name: 'Polyfills', weight: 15 },
            { name: 'Styles', weight: 20 },
            { name: 'Scripts', weight: 25 },
            { name: 'Assets', weight: 30 }
        ];
        
        let totalProgress = 0;
        
        for (const step of loadingSteps) {
            console.log(`📦 Chargement: ${step.name}...`);
            
            try {
                await this.loadResourceStep(step.name);
                totalProgress += step.weight;
                
                // Mise à jour du loader si présent
                this.updateLoadingProgress(totalProgress, step.name);
                
            } catch (error) {
                console.warn(`⚠️ Erreur lors du chargement de ${step.name}:`, error);
                this.analyticsData.errors.push({
                    type: 'loading',
                    step: step.name,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
        
        console.log('✅ Ressources chargées');
    }
    
    // Charge une étape spécifique
    async loadResourceStep(stepName) {
        switch (stepName) {
            case 'Configuration':
                await this.loadConfiguration();
                break;
            case 'Polyfills':
                await this.loadPolyfills();
                break;
            case 'Styles':
                await this.loadStyles();
                break;
            case 'Scripts':
                await this.loadScripts();
                break;
            case 'Assets':
                await this.loadAssets();
                break;
        }
    }
    
    // Chargements spécifiques
    async loadConfiguration() {
        // Charge la configuration depuis localStorage
        const savedConfig = localStorage.getItem('sio-shooter-config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                this.config = { ...this.config, ...config };
                console.log('📋 Configuration chargée depuis le stockage local');
            } catch (e) {
                console.warn('⚠️ Configuration corrompue, utilisation des valeurs par défaut');
            }
        }
        
        // Adapte la configuration selon les performances du système
        this.adaptConfigurationToSystem();
    }
    
    async loadPolyfills() {
        // Polyfill pour requestAnimationFrame
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = 
                window.mozRequestAnimationFrame || 
                window.webkitRequestAnimationFrame || 
                ((callback) => setTimeout(callback, 1000 / 60));
        }
        
        // Polyfill pour performance.now
        if (!window.performance || !window.performance.now) {
            window.performance = { now: () => Date.now() };
        }
    }
    
    async loadStyles() {
        // Injecte des styles supplémentaires si nécessaire
        const additionalStyles = `
            .sio-shooter-app {
                --app-version: "${this.version}";
                --build-number: "${this.buildNumber}";
            }
            
            .debug-panel {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                border-radius: 5px;
                max-width: 300px;
            }
            
            .performance-graph {
                width: 200px;
                height: 50px;
                background: #000;
                margin: 5px 0;
                position: relative;
                overflow: hidden;
            }
            
            .fps-bar {
                position: absolute;
                bottom: 0;
                width: 2px;
                background: #00ff00;
            }
            
            .loading-overlay {
                position: fixed;
                inset: 0;
                background: linear-gradient(135deg, #0f1419, #1a1f2e);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 1;
                transition: opacity 0.5s ease;
            }
            
            .loading-content {
                text-align: center;
                color: white;
            }
            
            .loading-logo {
                font-size: 3rem;
                font-weight: 900;
                margin-bottom: 2rem;
                background: linear-gradient(45deg, #ff4655, #00d4ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .loading-progress-container {
                width: 400px;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin: 1rem auto;
            }
            
            .loading-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #ff4655, #00d4ff);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 3px;
            }
            
            .loading-status {
                margin-top: 1rem;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = additionalStyles;
        document.head.appendChild(styleSheet);
    }
    
    async loadScripts() {
        // Vérifie que tous les scripts nécessaires sont chargés
        const requiredScripts = ['firebaseManager', 'menuManager', 'game'];
        const missingScripts = [];
        
        for (const script of requiredScripts) {
            if (typeof window[script] === 'undefined') {
                missingScripts.push(script);
            }
        }
        
        if (missingScripts.length > 0) {
            console.warn('⚠️ Scripts manquants:', missingScripts);
        }
    }
    
    async loadAssets() {
        // Précharge des assets si nécessaire
        const assets = [
            // Sounds (simulés pour cette démo)
            // Images, textures, etc.
        ];
        
        // Simulation du chargement d'assets
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Adapte la configuration aux performances du système
    adaptConfigurationToSystem() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        if (gl) {
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            
            console.log(`🖥️ GPU: ${renderer} (${vendor})`);
            
            // Adapte la qualité selon le GPU
            if (renderer.includes('Intel') || renderer.includes('Mesa')) {
                this.config.particleQuality = 'medium';
                this.config.targetFPS = 30;
                console.log('📉 GPU intégré détecté, réduction de la qualité');
            }
        }
        
        // Adapte selon la mémoire disponible
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            this.config.particleQuality = 'low';
            console.log('📉 Mémoire limitée détectée, optimisation activée');
        }
        
        // Adapte selon la connexion
        if (navigator.connection) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                this.config.lowBandwidthMode = true;
                console.log('📶 Connexion lente détectée, mode économique activé');
            }
        }
    }
    
    // Met à jour le loader
    updateLoadingProgress(progress, status) {
        const progressBar = document.querySelector('.loading-progress-bar');
        const statusText = document.querySelector('.loading-status');
        
        if (progressBar) {
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
        
        if (statusText) {
            statusText.textContent = status;
        }
    }
    
    // Configuration des systèmes
    setupSystems() {
        console.log('⚙️ Configuration des systèmes...');
        
        // Système de gestion d'erreurs
        this.setupErrorHandling();
        
        // Système de monitoring des performances
        this.setupPerformanceMonitoring();
        
        // Système d'analytics
        this.setupAnalytics();
        
        // Système de raccourcis clavier
        this.setupGlobalKeyboardShortcuts();
        
        // Système de gestion de la visibilité
        this.setupVisibilityHandling();
        
        // Système de sauvegarde automatique
        this.setupAutoSave();
        
        console.log('✅ Systèmes configurés');
    }
    
    // Gestion des erreurs globales
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            const error = {
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            this.handleError(error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            const error = {
                type: 'promise',
                message: event.reason?.message || 'Promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            this.handleError(error);
        });
        
        // Gestion des erreurs WebGL
        this.setupWebGLErrorHandling();
    }
    
    // Gestion des erreurs WebGL
    setupWebGLErrorHandling() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                console.warn('⚠️ Contexte WebGL perdu');
                this.handleWebGLContextLost();
            });
            
            canvas.addEventListener('webglcontextrestored', () => {
                console.log('✅ Contexte WebGL restauré');
                this.handleWebGLContextRestored();
            });
        }
    }
    
    // Monitoring des performances
    setupPerformanceMonitoring() {
        if (!this.config.debugMode) return;
        
        this.performanceMonitor = {
            frameCount: 0,
            lastFrameTime: performance.now(),
            fpsHistory: [],
            memoryUsage: [],
            renderTime: [],
            updateTime: []
        };
        
        // Crée le panneau de debug
        this.createDebugPanel();
        
        // Démarre le monitoring
        this.startPerformanceMonitoring();
    }
    
    // Crée le panneau de debug
    createDebugPanel() {
        if (document.getElementById('debugPanel')) return;
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.className = 'debug-panel';
        debugPanel.innerHTML = `
            <div><strong>SIO SHOOTER DEBUG</strong></div>
            <div>Version: ${this.version}-${this.buildNumber}</div>
            <div>FPS: <span id="debugFPS">--</span></div>
            <div>Render: <span id="debugRender">--</span>ms</div>
            <div>Update: <span id="debugUpdate">--</span>ms</div>
            <div>Memory: <span id="debugMemory">--</span>MB</div>
            <div>Players: <span id="debugPlayers">--</span></div>
            <div>Particles: <span id="debugParticles">--</span></div>
            <div class="performance-graph" id="fpsGraph"></div>
            <div>
                <button onclick="sioShooterApp.toggleVSync()">Toggle VSync</button>
                <button onclick="sioShooterApp.dumpPerformanceData()">Dump Data</button>
            </div>
        `;
        
        document.body.appendChild(debugPanel);
    }
    
    // Démarre le monitoring des performances
    startPerformanceMonitoring() {
        const monitor = () => {
            if (!this.performanceMonitor) return;
            
            const now = performance.now();
            const deltaTime = now - this.performanceMonitor.lastFrameTime;
            const fps = Math.round(1000 / deltaTime);
            
            this.performanceMonitor.frameCount++;
            this.performanceMonitor.lastFrameTime = now;
            this.performanceMonitor.fpsHistory.push(fps);
            
            // Limite l'historique
            if (this.performanceMonitor.fpsHistory.length > 100) {
                this.performanceMonitor.fpsHistory.shift();
            }
            
            // Met à jour l'affichage toutes les 30 frames
            if (this.performanceMonitor.frameCount % 30 === 0) {
                this.updateDebugDisplay();
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }
    
    // Met à jour l'affichage de debug
    updateDebugDisplay() {
        const avgFPS = Math.round(
            this.performanceMonitor.fpsHistory.reduce((a, b) => a + b, 0) / 
            this.performanceMonitor.fpsHistory.length
        );
        
        document.getElementById('debugFPS').textContent = avgFPS;
        
        // Mémoire
        if (performance.memory) {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            document.getElementById('debugMemory').textContent = memoryMB;
        }
        
        // Graphique FPS
        this.updateFPSGraph();
        
        // Stats du jeu
        if (window.game) {
            const playerCount = Object.keys(window.game.players || {}).length;
            const particleCount = (window.game.particles || []).length;
            
            document.getElementById('debugPlayers').textContent = playerCount;
            document.getElementById('debugParticles').textContent = particleCount;
        }
    }
    
    // Met à jour le graphique FPS
    updateFPSGraph() {
        const graph = document.getElementById('fpsGraph');
        if (!graph) return;
        
        // Nettoie le graphique
        graph.innerHTML = '';
        
        // Dessine les barres FPS
        const history = this.performanceMonitor.fpsHistory.slice(-50);
        const maxFPS = Math.max(...history);
        
        history.forEach((fps, index) => {
            const bar = document.createElement('div');
            bar.className = 'fps-bar';
            bar.style.left = (index * 4) + 'px';
            bar.style.height = ((fps / maxFPS) * 50) + 'px';
            
            if (fps < 30) bar.style.background = '#ff0000';
            else if (fps < 50) bar.style.background = '#ffaa00';
            else bar.style.background = '#00ff00';
            
            graph.appendChild(bar);
        });
    }
    
    // Système d'analytics
    setupAnalytics() {
        this.analyticsData.sessionStart = Date.now();
        this.analyticsData.sessionsStarted++;
        
        // Sauvegarde les analytics périodiquement
        setInterval(() => {
            this.saveAnalytics();
        }, 60000); // Chaque minute
        
        // Collecte des données système
        this.collectSystemInfo();
    }
    
    // Collecte les infos système
    collectSystemInfo() {
        this.systemInfo = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
        
        console.log('📊 Informations système collectées:', this.systemInfo);
    }
    
    // Raccourcis clavier globaux
    setupGlobalKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Combinaisons avec Ctrl/Cmd
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'r':
                        event.preventDefault();
                        this.showReloadConfirmation();
                        break;
                    case 'd':
                        if (this.config.debugMode) {
                            event.preventDefault();
                            this.toggleDebugPanel();
                        }
                        break;
                    case 's':
                        event.preventDefault();
                        this.saveConfiguration();
                        break;
                }
            }
            
            // Touches de fonction
            switch (event.key) {
                case 'F11':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'F12':
                    if (!this.config.debugMode) {
                        event.preventDefault();
                    }
                    break;
            }
        });
    }
    
    // Gestion de la visibilité
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        window.addEventListener('beforeunload', (event) => {
            this.onBeforeUnload(event);
        });
        
        window.addEventListener('unload', () => {
            this.onUnload();
        });
    }
    
    // Sauvegarde automatique
    setupAutoSave() {
        setInterval(() => {
            this.autoSave();
        }, 30000); // Toutes les 30 secondes
    }
    
    // Initialisation de l'interface
    initializeUI() {
        console.log('🎨 Initialisation de l\'interface...');
        
        // Ajoute les classes CSS
        document.body.classList.add('sio-shooter-app');
        
        // Initialise les effets visuels
        this.initializeVisualEffects();
        
        // Initialise les animations
        this.initializeAnimations();
        
        // Gère les interactions tactiles
        this.setupTouchHandling();
        
        console.log('✅ Interface initialisée');
    }
    
    // Effets visuels
    initializeVisualEffects() {
        // Effet de parallax sur le fond
        this.setupParallaxEffect();
        
        // Effet de particules
        this.setupParticleSystem();
        
        // Effets de transition
        this.setupTransitionEffects();
    }
    
    // Effet parallax
    setupParallaxEffect() {
        let mouseX = 0, mouseY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = (e.clientY / window.innerHeight) * 2 - 1;
        });
        
        const animateParallax = () => {
            const elements = document.querySelectorAll('.parallax-element');
            elements.forEach((element, index) => {
                const speed = (index + 1) * 0.5;
                element.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`;
            });
            
            requestAnimationFrame(animateParallax);
        };
        
        if (this.config.particleQuality !== 'low') {
            animateParallax();
        }
    }
    
    // Système de particules
    setupParticleSystem() {
        if (this.config.particleQuality === 'low') return;
        
        const particleContainer = document.querySelector('.particles');
        if (!particleContainer) return;
        
        const particleCount = this.config.particleQuality === 'high' ? 50 : 25;
        
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(particleContainer);
        }
    }

    // Effets de transition (placeholder)
    setupTransitionEffects() {
        // À compléter : effets de transition visuels
        console.log("Effets de transition initialisés");
    }
    
    // Initialisation des animations (placeholder)
    initializeAnimations() {
        // À compléter : initialisation des animations
        console.log("Animations initialisées");
    }
    
    // Crée une particule
    createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        const size = Math.random() * 4 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 10;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${Math.random() > 0.5 ? '#ff4655' : '#00d4ff'};
            border-radius: 50%;
            left: ${x}%;
            top: ${y}%;
            opacity: ${Math.random() * 0.6 + 0.2};
            animation: particle-float ${duration}s linear ${delay}s infinite;
            box-shadow: 0 0 ${size * 2}px currentColor;
        `;
        
        container.appendChild(particle);
    }
    
    // Gestion tactile
    setupTouchHandling() {
        if ('ontouchstart' in window) {
            console.log('📱 Appareil tactile détecté');
            
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
            
            // Ajoute des classes CSS pour mobile
            document.body.classList.add('touch-device');
            
            // Adapte la configuration pour mobile
            this.config.particleQuality = 'low';
            this.config.targetFPS = 30;
        }
    }
    
    // Démarre l'application
    startApplication() {
        console.log('🚀 Démarrage de l\'application...');
        
        // Cache l'écran de chargement
        this.hideLoadingScreen();
        
        // Affiche le menu principal
        this.showMainMenu();
        
        // Démarre les systèmes de surveillance
        this.startBackgroundSystems();
        
        // Marque l'application comme démarrée
        this.isRunning = true;
        
        console.log(`✅ SIO SHOOTER v${this.version} prêt ! (${Date.now() - this.startTime}ms)`);
        
        // Analytics
        this.analyticsData.appStarted = true;
        
        // Message de bienvenue
        this.showWelcomeMessage();
    }
    
    // Cache l'écran de chargement
    hideLoadingScreen() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500);
        }
    }
    
    // Affiche le menu principal
    showMainMenu() {
        // S'assure que le menu principal est visible
        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) {
            menuScreen.classList.add('active');
        }
        
        // Initialise le focus sur le champ nom
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            setTimeout(() => {
                playerNameInput.focus();
            }, 500);
        }
    }
    
    // Démarre les systèmes de surveillance
    startBackgroundSystems() {
        // Surveillance de la connexion
        this.monitorConnection();
        
        // Surveillance de la mémoire
        this.monitorMemory();
        
        // Surveillance des performances
        this.monitorPerformance();
        
        // Heartbeat
        this.startHeartbeat();
    }
    
    // Surveille la connexion
    monitorConnection() {
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.showNotification('🌐 Connexion rétablie', 'success');
        });
        
        window.addEventListener('offline', () => {
            console.warn('📵 Connexion perdue');
            this.showNotification('📵 Connexion perdue - Mode hors ligne', 'warning');
        });
    }
    
    // Surveille la mémoire
    monitorMemory() {
        if (!performance.memory) return;
        
        setInterval(() => {
            const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
            
            if (memoryUsage > 500) { // Plus de 500MB
                console.warn(`⚠️ Utilisation mémoire élevée: ${memoryUsage.toFixed(1)}MB`);
                this.handleHighMemoryUsage();
            }
            
            this.analyticsData.maxMemoryUsage = Math.max(
                this.analyticsData.maxMemoryUsage || 0, 
                memoryUsage
            );
        }, 30000); // Toutes les 30 secondes
    }
    
    // Surveille les performances
    monitorPerformance() {
        let lowFPSCount = 0;
        
        setInterval(() => {
            if (this.performanceMonitor) {
                const recentFPS = this.performanceMonitor.fpsHistory.slice(-10);
                const avgFPS = recentFPS.reduce((a, b) => a + b, 0) / recentFPS.length;
                
                if (avgFPS < 20) {
                    lowFPSCount++;
                    if (lowFPSCount >= 3) {
                        console.warn('⚠️ Performances dégradées détectées');
                        this.handleLowPerformance();
                        lowFPSCount = 0;
                    }
                } else {
                    lowFPSCount = 0;
                }
            }
        }, 5000); // Toutes les 5 secondes
    }
    
    // Heartbeat système
    startHeartbeat() {
        setInterval(() => {
            this.analyticsData.totalPlayTime = Date.now() - this.analyticsData.sessionStart;
            
            if (this.config.debugMode) {
                console.log('💓 Heartbeat', {
                    uptime: this.analyticsData.totalPlayTime,
                    memory: performance.memory?.usedJSHeapSize,
                    players: window.game ? Object.keys(window.game.players || {}).length : 0
                });
            }
        }, 60000); // Chaque minute
    }
    
    // Message de bienvenue
    showWelcomeMessage() {
        if (localStorage.getItem('sio-shooter-welcome-shown')) return;
        
        setTimeout(() => {
            this.showNotification(`
                🎮 Bienvenue dans SIO SHOOTER v${this.version} !<br>
                🎯 Jeu de tir tactique 5v5 en temps réel<br>
                ⌨️ Appuyez sur F1 pour l'aide
            `, 'info', 8000);
            
            localStorage.setItem('sio-shooter-welcome-shown', 'true');
        }, 2000);
    }
    
    // Gestionnaires d'événements
    handleError(error) {
        console.error('❌ Erreur capturée:', error);
        
        this.analyticsData.errors.push(error);
        
        // Limite le nombre d'erreurs stockées
        if (this.analyticsData.errors.length > 50) {
            this.analyticsData.errors = this.analyticsData.errors.slice(-25);
        }
        
        // Affiche une notification selon la gravité
        if (error.type === 'javascript' && error.message.includes('firebase')) {
            this.showNotification('⚠️ Problème de connexion au serveur', 'warning');
        } else if (error.type === 'promise') {
            this.showNotification('⚠️ Erreur de communication', 'warning');
        }
    }
    
    handleCriticalError(error) {
        console.error('💥 Erreur critique:', error);
        
        // Affiche un message d'erreur à l'utilisateur
        const errorOverlay = document.createElement('div');
        errorOverlay.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                font-family: Arial, sans-serif;
            ">
                <div style="text-align: center; max-width: 600px; padding: 2rem;">
                    <h1 style="color: #ff4444; margin-bottom: 1rem;">❌ Erreur Critique</h1>
                    <p style="margin-bottom: 2rem; line-height: 1.6;">
                        Une erreur critique s'est produite et SIO SHOOTER ne peut pas démarrer.<br>
                        Veuillez vérifier que votre navigateur est à jour et supporte les technologies modernes.
                    </p>
                    <div style="background: #222; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; font-family: monospace; font-size: 0.9rem; text-align: left;">
                        ${error.message}
                    </div>
                    <button onclick="window.location.reload()" style="
                        background: #ff4655;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                    ">🔄 Recharger la page</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
    }
    
    handleWebGLContextLost() {
        this.showNotification('⚠️ Contexte graphique perdu - Tentative de récupération...', 'warning');
    }
    
    handleWebGLContextRestored() {
        this.showNotification('✅ Contexte graphique restauré', 'success');
        
        // Redémarre le jeu si nécessaire
        if (window.game && typeof window.game.restart === 'function') {
            window.game.restart();
        }
    }
    
    handleHighMemoryUsage() {
        // Optimise automatiquement
        this.config.particleQuality = 'low';
        
        // Force le garbage collection si possible
        if (window.gc) {
            window.gc();
        }
        
        this.showNotification('🧹 Optimisation automatique de la mémoire', 'info');
    }
    
    handleLowPerformance() {
        // Réduit automatiquement la qualité
        if (this.config.particleQuality === 'high') {
            this.config.particleQuality = 'medium';
        } else if (this.config.particleQuality === 'medium') {
            this.config.particleQuality = 'low';
        }
        
        this.config.targetFPS = 30;
        
        this.showNotification('📉 Qualité réduite pour améliorer les performances', 'info');
        this.saveConfiguration();
    }
    
    onPageHidden() {
        console.log('👁️ Page cachée');
        
        // Met en pause le jeu si en cours
        if (window.game && typeof window.game.pause === 'function') {
            window.game.pause();
        }
        
        // Réduit la fréquence des mises à jour
        this.pauseBackgroundSystems();
    }
    
    onPageVisible() {
        console.log('👁️ Page visible');
        
        // Reprend le jeu
        if (window.game && typeof window.game.resume === 'function') {
            window.game.resume();
        }
        
        // Reprend les systèmes
        this.resumeBackgroundSystems();
    }
    
    onBeforeUnload(event) {
        // Sauvegarde les données importantes
        this.saveAnalytics();
        this.saveConfiguration();
        
        // Avertit si en partie
        if (window.game && window.game.gameState && window.game.gameState.status === 'playing') {
            const message = 'Une partie est en cours. Êtes-vous sûr de vouloir quitter ?';
            event.returnValue = message;
            return message;
        }
    }
    
    onUnload() {
        console.log('👋 Application fermée');
        
        // Nettoie les ressources
        this.cleanup();
    }
    
    // Utilitaires publics
    toggleDebugPanel() {
        const panel = document.getElementById('debugPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    toggleVSync() {
        this.config.enableVSync = !this.config.enableVSync;
        this.showNotification(`VSync ${this.config.enableVSync ? 'activé' : 'désactivé'}`, 'info');
        this.saveConfiguration();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('❌ Impossible de passer en plein écran:', err);
                this.showNotification('❌ Plein écran non disponible', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    dumpPerformanceData() {
        const data = {
            config: this.config,
            analytics: this.analyticsData,
            performance: this.performanceMonitor,
            system: this.systemInfo,
            compatibility: this.compatibility
        };
        
        console.log('📊 Données de performance:', data);
        
        // Copie dans le presse-papier si possible
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                .then(() => this.showNotification('📋 Données copiées dans le presse-papier', 'success'))
                .catch(() => this.showNotification('❌ Impossible de copier les données', 'error'));
        }
    }
    
    // Sauvegarde et chargement
    saveConfiguration() {
        try {
            localStorage.setItem('sio-shooter-config', JSON.stringify(this.config));
            console.log('💾 Configuration sauvegardée');
        } catch (error) {
            console.warn('⚠️ Impossible de sauvegarder la configuration:', error);
        }
    }
    
    saveAnalytics() {
        try {
            localStorage.setItem('sio-shooter-analytics', JSON.stringify(this.analyticsData));
        } catch (error) {
            console.warn('⚠️ Impossible de sauvegarder les analytics:', error);
        }
    }
    
    autoSave() {
        this.saveConfiguration();
        this.saveAnalytics();
        
        if (this.config.debugMode) {
            console.log('💾 Sauvegarde automatique effectuée');
        }
    }
    
    // Gestion des systèmes
    pauseBackgroundSystems() {
        // Implémentation de la pause des systèmes de surveillance
    }
    
    resumeBackgroundSystems() {
        // Implémentation de la reprise des systèmes de surveillance
    }
    
    // Notifications
    showNotification(message, type = 'info', duration = 3000) {
        // Utilise le système de notification du MenuManager si disponible
        if (window.menuManager && typeof window.menuManager.showNotification === 'function') {
            window.menuManager.showNotification(message, type, duration);
        } else {
            // Fallback simple
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    showCompatibilityWarning(failures) {
        const warnings = failures.map(f => `❌ ${f}`).join('<br>');
        this.showNotification(
            `⚠️ Fonctionnalités non supportées:<br>${warnings}<br>Le jeu peut ne pas fonctionner correctement.`,
            'warning',
            8000
        );
    }
    
    showReloadConfirmation() {
        if (confirm('🔄 Recharger SIO SHOOTER ?')) {
            window.location.reload();
        }
    }
    
    // Nettoyage
    cleanup() {
        // Arrête les intervalles
        if (this.performanceMonitor) {
            this.performanceMonitor = null;
        }
        
        // Sauvegarde finale
        this.saveAnalytics();
        this.saveConfiguration();
        
        // Nettoie les événements
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleError);
        
        console.log('🧹 Nettoyage terminé');
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Crée l'écran de chargement s'il n'existe pas
    if (!document.querySelector('.loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">SIO SHOOTER</div>
                <div class="loading-progress-container">
                    <div class="loading-progress-bar"></div>
                </div>
                <div class="loading-status">Initialisation...</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    // Démarre l'application
    window.sioShooterApp = new SIOShooterApp();
});

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SIOShooterApp;
}