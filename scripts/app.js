// scripts/app.js - Code principal de l'application
class AIStudioApp {
  constructor() {
    this.apiKey = this.getApiKey();
    setTimeout(() => this.initChatSystem(), 1000);
    this.init();
  }

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
      this.showApiKeyModal();
    }
  }

  showApiKeyModal() {
    console.log("Clé API manquante - Veuillez configurer scripts/config.js");
  }

  setupEventListeners() {
    // Nouveau chat
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => this.createNewChat());
    }

    // Autres outils éventuels
    document.getElementById('start-creating')?.addEventListener('click', () => {
      this.openTool('image');
    });
  }

  openTool(toolType) {
    console.log(`Ouverture de l'outil: ${toolType}`);
  }

  async callGeminiAPI(prompt, model = 'gemini-pro') {
    if (!this.apiKey) throw new Error('Clé API Gemini non configurée');

    try {
      const response = await fetch(
        `${CONFIG.API_URLS.GEMINI}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l’appel à Gemini:', error);
      throw error;
    }
  }

  // === GESTION DES CHATS ===
  initChatSystem() {
    console.log("🗂️ Initialisation du système de chats...");
    this.currentChatId = null;
    this.chats = [];
    this.loadChatHistory();
  }

  async createNewChat() {
    try {
      console.log("🆕 Création d’un nouveau chat...");
      if (!window.db) {
        console.error("Firestore non initialisé.");
        return;
      }
      if (!window.auth || !window.auth.currentUser) {
        alert("Veuillez vous connecter pour créer un chat.");
        return;
      }

      const chatId = 'chat_' + Date.now();
      const newChat = {
        id: chatId,
        title: 'Nouveau chat ' + (this.chats.length + 1),
        createdAt: new Date(),
        messages: [],
        userId: window.auth.currentUser.uid,
      };

      this.chats.unshift(newChat);
      this.currentChatId = chatId;
      await this.saveChatToFirestore(newChat);
      this.renderChatList();

      console.log("✅ Chat créé avec succès:", chatId);
    } catch (error) {
      console.error("Erreur création chat:", error);
    }
  }

  async saveChatToFirestore(chat) {
    if (!window.db) return;
    const userId = this.getUserId();
    await window.db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .doc(chat.id)
      .set(chat);
  }

  async loadChatHistory() {
    try {
      if (!window.db || !window.auth || !window.auth.currentUser) return;
      const userId = window.auth.currentUser.uid;
      const snapshot = await window.db
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .orderBy('createdAt', 'desc')
        .get();

      this.chats = snapshot.docs.map(doc => doc.data());
      this.renderChatList();
      console.log("💬 Historique chargé:", this.chats.length, "chats");
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  }

  getUserId() {
    if (window.auth?.currentUser) return window.auth.currentUser.uid;
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'anon_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  renderChatList() {
    const sidebar = document.getElementById('chat-list');
    if (!sidebar) return;
    sidebar.innerHTML = this.chats
      .map(chat => `
        <div class="chat-item p-2 mb-2 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition">
          ${chat.title}
        </div>`)
      .join('');
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AIStudioApp();
});
