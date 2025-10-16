// scripts/app.js - Code principal de l'application
class AIStudioApp {
    constructor() {
        this.apiKey = this.getApiKey();
        setTimeout(() => this.initChatSystem(), 1000); // Attendre que Firebase soit prêt
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
	
	// === NOUVELLES MÉTHODES POUR LES CHATS ===
    
    initChatSystem() {
        console.log("Initialisation du système de chats...");
        this.currentChatId = null;
        this.chats = [];
        this.loadChatHistory();
    }

     async createNewChat() {
		try {
			console.log("Tentative de création d'un chat...");
			
			// Vérifier que Firebase est prêt (utiliser window.db)
			if (!window.db) { // Changé de 'db' à 'window.db'
				console.error("Firebase Firestore n'est pas initialisé ou accessible globalement.");
				return;
			}
            if (!window.auth || !window.auth.currentUser) { // Vérifier l'authentification
                alert("Veuillez vous connecter pour créer un nouveau chat.");
                console.warn("Utilisateur non connecté pour créer un chat.");
                return;
            }
			
			const chatId = 'chat_' + Date.now();
			const newChat = {
				id: chatId,
				title: 'Nouveau chat ' + (this.chats.length + 1),
				createdAt: new Date(),
				messages: [],
                userId: window.auth.currentUser.uid // Associer le chat à l'utilisateur connecté
			};
			
			this.chats.unshift(newChat);
			this.currentChatId = chatId;
			await this.saveChatToFirestore(newChat); // saveChatToFirestore utilisera aussi window.db
			this.renderChatList();
			
			console.log("Nouveau chat créé avec succès:", chatId);
		} catch (error) {
			console.error("Erreur création chat:", error);
		}
	}

    async saveChatToFirestore(chat) {
        if (!window.db) { // Changé de 'db' à 'window.db'
            console.warn("Firestore non initialisé ou accessible globalement.");
            return;
        }
        
        const userId = this.getUserId(); // Ou directement window.auth.currentUser.uid si toujours connecté
        await window.db.collection('users').doc(userId) // Changé de 'db' à 'window.db'
            .collection('conversations').doc(chat.id)
            .set(chat);
    }

    async loadChatHistory() {
        try {
            if (!window.db) { // Changé de 'db' à 'window.db'
                console.warn("Firestore non initialisé ou accessible globalement.");
                return;
            }
            if (!window.auth || !window.auth.currentUser) {
                console.warn("Utilisateur non connecté. Impossible de charger l'historique.");
                // Ou gérer l'authentification ici
                return;
            }
            
            const userId = window.auth.currentUser.uid; // Utilisez l'ID de l'utilisateur Firebase
            const snapshot = await window.db.collection('users').doc(userId) // Changé de 'db' à 'window.db'
                .collection('conversations')
                .orderBy('createdAt', 'desc')
                .get();
                
            this.chats = snapshot.docs.map(doc => doc.data());
            this.renderChatList();
            console.log("Historique chargé:", this.chats.length, "chats");
        } catch (error) {
            console.error("Erreur chargement historique:", error);
        }
    }

    getUserId() {
        // Cette fonction doit maintenant retourner l'ID de l'utilisateur Firebase
        // car vos collections sont sous 'users/{userId}/conversations'.
        // La méthode localStorage pour un userId générique pourrait entrer en conflit.
        if (window.auth && window.auth.currentUser) {
            return window.auth.currentUser.uid;
        }
        console.warn("Aucun utilisateur Firebase connecté. Retourne un ID générique pour le test.");
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'anon_user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showChatInterface() {
        // À adapter selon ton interface existante
        console.log("Affichage interface chat");
    }

    renderMessages(messages) {
        // À implémenter selon ton affichage
        console.log("Affichage messages:", messages);
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});