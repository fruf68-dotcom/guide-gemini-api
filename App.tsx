import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './features/Chat';
import ImageGenerator from './features/ImageGenerator';
import VideoGenerator from './features/VideoGenerator';

type View = 'chat' | 'image' | 'video';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('chat');

  const renderView = () => {
    switch (activeView) {
      case 'image':
        return <ImageGenerator />;
      case 'video':
        return <VideoGenerator />;
      case 'chat':
      default:
        return <Chat />;
    }
  };

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text-primary font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 md:px-8 md:py-12 h-full">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
