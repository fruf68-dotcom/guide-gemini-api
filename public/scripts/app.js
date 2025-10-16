class AIStudioApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.userId = this.getUserId();

        this.initUI();
        this.loadChats();
        this.setupThemeToggle();
    }

    // ================= UTILITAIRES =================
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    formatDate(date) {
        return new Date(date).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day:'2-digit', month:'short' });
    }

    // ================= CHATS =================
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
        this.openChat(chatId);
        await this.saveChat(newChat);
    }

    async saveChat(chat) {
        localStorage.setItem('chats', JSON.stringify(this.chats));
        if (!window.db) return;
        try {
            await window.db.collection('users').doc(this.userId)
                .collection('conversations').doc(chat.id)
                .set(chat);
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

    // ================= MESSAGES =================
    addMessageToChat(text, sender='user') {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;
        chat.messages.push({ text, sender, createdAt: new Date() });
        this.renderMessages(chat.messages);
        this.saveChat(chat);
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

    openChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        this.currentChatId = chatId;
        document.getElementById('chat-header').textContent = chat.title;
        this.renderMessages(chat.messages);
    }

    // ================= UI =================
    initUI() {
        // Bouton envoyer
        document.getElementById('send-btn').addEventListener('click', ()=>{
            const input = document.getElementById('message-text');
            if(input.value.trim()==='') return;
            this.addMessageToChat(input.value.trim());
            input.value='';
        });

        // Liste chats
        this.renderChatList();
        this.renderArchivedList();
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

    // ================= CHARGEMENT =================
    async loadChats() {
        const saved = localStorage.getItem('chats');
        if(saved) this.chats = JSON.parse(saved);
        this.renderChatList();
        this.renderArchivedList();
        if(this.chats.length) this.openChat(this.chats[0].id);

        if(!window.db) return;
        try {
            const snapshot = await window.db.collection('users').doc(this.userId)
                .collection('conversations').get();
            snapshot.docs.forEach(doc=>{
                const c = doc.data();
                if(!this.chats.find(x=>x.id===c.id)) this.chats.push(c);
            });
            this.renderChatList();
            this.renderArchivedList();
        } catch(e){console.warn(e);}
    }

    // ================= TABS =================
    showTab(tab) {
        ['chat','image','video'].forEach(t=>{
            const el = document.getElementById('tab-'+t);
            el.classList.toggle('hidden', t!==tab);
            document.querySelectorAll('.tab-btn').forEach(btn=>{
                btn.classList.toggle('active', btn.textContent.toLowerCase()===tab);
            });
        });
    }

    // ================= THEME =================
    setupThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        btn.addEventListener('click',()=>{
            document.body.classList.toggle('theme-dark');
            document.body.classList.toggle('theme-light');
        });
    }
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIStudioApp();
});
