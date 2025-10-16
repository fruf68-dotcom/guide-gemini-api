// scripts/app.js - Version complète avec ID auto et sidebar fonctionnelle
class AIStudioApp {
    constructor() {
        this.apiKey = this.getApiKey();
        this.currentChatId = null;
        this.chats = [];
        this.init();
        setTimeout(() => this.initChatSystem(), 1000); // attendre Firebase
    }

    // --------------------------
    // Initialisation
    // --------------------------
    init() {
        this.setupEventListeners();
        this.checkApiKey();
    }

    getApiKey() {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_KEYS.GEMINI) {
            return CONFIG.API_KEYS.GEMINI;
        }
        const savedKey = localStorage.getItem('gemini_api_key');
        return savedKey || null;
    }

    checkApiKey() {
        if (!this.apiKey) {
            console.log("Clé API manquante - Veuillez configurer scripts/config.js");
        }
    }

    setupEventListeners() {
        document.querySelector('.new-chat-btn')?.addEventListener('click', () => {
            this.createNewChat();
        });
    }

    // --------------------------
    // Gestion ID utilisateur
    // --------------------------
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'anon_user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    // --------------------------
    // Chat System
    // --------------------------
    async initChatSystem() {
        console.log("Initialisation du système de chats...");
        this.loadChatHistory();
    }

    async createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: 'Nouveau chat ' + (this.chats.length + 1),
            createdAt: new Date(),
            messages: []
        };

        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        localStorage.setItem('currentChatId', this.currentChatId);
        await this.saveChatToFirestore(newChat);
        this.renderChatList();
        this.showChatInterface();
    }

    async saveChatToFirestore(chat) {
        if (!window.db) return;
        const userId = this.getUserId();
        await window.db.collection('users').doc(userId)
            .collection('conversations').doc(chat.id)
            .set(chat);
    }

    async loadChatHistory() {
        if (!window.db) return;
        const userId = this.getUserId();
        const snapshot = await window.db.collection('users').doc(userId)
            .collection('conversations')
            .orderBy('createdAt', 'desc')
            .get();

        this.chats = snapshot.docs.map(doc => doc.data());
        this.currentChatId = localStorage.getItem('currentChatId') || (this.chats[0]?.id || null);
        this.renderChatList();
        if (this.currentChatId) this.openChat(this.currentChatId);
    }

    // --------------------------
    // Sidebar + affichage chats
    // --------------------------
    renderChatList() {
        const chatList = document.getElementById('chat-sidebar');
        if (!chatList) return;

        // Supprime tout sauf le bouton Nouveau Chat
        chatList.querySelectorAll('.chat-item').forEach(item => item.remove());

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item p-2 mb-2 rounded-lg flex justify-between items-center hover:bg-gray-700 cursor-pointer group';
            chatItem.innerHTML = `
                <span>${chat.title}</span>
                <div class="chat-menu hidden group-hover:flex space-x-2">
                    <button onclick="app.archiveChat('${chat.id}')">📥 Archiver</button>
                    <button onclick="app.deleteChat('${chat.id}')">🗑️ Supprimer</button>
                </div>
            `;
            chatItem.addEventListener('click', () => {
                this.openChat(chat.id);
            });
            chatList.appendChild(chatItem);
        });
    }

    async deleteChat(chatId) {
        if (!window.db) return;
        const userId = this.getUserId();
        await window.db.collection('users').doc(userId)
            .collection('conversations').doc(chatId).delete();

        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) this.currentChatId = null;
        localStorage.setItem('currentChatId', this.currentChatId);
        this.renderChatList();
    }

    async archiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.archived = true;
        await this.saveChatToFirestore(chat);
        this.renderChatList();
    }

    openChat(chatId) {
        this.currentChatId = chatId;
        localStorage.setItem('currentChatId', this.currentChatId);
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        this.renderMessages(chat.messages);
        this.showChatInterface();
    }

    showChatInterface() {
        // Affiche le contenu principal (à adapter selon ton UI)
        const root = document.getElementById('root');
        if (root) root.innerHTML = `<h2>Chat actif : ${this.currentChatId}</h2>`;
    }

    renderMessages(messages) {
        // À adapter selon ton interface
        console.log("Messages du chat :", messages);
    }

    // --------------------------
    // Appel API Gemini
    // --------------------------
    async callGeminiAPI(prompt, model = 'gemini-pro') {
        if (!this.apiKey) throw new Error('Clé API Gemini non configurée');

        const response = await fetch(
            `${CONFIG.API_URLS.GEMINI}/models/${model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({contents:[{parts:[{text: prompt}]}]})
            }
        );

        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
        return await response.json();
    }
}

// --------------------------
// Initialisation
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});
