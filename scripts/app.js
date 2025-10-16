// scripts/app.js - Code principal de l'application
class AIStudioApp {
    constructor() {
        this.apiKey = this.getApiKey();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkApiKey();
    }

    getApiKey() {
        // Priorité 1: Fichier config.js
        if (typeof CONFIG !== 'undefined' && CONFIG.API_KEYS.GEMINI) {
            return CONFIG.API_KEYS.GEMINI;
        }
        
        // Priorité 2: Stockage local
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            return savedKey;
        }
        
        return null;
    }

    checkApiKey() {
        if (!this.apiKey) {
            this.showApiKeyModal();
        }
    }

    showApiKeyModal() {
        // Afficher un message pour configurer l'API
        console.log("Clé API manquante - Veuillez configurer scripts/config.js");
    }

    setupEventListeners() {
        // Votre code existant pour les boutons, modals, etc.
        document.getElementById('start-creating')?.addEventListener('click', () => {
            this.openTool('image');
        });

        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    const toolType = card.getAttribute('data-tool');
                    this.openTool(toolType);
                }
            });
        });
    }

    openTool(toolType) {
        console.log(`Ouverture de l'outil: ${toolType}`);
        // Votre code pour ouvrir les modals
    }

    // Méthode pour appeler l'API Gemini
    async callGeminiAPI(prompt, model = 'gemini-pro') {
        if (!this.apiKey) {
            throw new Error('Clé API Gemini non configurée');
        }

        try {
            const response = await fetch(
                `${CONFIG.API_URLS.GEMINI}/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de l\'appel à Gemini:', error);
            throw error;
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.aiStudioApp = new AIStudioApp();
});