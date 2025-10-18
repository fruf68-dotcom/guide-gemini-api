import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI, Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
    chatId: string | null;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'model';
    timestamp: any;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chatId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initializeChat = async () => {
            if (chatId) {
                const messagesRef = collection(db, 'chats', chatId, 'messages');
                const q = query(messagesRef, orderBy('timestamp'));
                const initialSnapshot = await getDocs(q);
                const initialMessages = initialSnapshot.docs.map(doc => doc.data() as Omit<Message, 'id'>);

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const chatSession = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: initialMessages.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    }))
                });
                setChat(chatSession);
            }
        };
        initializeChat();
    }, [chatId]);

    useEffect(() => {
        if (chatId) {
            const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                setMessages(msgs);
            });
            return unsubscribe;
        } else {
            setMessages([]);
        }
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatId || loading || !chat) return;

        const isFirstMessage = messages.length === 0;
        const userInput = input;
        setInput('');

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: userInput,
            sender: 'user',
            timestamp: serverTimestamp(),
        });

        setLoading(true);
        try {
            const result = await chat.sendMessage({ message: userInput });

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: result.text ?? "Désolé, une réponse n'a pas pu être générée.",
                sender: 'model',
                timestamp: serverTimestamp(),
            });

            if (isFirstMessage) {
                const titleAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const titleResponse = await titleAi.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Generate a short, concise title (4 words max) for this user prompt: "${userInput}"`
                });
                const newTitle = titleResponse.text?.replace(/"/g, '').trim();
                if (newTitle) {
                    await updateDoc(doc(db, 'chats', chatId), { title: newTitle });
                }
            }
        } catch (error) {
            console.error("Error sending message to Gemini: ", error);
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: "Désolé, une erreur est survenue. Veuillez réessayer.",
                sender: 'model',
                timestamp: serverTimestamp(),
            });
        } finally {
            setLoading(false);
        }
    };

    if (!chatId) {
        return <div className="placeholder-text">Sélectionnez une discussion ou commencez-en une nouvelle.</div>;
    }

    return (
        <div className="chat-panel">
            <div className="chat-messages">
                <div className="chat-messages-inner">
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-message ${msg.sender}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                    ))}
                    {loading && messages[messages.length - 1]?.sender === 'user' && (
                        <div className="chat-message model">...</div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="chat-input-area">
                <form onSubmit={handleSendMessage} className="chat-input-form">
                    <input
                        type="text"
                        className="input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Envoyer un message..."
                        disabled={loading}
                    />
                    <button type="submit" className="button button-primary" disabled={loading || !input.trim()}>
                        {loading ? '...' : 'Envoyer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;