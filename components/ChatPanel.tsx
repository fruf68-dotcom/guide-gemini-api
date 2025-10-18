import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai'; // Uniquement pour le titre

interface ChatPanelProps {
    chatId: string | null;
}

interface Message {
    id: string;
    text: string;
    role: 'user' | 'model';
    createdAt: any;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chatId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (chatId) {
            const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                setMessages(msgs);
            }, (err) => {
                console.error("Error fetching messages:", err);
                setError("Could not load chat history.");
            });
            return () => unsubscribe();
        } else {
            setMessages([]);
        }
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatId || !input.trim() || loading) return;

        setLoading(true);
        setError(null);
        const userMessage = input.trim();
        setInput('');

        try {
            // 1. Ajouter le message de l'utilisateur à Firebase
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: userMessage,
                role: 'user',
                createdAt: serverTimestamp()
            });

            // 2. Récupérer l'historique pour l'envoyer à l'API
            const historySnapshot = await getDocs(query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt')));
            const history = historySnapshot.docs.map(doc => ({
                role: doc.data().role as 'user' | 'model',
                parts: [{ text: doc.data().text as string }]
            }));
            
            const chatHistoryForApi = history.length > 1 ? history.slice(0, -1) : [];
            
            // 3. Appeler notre propre API backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: chatHistoryForApi,
                    message: userMessage
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "La réponse de l'API était invalide.");
            }
            const modelResponseText = data.text;

            // 4. Ajouter la réponse du modèle à Firebase
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: modelResponseText,
                role: 'model',
                createdAt: serverTimestamp()
            });
            
            // 5. (Optionnel) Générer un titre pour la nouvelle discussion
            if (history.length <= 1) { 
                 const frontendApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                 if(frontendApiKey){
                    const ai = new GoogleGenAI({ apiKey: frontendApiKey });
                    const titleResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Generate a short, concise title (4-5 words max) for the following conversation. Just return the title, nothing else. \n\nUser: ${userMessage}\nAI: ${modelResponseText}`
                    });
                    if (titleResponse.text) {
                        const chatRef = doc(db, 'chats', chatId);
                        await updateDoc(chatRef, { title: titleResponse.text.replace(/"/g, '').trim() });
                    }
                 }
            }

        } catch (err) {
            console.error(err);
            const errorMessage = "Désolé, une erreur est survenue. Veuillez réessayer.";
            setError((err as Error).message || errorMessage);
            // On peut aussi ajouter le message d'erreur dans le chat pour l'utilisateur
            if (chatId) {
                await addDoc(collection(db, 'chats', chatId, 'messages'), {
                    text: (err as Error).message || errorMessage,
                    role: 'model',
                    createdAt: serverTimestamp()
                });
            }
        } finally {
            setLoading(false);
        }
    };
    
    if (!chatId) {
        return <div className="panel-container panel-centered"><p>Veuillez sélectionner une discussion ou en créer une nouvelle pour commencer.</p></div>;
    }

    return (
        <div className="chat-panel">
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-bubble-container ${msg.role}`}>
                        <div className="message-bubble">{msg.text}</div>
                    </div>
                ))}
                 {loading && (
                    <div className="message-bubble-container model">
                        <div className="message-bubble loading-dots">
                           <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {error && <div className="alert-error-chat">{error}</div>}
            <form onSubmit={handleSendMessage} className="message-form">
                <textarea
                    className="textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Envoyer un message..."
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e as any);
                        }
                    }}
                    disabled={loading}
                />
                <button type="submit" className="button button-primary send-button" disabled={loading || !input.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 3.105a1.5 1.5 0 011.995-.29l12 6a1.5 1.5 0 010 2.77l-12 6A1.5 1.5 0 013 16.5v-12a1.5 1.5 0 01.105-.795z" /></svg>
                </button>
            </form>
        </div>
    );
};

export default ChatPanel;