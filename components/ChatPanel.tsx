import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { withApiKeyRotation } from '../utils/apiKeyManager';

// @ts-ignore
// Fix: Explicitly type SpeechRecognition as 'any' to resolve construct signature error.
const SpeechRecognition: any = window.SpeechRecognition || window.webkitSpeechRecognition;

// --- SVG Icons ---
const MicIcon = ({ isListening }: { isListening: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isListening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);


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
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);


    useEffect(() => {
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'fr-FR';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
            };
        }
    }, []);

    const handleToggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInput('');
            recognitionRef.current.start();
        }
    };

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
        if (!input.trim() || !chatId || loading) return;

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
            const history = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
            
            const result = await withApiKeyRotation(async (apiKey) => {
                const ai = new GoogleGenAI({ apiKey });
                const chatSession = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: history,
                });
                return await chatSession.sendMessage({ message: userInput });
            });

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: result.text ?? "Désolé, une réponse n'a pas pu être générée.",
                sender: 'model',
                timestamp: serverTimestamp(),
            });

            if (isFirstMessage) {
                const titleResponse = await withApiKeyRotation(async (apiKey) => {
                    const titleAi = new GoogleGenAI({ apiKey });
                    return titleAi.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Generate a short, concise title (4 words max) for this user prompt: "${userInput}"`
                    });
                });
                const newTitle = titleResponse.text?.replace(/"/g, '').trim();
                if (newTitle) {
                    await updateDoc(doc(db, 'chats', chatId), { title: newTitle });
                }
            }
        } catch (error) {
            console.error("Error sending message to Gemini: ", error);
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: `Désolé, une erreur est survenue: ${(error as Error).message}`,
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
                        <div className="chat-message model">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
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
                    {SpeechRecognition && (
                         <button type="button" onClick={handleToggleListening} className={`button-icon ${isListening ? 'listening' : ''}`} title="Saisie vocale" disabled={loading}>
                            <MicIcon isListening={isListening} />
                        </button>
                    )}
                    <button type="submit" className="button button-primary" disabled={loading || !input.trim()}>
                        {loading ? '...' : 'Envoyer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;