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
			
			// Vérifier que Firebase est prêt
			if (!db) {
				console.error("Firebase Firestore n'est pas initialisé");
				return;
			}
			
			const chatId = 'chat_' + Date.now();
			const newChat = {
				id: chatId,
				title: 'Nouveau chat ' + (this.chats.length + 1),
				createdAt: new Date(),
				messages: []
			};
			
			this.chats.unshift(newChat);
			this.currentChatId = chatId;
			await this.saveChatToFirestore(newChat);
			this.renderChatList();
			
			console.log("Nouveau chat créé avec succès:", chatId);
		} catch (error) {
			console.error("Erreur création chat:", error);
		}
	}

    async saveChatToFirestore(chat) {
        if (!db) {
            console.warn("Firestore non initialisé");
            return;
        }
        
        const userId = this.getUserId();
        await db.collection('users').doc(userId)
            .collection('conversations').doc(chat.id)
            .set(chat);
    }

    async loadChatHistory() {
        try {
            if (!db) {
                console.warn("Firestore non initialisé");
                return;
            }
            
            const userId = this.getUserId();
            const snapshot = await db.collection('users').doc(userId)
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

    renderChatList() {
        const sidebar = document.getElementById('chat-sidebar');
        if (!sidebar) {
            console.warn("Sidebar non trouvée");
            return;
        }
        
        // Garder le bouton "Nouveau Chat"
        const newChatBtn = sidebar.querySelector('.new-chat-btn') || 
            '<button class="new-chat-btn" onclick="app.createNewChat()">+ Nouveau Chat</button>';
            
        sidebar.innerHTML = newChatBtn + this.chats.map(chat => `
            <div class="chat-item p-2 border-b border-gray-700 cursor-pointer hover:bg-gray-800" 
                 onclick="app.selectChat('${chat.id}')">
                <div class="chat-title font-medium">${chat.title}</div>
                <div class="chat-date text-xs text-gray-400">${this.formatDate(chat.createdAt)}</div>
            </div>
        `).join('');
    }

    selectChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            this.renderMessages(chat.messages);
        }
    }

    getUserId() {
        // Générer un ID unique pour chaque visiteur
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
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