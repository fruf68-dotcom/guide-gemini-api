class AIStudioApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.userId = this.getUserId();

        this.initChatSystem();
        this.setupEventListeners();
        this.setupThemeToggle();
        this.showTab('chat');
    }

    // --- Tabs
    showTab(tab) {
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.remove('hidden');
        document.querySelector(`.tab-btn[onclick="app.showTab('${tab}')"]`)?.classList.add('active');
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
            document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark');
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
    async initChatSystem() { await this.loadChats(); }

    // --- Création d’un nouveau chat
    async createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = { id: chatId, title: 'Nouveau chat ' + (this.chats.length + 1), messages: [], createdAt: new Date(), archived: false };
        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.renderChatList(); this.renderArchivedList(); this.openChat(chatId);
        await this.saveChat(newChat);
    }

    openChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        document.getElementById('chat-header').textContent = chat.title;
        this.renderMessages(chat.messages);
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container'); if (!container) return;
        container.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-bubble ' + (msg.user === 'me' ? 'message-user' : 'message-ai');
            div.textContent = msg.text;
            container.appendChild(div);
        });
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    renderChatList() {
        const list = document.getElementById('chat-list'); if (!list) return;
        list.innerHTML = '';
        this.chats.filter(c => !c.archived).forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<span>${chat.title}</span>
                <div class="chat-menu">
                    <button onclick="app.archiveChat('${chat.id}')">📥</button>
                    <button onclick="app.deleteChat('${chat.id}')">🗑️</button>
                    <button onclick="app.renameChatPrompt('${chat.id}')">✏️</button>
                </div>`;
            div.addEventListener('click', () => this.openChat(chat.id));
            list.appendChild(div);
        });
    }

    renderArchivedList() {
        const list = document.getElementById('archived-list'); if (!list) return;
        list.innerHTML = '';
        this.chats.filter(c => c.archived).forEach(chat => {
            const div = document.createElement('div');
            div.className = 'archived-chat';
            div.innerHTML = `<span>${chat.title}</span>
                <button onclick="app.unarchiveChat('${chat.id}')">🔄</button>`;
            div.addEventListener('click', () => this.openChat(chat.id));
            list.appendChild(div);
        });
    }

    async sendMessage() {
        const input = document.getElementById('message-text'); if (!input || !input.value.trim()) return;
        const chat = this.chats.find(c => c.id === this.currentChatId); if (!chat) return;
        const message = { text: input.value.trim(), createdAt: new Date(), user: 'me' };
        chat.messages.push(message); this.renderMessages(chat.messages); this.renderChatList(); await this.saveChat(chat);
        input.value = '';
    }

    async archiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId); if (!chat) return;
        chat.archived = true; this.renderChatList(); this.renderArchivedList(); await this.saveChat(chat);
    }

    async unarchiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId); if (!chat) return;
        chat.archived = false; this.renderChatList(); this.renderArchivedList(); await this.saveChat(chat);
    }

    async deleteChat(chatId) {
        if (!confirm('Voulez-vous vraiment supprimer ce chat ?')) return;
        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) this.currentChatId = this.chats[0]?.id || null;
        this.renderChatList(); this.renderArchivedList();
        if (this.currentChatId) this.openChat(this.currentChatId);
        localStorage.setItem('chats', JSON.stringify(this.chats));
        try { await window.db.collection('users').doc(this.userId).collection('conversations').doc(chatId).delete(); } catch(e){console.warn(e);}
    }

    async renameChatPrompt(chatId) {
        const chat = this.chats.find(c => c.id === chatId); if (!chat) return;
        const newName = prompt('Nom du chat:', chat.title); if (!newName) return;
        chat.title = newName; this.renderChatList(); this.renderArchivedList(); await this.saveChat(chat);
    }

    async saveChat(chat) {
        localStorage.setItem('chats', JSON.stringify(this.chats));
        if (!window.db) return;
        try { await window.db.collection('users').doc(this.userId).collection('conversations').doc(chat.id).set(chat); } catch(e){console.warn(e);}
    }

    async loadChats() {
        const saved = localStorage.getItem('chats'); if (saved) this.chats = JSON.parse(saved);
        this.renderChatList(); this.renderArchivedList();
        if (this.chats.length) this.openChat(this.chats[0].id);

        // Firestore load
        if (!window.db) return;
        try {
            const snapshot = await window.db.collection('users').doc(this.userId).collection('conversations').get();
            snapshot.docs.forEach(doc => {
                const c = doc.data();
                if (!this.chats.find(x=>x.id===c.id)) this.chats.push(c);
            });
            this.renderChatList(); this.renderArchivedList();
        } catch(e){console.warn(e);}
    }
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});
