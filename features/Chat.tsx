import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat as GeminiChat } from "@google/genai";
import { Send, Sparkles } from '../components/Icons';
import Spinner from '../components/Spinner';

// Initialisez l'API Gemini. La clé API est gérée via les variables d'environnement.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<GeminiChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const startChat = () => {
    if (!chatRef.current) {
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a helpful and creative AI assistant. Answer in French.',
            },
        });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    startChat();

    try {
      const stream = await chatRef.current!.sendMessageStream({ message: input });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]); 

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
      }
    } catch (err) {
      console.error(err);
      setError("Désolé, une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto pr-4 -mr-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center my-auto flex flex-col items-center justify-center h-full">
            <Sparkles className="h-16 w-16 text-brand-secondary mb-4" />
            <h2 className="text-2xl font-bold text-brand-text-primary">Commencez à discuter</h2>
            <p className="text-brand-text-secondary">Posez-moi une question ou donnez-moi une instruction.</p>
          </div>
        )}
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center"><Sparkles className="h-5 w-5 text-white"/></div>}
              <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-brand-surface text-brand-text-primary rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
             <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center"><Sparkles className="h-5 w-5 text-white"/></div>
              <div className="max-w-xl p-4 rounded-2xl bg-brand-surface text-brand-text-primary rounded-bl-none flex items-center">
                  <Spinner />
              </div>
            </div>
          )}
           <div ref={messagesEndRef} />
        </div>
        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      </div>
      <form onSubmit={handleSendMessage} className="mt-6">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
            }}
            placeholder="Écrivez votre message ici..."
            rows={1}
            className="w-full bg-brand-surface border border-gray-700/50 rounded-lg py-3 pl-4 pr-14 resize-none focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all duration-200"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-opacity-80 transition-colors">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
