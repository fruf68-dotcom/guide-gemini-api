import React from 'react';
import { doc, updateDoc, getDocs, deleteDoc, collection, query } from 'firebase/firestore';
import { db } from '../firebase';

// --- SVG Icons ---
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>;
const AudioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

interface SidebarProps {
    activePanel: string;
    setActivePanel: (panel: string) => void;
    chatHistory: { id: string, title: string }[];
    activeChatId: string | null;
    selectChat: (id: string) => void;
    createNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePanel, setActivePanel, chatHistory, activeChatId, selectChat, createNewChat }) => {
    
    const handleRenameChat = async (chatId: string, currentTitle: string) => {
        const newTitle = window.prompt("Entrez le nouveau nom pour la discussion :", currentTitle);
        if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
            try {
                await updateDoc(doc(db, 'chats', chatId), { title: newTitle.trim() });
            } catch (error) {
                console.error("Erreur lors du renommage : ", error);
                alert("Une erreur est survenue lors du renommage.");
            }
        }
    };

    const handleDeleteChat = async (chatIdToDelete: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette discussion ? Cette action est irréversible.`)) return;
        try {
            const messagesQuery = query(collection(db, 'chats', chatIdToDelete, 'messages'));
            const messagesSnapshot = await getDocs(messagesQuery);
            const deletePromises = messagesSnapshot.docs.map(messageDoc => deleteDoc(messageDoc.ref));
            await Promise.all(deletePromises);
            await deleteDoc(doc(db, 'chats', chatIdToDelete));
        } catch (error) {
            console.error("Erreur lors de la suppression de la discussion : ", error);
            alert("Une erreur est survenue lors de la suppression.");
        }
    };
    
    const NavLink = ({ panel, icon, label }: { panel: string, icon: React.ReactElement, label: string }) => (
        <button onClick={() => setActivePanel(panel)} className={`nav-link ${activePanel === panel ? 'active' : ''}`}>
            <span className="nav-link-icon">{icon}</span> {label}
        </button>
    );

    return (
        <aside className="sidebar">
            <h1 className="sidebar-title">Fabrice Studio</h1>
            <nav className="sidebar-nav">
                <NavLink panel="video" icon={<VideoIcon />} label="Vidéo" />
                <NavLink panel="image" icon={<ImageIcon />} label="Image" />
                <NavLink panel="audio" icon={<AudioIcon />} label="Audio" />
            </nav>
            <hr className="divider"/>
            <div className="chat-history-header">
                 <h2 className="chat-history-title">Discussions</h2>
                 <button onClick={createNewChat} title="Nouvelle discussion" className="button-new-chat">+</button>
            </div>
            <div className="chat-history-list">
                {chatHistory.map(chat => (
                    <div key={chat.id} className={`chat-history-item-container ${activeChatId === chat.id && activePanel === 'chat' ? 'active' : ''}`}>
                       <div onClick={() => selectChat(chat.id)} className="chat-history-item">
                            {chat.title}
                       </div>
                       <div className="chat-history-actions">
                            <button onClick={(e) => {e.stopPropagation(); handleRenameChat(chat.id, chat.title);}} title="Renommer" className="chat-history-action-btn"><PencilIcon/></button>
                            <button onClick={(e) => {e.stopPropagation(); handleDeleteChat(chat.id);}} title="Supprimer" className="chat-history-action-btn"><TrashIcon/></button>
                       </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

export default Sidebar;