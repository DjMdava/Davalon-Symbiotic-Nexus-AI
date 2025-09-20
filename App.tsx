import React, { useState } from 'react';
import { Tab } from './types';
import Header from './components/Header';
import ImageGenerator from './components/ImageGenerator';
import VideoCreator from './components/VideoCreator';
import Chatbot from './components/Chatbot';
import ImageEditor from './components/ImageEditor';
import StoryCreator from './components/StoryCreator';
import Security from './components/Security';
import NexusDashboard from './components/NexusDashboard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Nexus);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Nexus:
        return <NexusDashboard />;
      case Tab.Image:
        return <ImageGenerator />;
      case Tab.Video:
        return <VideoCreator />;
      case Tab.Chat:
        return <Chatbot />;
      case Tab.ImageEditor:
        return <ImageEditor />;
      case Tab.Story:
        return <StoryCreator />;
      case Tab.Security:
        return <Security />;
      default:
        return <NexusDashboard />;
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="mt-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;