import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import Sidebar from './components/Sidebar';
import VideoPanel from './components/VideoPanel';
import ImagePanel from './components/ImagePanel';
import AudioPanel from './components/AudioPanel';
import ChatPanel from './components/ChatPanel';

const App = () => {
    const [activePanel, setActivePanel] = useState('chat');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<{ id: string, title: string }[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'chats'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title || 'Nouvelle discussion' }));
            setChatHistory(history);
            if (!activeChatId && history.length > 0) {
                setActiveChatId(history[0].id);
            }
        });
        return unsubscribe;
    }, [activeChatId]);

    const createNewChat = async () => {
        const newChatRef = await addDoc(collection(db, 'chats'), { createdAt: serverTimestamp(), title: 'Nouvelle Discussion' });
        setActiveChatId(newChatRef.id);
        setActivePanel('chat');
    };

    const selectChat = (id: string) => {
        setActiveChatId(id);
        setActivePanel('chat');
    };

    const renderPanel = () => {
        switch (activePanel) {
            case 'video': return <VideoPanel />;
            case 'image': return <ImagePanel />;
            case 'audio': return <AudioPanel />;
            case 'chat': return <ChatPanel chatId={activeChatId} />;
            default: return <ChatPanel chatId={activeChatId} />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar
                activePanel={activePanel}
                setActivePanel={setActivePanel}
                chatHistory={chatHistory}
                activeChatId={activeChatId}
                selectChat={selectChat}
                createNewChat={createNewChat}
            />
            <main className="main-content">
                {renderPanel()}
            </main>
        </div>
    );
};

export default App;
