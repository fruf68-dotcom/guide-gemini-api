import React from 'react';
import { MessageSquare, Image, Video, Sparkles } from './Icons';

type View = 'chat' | 'image' | 'video';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-primary/20 text-brand-primary'
        : 'text-brand-text-secondary hover:bg-brand-surface hover:text-brand-text-primary'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span className="ml-4 font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  return (
    <aside className="w-64 bg-brand-surface/50 border-r border-gray-800/50 p-4 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2 px-2 pb-6 mb-6 border-b border-gray-800/50">
        <Sparkles className="h-7 w-7 text-brand-primary" />
        <h1 className="text-xl font-bold text-brand-text-primary">
          AI Studio
        </h1>
      </div>
      <nav className="flex flex-col gap-2">
        <NavItem
          icon={<MessageSquare className="h-5 w-5" />}
          label="Chat"
          isActive={activeView === 'chat'}
          onClick={() => setActiveView('chat')}
        />
        <NavItem
          icon={<Image className="h-5 w-5" />}
          label="Générateur d'Images"
          isActive={activeView === 'image'}
          onClick={() => setActiveView('image')}
        />
        <NavItem
          icon={<Video className="h-5 w-5" />}
          label="Générateur de Vidéos"
          isActive={activeView === 'video'}
          onClick={() => setActiveView('video')}
        />
      </nav>
      <footer className="mt-auto text-center text-xs text-brand-text-secondary/50">
         <p>&copy; {new Date().getFullYear()} AI Studio</p>
      </footer>
    </aside>
  );
};

export default Sidebar;
