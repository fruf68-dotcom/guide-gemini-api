class AIStudioApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.userId = this.getUserId();

        this.initChatSystem();
        this.setupEventListeners();
        this.setupThemeToggle();
    }

    // --- Utilisateur auto
    getUserId() {
        let id = localStorage.getItem('userId');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', id);
        }
        return id;
    }

    // --- Toggle clair / sombre
    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        const current = localStorage.getItem('theme') || 'dark';
        this.applyTheme(current);

        toggle.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
            this.applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
        }
    }

    // --- Gestion input / send
    setupEventListeners() {
        document.getElementById('send-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('message-text')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    // --- Initialisation chats
    async initChatSystem() {
        await this.loadChats();
    }

    // --- Création d’un nouveau chat
    async createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: 'Nouveau chat ' + (this.chats.length + 1),
            messages: [],
            createdAt: new Date(),
            archived: false
        };
        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.renderChatList();
        this.renderArchivedList();
        this.openChat(chatId);
        await this.saveChat(newChat);
    }

    // --- Ouvrir un chat
    openChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        document.getElementById('chat-header').textContent = chat.title;
        this.renderMessages(chat.messages);
    }

    // --- Rendu des messages
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        container.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-bubble message-appear ' + (msg.user === 'me' ? 'message-user' : 'message-ai');
            div.textContent = msg.text;
            container.appendChild(div);
            setTimeout(() => div.classList.remove('message-appear'), 50);
        });
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    // --- Rendu sidebar chats actifs
    renderChatList() {
        const list = document.getElementById('chat-list');
        if (!list) return;
        list.innerHTML = '';
        this.chats.filter(c => !c.archived).forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item group';
            div.innerHTML = `
                <span>${chat.title}</span>
                <div class="chat-menu">
                    <button onclick="app.archiveChat('${chat.id}')">📥</button>
                    <button onclick="app.deleteChat('${chat.id}')">🗑️</button>
                    <button onclick="app.renameChatPrompt('${chat.id}')">✏️</button>
                </div>
            `;
            div.addEventListener('click', () => this.openChat(chat.id));
            list.appendChild(div);
        });
    }

    // --- Rendu chats archivés
    renderArchivedList() {
        const list = document.getElementById('archived-list');
        if (!list) return;
        list.innerHTML = '';
        this.chats.filter(c => c.archived).forEach(chat => {
            const div = document.createElement('div');
            div.className = 'archived-chat';
            div.innerHTML = `
                <span>${chat.title}</span>
                <button onclick="app.unarchiveChat('${chat.id}')">🔄</button>
            `;
            div.addEventListener('click', () => this.openChat(chat.id));
            list.appendChild(div);
        });
    }

    // --- Envoyer message
    async sendMessage() {
        const input = document.getElementById('message-text');
        if (!input || !input.value.trim()) return;
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;

        const message = { text: input.value.trim(), createdAt: new Date(), user: 'me' };
        chat.messages.push(message);
        this.renderMessages(chat.messages);
        this.renderChatList();
        await this.saveChat(chat);

        // Simulation réponse IA
        setTimeout(async () => {
            const aiMsg = { text: "IA: " + message.text, createdAt: new Date(), user: 'ai' };
            chat.messages.push(aiMsg);
            this.renderMessages(chat.messages);
            await this.saveChat(chat);
        }, 500);

        input.value = '';
    }

    // --- Archivage / désarchivage
    async archiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.archived = true;
        this.renderChatList();
        this.renderArchivedList();
        await this.saveChat(chat);
    }
    async unarchiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.archived = false;
        this.renderChatList();
        this.renderArchivedList();
        await this.saveChat(chat);
    }

    // --- Supprimer chat
    async deleteChat(chatId) {
        if (!confirm('Voulez-vous vraiment supprimer ce chat ?')) return;
        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) this.currentChatId = this.chats[0]?.id || null;
        this.renderChatList();
        this.renderArchivedList();
        if (this.currentChatId) this.openChat(this.currentChatId);
        else {
            document.getElementById('chat-header').textContent = 'Sélectionnez un chat';
            document.getElementById('messages-container').innerHTML = '';
        }
        await this.deleteChatFromFirestore(chatId);
    }

    // --- Renommer chat
    renameChatPrompt(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        const newName = prompt('Renommer le chat:', chat.title);
        if (newName) {
            chat.title = newName;
            this.renderChatList();
            this.renderArchivedList();
            if (this.currentChatId === chatId) this.openChat(chatId);
            this.saveChat(chat);
        }
    }

    // --- Sauvegarde local + Firestore
    async saveChat(chat) {
        localStorage.setItem('myChats', JSON.stringify(this.chats));
        if (window.db) {
            await window.db.collection('users')
                .doc(this.userId)
                .collection('conversations')
                .doc(chat.id)
                .set(chat);
        }
    }

    async deleteChatFromFirestore(chatId) {
        if (window.db) {
            await window.db.collection('users')
                .doc(this.userId)
                .collection('conversations')
                .doc(chatId)
                .delete();
        }
    }

    // --- Chargement chats
    async loadChats() {
        if (window.db) {
            const snapshot = await window.db.collection('users')
                .doc(this.userId)
                .collection('conversations')
                .orderBy('createdAt', 'desc')
                .get();
            this.chats = snapshot.docs.map(doc => doc.data());
        }

        if (!this.chats.length) {
            const saved = localStorage.getItem('myChats');
            if (saved) this.chats = JSON.parse(saved);
        }

        this.renderChatList();
        this.renderArchivedList();
        if (this.chats.length) this.openChat(this.chats[0].id);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new AIStudioApp(); });
