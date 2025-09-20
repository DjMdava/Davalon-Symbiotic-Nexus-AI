import React from 'react';

const AIAvatar: React.FC<{ className?: string; isSpeaking?: boolean }> = ({ className, isSpeaking }) => {
  return (
    <div className={`group relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg shadow-cyan-500/10 border border-slate-600/50 overflow-hidden transition-all duration-300 ${className} ${isSpeaking ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
      <div className={`absolute inset-0.5 rounded-full bg-cyan-400/10 blur-lg transition-all duration-300 ${isSpeaking ? 'animate-pulse' : 'group-hover:blur-xl'}`}></div>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
        <path d="M12 11.5C15.3137 11.5 18 8.81371 18 5.5C18 2.18629 15.3137 -0.5 12 -0.5C8.68629 -0.5 6 2.18629 6 5.5C6 8.81371 8.68629 11.5 12 11.5Z" transform="translate(0 3)" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18.5 13H5.5C3.84315 13 2.5 14.3431 2.5 16V20C2.5 21.6569 3.84315 23 5.5 23H18.5C20.1569 23 21.5 21.6569 21.5 20V16C21.5 14.3431 20.1569 13 18.5 13Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 17.5L14 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9.5 8C9.5 8.27614 9.27614 8.5 9 8.5C8.72386 8.5 8.5 8.27614 8.5 8C8.5 7.72386 8.72386 7.5 9 7.5C9.27614 7.5 9.5 7.72386 9.5 8Z" fill="currentColor"/>
        <path d="M15.5 8C15.5 8.27614 15.2761 8.5 15 8.5C14.7239 8.5 14.5 8.27614 14.5 8C14.5 7.72386 14.7239 7.5 15 7.5C15.2761 7.5 15.5 7.72386 15.5 8Z" fill="currentColor"/>
      </svg>
    </div>
  );
};

export default AIAvatar;