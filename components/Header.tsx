import React from 'react';
import { Tab } from '../types';
import { Icon } from './Icon';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const NavButton: React.FC<{
  label: string;
  icon: 'hub' | 'image' | 'video' | 'chat' | 'edit-image' | 'book-open' | 'shield';
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-all duration-300 ${
      isActive
        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
    }`}
  >
    <Icon name={icon} className="w-5 h-5" />
    {label}
  </button>
);

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
          Davalon Symbiotic Nexus AI
        </h1>
        <p className="text-slate-400 mt-3 text-lg">The Quantum Leap in Human-AI Partnership</p>
      </div>
      <nav className="flex justify-center bg-slate-800/60 p-2 rounded-xl backdrop-blur-sm border border-slate-700/50">
        <div className="flex flex-wrap justify-center gap-2">
           <NavButton
            label="Nexus View"
            icon="hub"
            isActive={activeTab === Tab.Nexus}
            onClick={() => setActiveTab(Tab.Nexus)}
          />
           <NavButton
            label="AI Chatbot"
            icon="chat"
            isActive={activeTab === Tab.Chat}
            onClick={() => setActiveTab(Tab.Chat)}
          />
          <NavButton
            label="Image Generator"
            icon="image"
            isActive={activeTab === Tab.Image}
            onClick={() => setActiveTab(Tab.Image)}
          />
          <NavButton
            label="Video Creator"
            icon="video"
            isActive={activeTab === Tab.Video}
            onClick={() => setActiveTab(Tab.Video)}
          />
          <NavButton
            label="Image Editor"
            icon="edit-image"
            isActive={activeTab === Tab.ImageEditor}
            onClick={() => setActiveTab(Tab.ImageEditor)}
          />
          <NavButton
            label="Story Creator"
            icon="book-open"
            isActive={activeTab === Tab.Story}
            onClick={() => setActiveTab(Tab.Story)}
          />
          <NavButton
            label="Blueprint"
            icon="shield"
            isActive={activeTab === Tab.Security}
            onClick={() => setActiveTab(Tab.Security)}
          />
        </div>
      </nav>
    </header>
  );
};

export default Header;