import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '../firebase';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface ChatPanelProps {
    chatId: string | null;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chatId }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentModelResponse, setCurrentModelResponse] = useState('');

    useEffect(() => {
        if (!chatId) return;

        setMessages([]);
        setCurrentModelResponse('');

        const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        chatRef.current = ai.chats.create({ model: 'gemini-2.5-flash' });
        
        return () => unsubscribe();
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, currentModelResponse]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatId || loading) return;

        const userMessageContent = input;
        const userMessage = { role: 'user', content: userMessageContent, timestamp: serverTimestamp() };
        
        setInput('');
        setLoading(true);
        
        await addDoc(collection(db, 'chats', chatId, 'messages'), userMessage);
        
        try {
            if (!chatRef.current) throw new Error("Chat not initialized");
            const stream = await chatRef.current.sendMessageStream({ message: userMessageContent });
            let accumulatedResponse = '';
            
            for await (const chunk of stream) {
                accumulatedResponse += chunk.text;
                setCurrentModelResponse(accumulatedResponse + '...');
            }
            
            await addDoc(collection(db, 'chats', chatId, 'messages'), { role: 'model', content: accumulatedResponse, timestamp: serverTimestamp() });

        } catch (error) {
            console.error(error);
            const errorMessage = "Désolé, une erreur est survenue.";
            await addDoc(collection(db, 'chats', chatId, 'messages'), { role: 'model', content: errorMessage, timestamp: serverTimestamp() });
        } finally {
            setCurrentModelResponse('');
            setLoading(false);
        }
    };
    
    if (!chatId) return <div className="placeholder-text">Sélectionnez ou créez une nouvelle discussion pour commencer.</div>

    return (
        <div className="chat-panel">
            <div className="chat-messages">
                <div className="chat-messages-inner">
                    {messages.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.role}`}>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                    ))}
                    {currentModelResponse && (
                         <div className="chat-message model">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentModelResponse}</ReactMarkdown>
                         </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="chat-input-area">
                <form onSubmit={sendMessage} className="chat-input-form">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Envoyer un message..." className="input" disabled={loading}/>
                    <button type="submit" disabled={loading || !input.trim()} className="button button-primary">Envoyer</button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
