class AIStudioApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;

        this.initChatSystem();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('send-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-text')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    // === Gestion des chats ===
    initChatSystem() {
        this.loadChatHistory();
    }

    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: 'Nouveau chat ' + (this.chats.length + 1),
            messages: [],
            createdAt: new Date(),
        };
        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.renderChatList();
        this.openChat(chatId);
    }

    openChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        document.getElementById('chat-header').textContent = chat.title;
        this.renderMessages(chat.messages);
    }

    renderChatList() {
        const list = document.getElementById('chat-list');
        if (!list) return;
        list.innerHTML = '';

        this.chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item p-2 mb-2 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-800';
            div.innerHTML = `
                <span>${chat.title}</span>
                <div class="chat-menu space-x-1 hidden group-hover:flex">
                    <button onclick="app.archiveChat('${chat.id}')">📥</button>
                    <button onclick="app.deleteChat('${chat.id}')">🗑️</button>
                </div>
            `;
            div.addEventListener('click', () => this.openChat(chat.id));
            list.appendChild(div);
        });
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        container.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'p-2 mb-2 rounded bg-gray-700';
            div.textContent = msg.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }

    sendMessage() {
        const input = document.getElementById('message-text');
        if (!input || !input.value.trim()) return;
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;

        const message = { text: input.value.trim(), createdAt: new Date() };
        chat.messages.push(message);
        input.value = '';
        this.renderMessages(chat.messages);
        this.renderChatList();
    }

    archiveChat(chatId) {
        alert(`Fonction archive non implémentée pour ${chatId}`);
    }

    deleteChat(chatId) {
        if (!confirm('Voulez-vous vraiment supprimer ce chat ?')) return;
        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) this.currentChatId = this.chats[0]?.id || null;
        this.renderChatList();
        if (this.currentChatId) this.openChat(this.currentChatId);
        else document.getElementById('chat-header').textContent = 'Sélectionnez un chat';
        document.getElementById('messages-container').innerHTML = '';
    }

    loadChatHistory() {
        // Exemple : charger depuis localStorage
        const saved = localStorage.getItem('myChats');
        if (saved) this.chats = JSON.parse(saved);
        if (this.chats.length) this.openChat(this.chats[0].id);
        this.renderChatList();
    }

    saveChatHistory() {
        localStorage.setItem('myChats', JSON.stringify(this.chats));
    }
}

window.addEventListener('beforeunload', () => {
    if (window.app) window.app.saveChatHistory();
});

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});
