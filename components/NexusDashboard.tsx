// FIX: Create the NexusDashboard.tsx component.
// This resolves the "File ... is not a module" error in App.tsx.
import React from 'react';
import { Icon, IconName } from './Icon';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: IconName;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-slate-800/50 hover:bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 text-left w-full"
  >
    <div className="flex items-start gap-4">
      <div className="bg-slate-700/50 p-3 rounded-lg">
        <Icon name={icon} className="w-6 h-6 text-teal-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      </div>
    </div>
  </button>
);


interface SuggestionCardProps {
  title: string;
  description: string;
  icon: IconName;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ title, description, icon }) => (
  <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700/50 flex items-start gap-4">
    <div className="bg-slate-700/50 p-2.5 rounded-lg mt-1">
      <Icon name={icon} className="w-5 h-5 text-cyan-400" />
    </div>
    <div>
      <h4 className="font-semibold text-slate-200">{title}</h4>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  </div>
);

const NexusDashboard: React.FC = () => {
  // This is a static dashboard inspired by the "Blueprint" document. 
  // In a real application, the suggestions and actions would be dynamic and interactive.
  
  return (
    <div className="p-8 animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-100">Welcome to the Nexus</h2>
        <p className="text-slate-400 mt-2">Your central hub for symbiotic intelligence. What can I help you with today?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">Proactive Intelligence Core</h3>
          <div className="space-y-4">
            <SuggestionCard 
              icon="light-bulb"
              title="Creative Spark"
              description="You've been working on a fantasy story. How about generating an image of your main character to inspire you?"
            />
            <SuggestionCard
              icon="refresh"
              title="Workflow Optimization"
              description="You often switch between the Chatbot and Image Editor. Consider using the Chatbot's vision capabilities to describe edits."
            />
             <SuggestionCard
              icon="clipboard-list"
              title="Project Summary"
              description="It's been a week since your last video project. Would you like me to generate a summary of your recent creative work?"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">Quick Actions</h3>
          <div className="space-y-4">
             <QuickActionCard
              title="AI Chatbot"
              description="Engage in dynamic conversation, analyze text, and get detailed answers."
              icon="chat"
              onClick={() => alert("This would navigate to the AI Chatbot tab.")}
            />
            <QuickActionCard
              title="Image Generator"
              description="Create stunning, high-quality images from simple text prompts."
              icon="image"
              onClick={() => alert("This would navigate to the Image Generator tab.")}
            />
             <QuickActionCard
              title="Video Creator"
              description="Bring your ideas to life by generating professional video clips."
              icon="video"
              onClick={() => alert("This would navigate to the Video Creator tab.")}
            />
          </div>
        </div>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-800">
        <h3 className="text-xl font-bold text-slate-200 mb-4 text-center">Nexus Status</h3>
        <div className="flex flex-wrap justify-center items-center gap-6 p-4 bg-slate-900/50 rounded-lg max-w-md mx-auto">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-slate-300 font-medium">Symbiotic Learning Engine:</span>
                <span className="text-green-400">Online</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                 <span className="text-slate-300 font-medium">Gemini API:</span>
                <span className="text-cyan-400">Connected</span>
            </div>
        </div>
      </div>

    </div>
  );
};

export default NexusDashboard;
