class AIStudioApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.userId = this.getUserId();
        this.apiKey = this.getApiKey(); // clé Gemini

        this.initUI();
        this.loadChats();
        this.setupThemeToggle();
        this.setupSendMessage();
    }

    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    getApiKey() {
        // clé stockée dans config.js ou localStorage
        if (typeof CONFIG !== 'undefined' && CONFIG.API_KEYS.GEMINI) return CONFIG.API_KEYS.GEMINI;
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) return savedKey;
        console.warn("Clé Gemini non configurée");
        return null;
    }

    formatDate(date) {
        return new Date(date).toLocaleString('fr-FR', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'short' });
    }

    // ===== Chats =====
    async createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = { id: chatId, title: 'Nouveau chat ' + (this.chats.length + 1), messages: [], createdAt: new Date(), archived: false };
        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.renderChatList();
        this.openChat(chatId);
        await this.saveChat(newChat);
    }

    async saveChat(chat) {
        localStorage.setItem('chats', JSON.stringify(this.chats));
        if (!window.db) return;
        try {
            await window.db.collection('users').doc(this.userId)
                .collection('conversations').doc(chat.id).set(chat);
        } catch(e) { console.warn(e); }
    }

    async deleteChat(chatId) {
        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) this.currentChatId = null;
        this.renderChatList();
        localStorage.setItem('chats', JSON.stringify(this.chats));
        if (!window.db) return;
        try {
            await window.db.collection('users').doc(this.userId)
                .collection('conversations').doc(chatId).delete();
        } catch(e){ console.warn(e);}
    }

    async renameChatPrompt(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        const newName = prompt('Nom du chat:', chat.title);
        if (!newName) return;
        chat.title = newName;
        this.renderChatList();
        await this.saveChat(chat);
    }

    async archiveChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.archived = true;
        this.renderChatList();
        this.renderArchivedList();
        await this.saveChat(chat);
    }

    addMessageToChat(text, sender='user') {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;
        const message = { text, sender, createdAt: new Date() };
        chat.messages.push(message);
        this.renderMessages(chat.messages);
        this.saveChat(chat);

        if(sender==='user') this.getAIResponse(text); // appeler Gemini
    }

    async getAIResponse(userText) {
        if(!this.apiKey) {
            this.addMessageToChat("Erreur : Clé Gemini manquante", 'ai');
            return;
        }
        try {
            const response = await this.callGeminiAPI(userText);
            const aiText = response?.contents?.[0]?.parts?.[0]?.text || "Erreur : pas de réponse";
            this.addMessageToChat(aiText, 'ai');
        } catch(e) {
            console.error(e);
            this.addMessageToChat("Erreur lors de l'appel à l'IA", 'ai');
        }
    }

    // ===== Gemini API =====
    async callGeminiAPI(prompt, model='gemini-pro') {
        const url = `https://api.gemini.com/v1/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
        });
        if(!res.ok) throw new Error("Erreur API Gemini");
        return await res.json();
    }

    // ===== UI =====
    openChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        this.currentChatId = chatId;
        document.getElementById('chat-header').textContent = chat.title;
        this.renderMessages(chat.messages);
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        messages.forEach(m => {
            const div = document.createElement('div');
            div.className = 'message-bubble ' + (m.sender==='user'?'message-user':'message-ai');
            div.textContent = m.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }

    renderChatList() {
        const container = document.getElementById('chat-list');
        container.innerHTML = '';
        this.chats.filter(c=>!c.archived).forEach(chat=>{
            const div = document.createElement('div');
            div.className = 'chat-item flex justify-between items-center';
            div.innerHTML = `<span>${chat.title}</span>
                <div class="chat-menu">
                    <button onclick="app.archiveChat('${chat.id}')">🗄</button>
                    <button onclick="app.renameChatPrompt('${chat.id}')">✏️</button>
                    <button onclick="app.deleteChat('${chat.id}')">❌</button>
                </div>`;
            div.addEventListener('click',()=>this.openChat(chat.id));
            container.appendChild(div);
        });
    }

    renderArchivedList() {
        const container = document.getElementById('archived-list');
        container.innerHTML = '';
        this.chats.filter(c=>c.archived).forEach(chat=>{
            const div = document.createElement('div');
            div.className = 'archived-chat flex justify-between items-center';
            div.innerHTML = `<span>${chat.title}</span>
                <div class="chat-menu">
                    <button onclick="app.renameChatPrompt('${chat.id}')">✏️</button>
                    <button onclick="app.deleteChat('${chat.id}')">❌</button>
                </div>`;
            div.addEventListener('click',()=>this.openChat(chat.id));
            container.appendChild(div);
        });
    }

    async loadChats() {
        const saved = localStorage.getItem('chats');
        if(saved) this.chats = JSON.parse(saved);
        this.renderChatList();
        this.renderArchivedList();
        if(this.chats.length) this.openChat(this.chats[0].id);
    }

    showTab(tab) {
        ['chat','image','video'].forEach(t=>{
            const el = document.getElementById('tab-'+t);
            el.classList.toggle('hidden', t!==tab);
            document.querySelectorAll('.tab-btn').forEach(btn=>{
                btn.classList.toggle('active', btn.textContent.toLowerCase()===tab);
            });
        });
    }

    setupThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        btn.addEventListener('click',()=>{
            document.body.classList.toggle('theme-dark');
            document.body.classList.toggle('theme-light');
        });
    }

    setupSendMessage() {
        const input = document.getElementById('message-text');
        const btn = document.getElementById('send-btn');
        btn.addEventListener('click',()=>{
            if(input.value.trim()!=='') {
                this.addMessageToChat(input.value.trim());
                input.value = '';
            }
        });
        input.addEventListener('keypress',(e)=>{
            if(e.key==='Enter' && input.value.trim()!=='') {
                this.addMessageToChat(input.value.trim());
                input.value = '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});
