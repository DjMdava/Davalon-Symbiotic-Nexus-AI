import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { Message, MessagePart, defaultPersonas, ChatSession } from '../types';
import { usePersonas } from '../hooks/usePersona';
import Spinner from './Spinner';
import { Icon } from './Icon';
import AIAvatar from './AIAvatar';
import { ai } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

// FIX: Define a minimal interface for the SpeechRecognition API to resolve TypeScript error.
// The browser's SpeechRecognition API is not standard in all TypeScript DOM library versions.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  stop: () => void;
  start: () => void;
}

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [, data] = result.split(',');
      const mimeType = file.type;
      resolve({ mimeType, data });
    };
    reader.onerror = (error) => reject(error);
  });
};

const simulatedModels: Record<string, { id: string; name: string; description: string }> = {
  flash: { id: 'flash', name: 'Nexus QLM - Flash', description: 'Fast, for general tasks.' },
  pro: { id: 'pro', name: 'Nexus QLM - Pro', description: 'Advanced, for deep reasoning.' },
  vision: { id: 'vision', name: 'Nexus QLM - Vision', description: 'Specialized, for image analysis.' },
};

const CHAT_SESSIONS_KEY = 'nexus-chat-sessions';

const Chatbot: React.FC = () => {
  const { personas } = usePersonas();
  const [activePersonaId, setActivePersonaId] = useState<string>('Nexus');
  const [activeModelId, setActiveModelId] = useState<string>('flash');
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speakingMessage, setSpeakingMessage] = useState<{ text: string, index: number } | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // FIX: Implement handleImageAttach to handle file selection for image attachments.
  const handleImageAttach = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setError(null);
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const activePersona = personas[activePersonaId] || defaultPersonas.Nexus;
  const activeModel = simulatedModels[activeModelId];
  const activeSession = activeSessionId ? sessions[activeSessionId] : null;

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (e) {
      console.error("Failed to load chat sessions:", e);
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save chat sessions:", e);
    }
  }, [sessions]);

  // Initialize a new chat session
  const initializeNewChat = useCallback((personaId: string, modelId: string) => {
    const persona = personas[personaId] || defaultPersonas.Nexus;
    const model = simulatedModels[modelId];

    let systemInstruction = persona.instruction;
    if (model.id === 'pro') systemInstruction += "\nFocus on providing deep, thoughtful, and well-structured answers.";
    else if (model.id === 'vision') systemInstruction += "\nYou are a world-class expert at analyzing images with extreme detail. When an image is provided, describe it with a sharp eye for subtleties.";
    
    chatRef.current = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    setError(null);
  }, [personas]);

  // Start a new chat, creating a new session
  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    initializeNewChat(activePersonaId, activeModelId);
  }, [activePersonaId, activeModelId, initializeNewChat]);

  // Load an existing session
  const handleSelectSession = useCallback((sessionId: string) => {
    const session = sessions[sessionId];
    if (session) {
        setActiveSessionId(sessionId);
        setActivePersonaId(session.personaId);
        setActiveModelId(session.modelId);
        initializeNewChat(session.personaId, session.modelId);
        // This is a simplified history load. A real implementation would re-feed the history to the model.
        // For this app, we just display it.
    }
  }, [sessions, initializeNewChat]);
  
  // Speech Recognition and Synthesis setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setInput(prev => (prev + ' ' + finalTranscript).trim());
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoiceURI) {
            setSelectedVoiceURI(availableVoices[0].voiceURI);
        }
    };
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      recognitionRef.current?.stop();
      speechSynthesis.cancel();
      speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm("Are you sure you want to delete this chat session?")) {
        setSessions(prev => {
            const newSessions = { ...prev };
            delete newSessions[sessionId];
            return newSessions;
        });
        if (activeSessionId === sessionId) {
            handleNewChat();
        }
    }
  };
  
  const handleRenameSession = (sessionId: string, newName: string) => {
    setSessions(prev => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], name: newName },
    }));
    setRenamingSessionId(null);
  };

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && !attachedImage) || loading) return;

    setLoading(true);
    setError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userParts: MessagePart[] = [];
    if (attachedImage) {
        try {
            const { mimeType, data } = await fileToBase64(attachedImage);
            userParts.push({ inlineData: { mimeType, data } });
        } catch (e) { setError("Failed to process image file."); setLoading(false); return; }
    }
    if (input.trim()) userParts.push({ text: input });
    
    const userMessage: Message = { role: 'user', parts: userParts };
    
    let currentSessionId = activeSessionId;
    // Create new session if one isn't active
    if (!currentSessionId) {
        currentSessionId = Date.now().toString();
        const newSession: ChatSession = {
            id: currentSessionId,
            name: input.trim().substring(0, 30) || "Image Analysis",
            messages: [{ role: 'model', parts: [{ text: activePersona.welcomeMessage }] }],
            personaId: activePersonaId,
            modelId: activeModelId,
        };
        setSessions(prev => ({ ...prev, [currentSessionId!]: newSession }));
        setActiveSessionId(currentSessionId);
    }
    
    setSessions(prev => ({
        ...prev,
        [currentSessionId!]: { ...prev[currentSessionId!], messages: [...prev[currentSessionId!].messages, userMessage] }
    }));
    
    setInput('');
    setAttachedImage(null);
    setAttachedImageUrl(null);

    try {
      if (!chatRef.current) throw new Error("Chat not initialized");
      
      const stream = await chatRef.current.sendMessageStream({ message: userParts });

      // Add empty model message to start appending to
      setSessions(prev => ({
          ...prev, [currentSessionId!]: { ...prev[currentSessionId!], messages: [...prev[currentSessionId!].messages, { role: 'model', parts: [{ text: '' }] }] }
      }));

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        setSessions(prev => {
            const newSessions = { ...prev };
            const session = newSessions[currentSessionId!];
            const lastMessage = session.messages[session.messages.length - 1];
            if (lastMessage.role === 'model' && lastMessage.parts[0].text !== undefined) {
               lastMessage.parts[0].text += chunkText;
            }
            return newSessions;
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An error occurred.";
      setError(errorMessage);
       setSessions(prev => ({
           ...prev,
           [currentSessionId!]: { ...prev[currentSessionId!], messages: [...prev[currentSessionId!].messages, { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${errorMessage}` }] }] }
       }));
    } finally {
      setLoading(false);
    }
  }, [input, loading, attachedImage, isListening, activeSessionId, activePersonaId, activeModelId, activePersona.welcomeMessage]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) { setError("Voice input is not supported on this browser."); return; }
    if (isListening) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleReadAloud = useCallback((text: string, index: number) => {
    if (speechSynthesis.speaking && speakingMessage?.index === index) {
      speechSynthesis.cancel();
      setSpeakingMessage(null);
      return;
    }
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.onend = () => setSpeakingMessage(null);
    utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setError("Sorry, I was unable to read that aloud.");
        setSpeakingMessage(null);
    }
    setSpeakingMessage({ text, index });
    speechSynthesis.speak(utterance);
  }, [speakingMessage, selectedVoiceURI, voices]);

  const MessageBubble: React.FC<{ message: Message, index: number }> = ({ message, index }) => {
    const isUser = message.role === 'user';
    const isMessageSpeaking = !isUser && speakingMessage?.index === index;
    const canSpeak = !isUser && message.parts.some(p => p.text && p.text.trim().length > 0);
    const welcomeIndex = (activeSession?.messages[0]?.parts[0]?.text === message.parts[0]?.text) ? 0 : index;


    return (
      <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && <AIAvatar isSpeaking={isMessageSpeaking} />}
        <div className={`group relative max-w-xl p-3 px-4 rounded-2xl shadow-md ${isUser ? 'bg-teal-600 text-white rounded-br-lg' : 'bg-slate-700/60 text-slate-200 rounded-bl-lg'}`}>
          {message.parts.map((part, partIndex) => (
            <div key={partIndex}>
              {part.text && (
                <div className="prose prose-invert prose-p:my-0 prose-p:leading-relaxed prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-1">
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
              )}
              {part.inlineData && (
                <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="User upload" className="mt-2 rounded-lg max-w-full sm:max-w-xs" />
              )}
            </div>
          ))}
          {canSpeak && (
             <button
              onClick={() => handleReadAloud(message.parts.map(p => p.text).join(' '), welcomeIndex)}
              className={`absolute -bottom-4 -right-2 p-1.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-teal-400 transition-all opacity-0 group-hover:opacity-100 ${isMessageSpeaking ? 'opacity-100 text-teal-400' : ''}`}
              title={isMessageSpeaking ? 'Stop reading' : 'Read aloud'}
            >
              <Icon name={isMessageSpeaking ? 'speaker-off' : 'speaker-on'} className="w-4 h-4" />
            </button>
          )}
        </div>
        {isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center shadow-md border border-slate-500/50">
            <Icon name="user" className="w-6 h-6 text-slate-200" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-250px)] max-h-[800px]">
        {/* Sessions Sidebar */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
            <div className="p-2 border-b border-slate-800">
                <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-teal-500/80 text-white hover:bg-teal-500">
                    <Icon name="sparkles" className="w-4 h-4" />
                    New Chat
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.values(sessions).sort((a, b) => Number(b.id) - Number(a.id)).map(session => (
                    <div key={session.id} onDoubleClick={() => setRenamingSessionId(session.id)} className={`group relative w-full text-left p-2 rounded-md text-sm cursor-pointer ${activeSessionId === session.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`} onClick={() => handleSelectSession(session.id)}>
                        {renamingSessionId === session.id ? (
                            <input
                                type="text"
                                defaultValue={session.name}
                                onBlur={(e) => handleRenameSession(session.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession(session.id, e.currentTarget.value) }}
                                className="w-full bg-slate-800 text-white p-1 rounded"
                                autoFocus
                            />
                        ) : (
                            <p className="truncate pr-6">{session.name}</p>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon name="trash" className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-slate-700/50 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-slate-100 shrink-0">AI Chatbot</h2>
            <div className="flex items-start gap-2 sm:gap-4 flex-wrap">
              <div>
                <select value={activeModelId} onChange={(e) => { setActiveModelId(e.target.value); handleNewChat(); }} className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 transition-shadow duration-200 appearance-none text-slate-200 text-sm" disabled={loading}>
                  {Object.values(simulatedModels).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1 pl-1">{activeModel.description}</p>
              </div>
              <div>
                <select value={activePersonaId} onChange={(e) => { setActivePersonaId(e.target.value); handleNewChat(); }} className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 transition-shadow duration-200 appearance-none text-slate-200 text-sm" disabled={loading}>
                  {Object.values(personas).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                 <select value={selectedVoiceURI ?? ''} onChange={(e) => setSelectedVoiceURI(e.target.value)} className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 transition-shadow duration-200 appearance-none text-slate-200 text-sm" disabled={voices.length === 0}>
                  {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1 pl-1">AI Voice</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeSession ? activeSession.messages.map((msg, i) => <MessageBubble key={`${activeSessionId}-${i}`} message={msg} index={i} />) : 
              <div className="flex items-start gap-3 my-4">
                  <AIAvatar />
                  <div className="max-w-xl p-3 px-4 rounded-2xl shadow-md bg-slate-700/60 text-slate-200 rounded-bl-lg">
                      {personas[activePersonaId]?.welcomeMessage || "Hello! How can I help you today?"}
                  </div>
              </div>
            }
            {loading && activeSession?.messages[activeSession.messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3 my-4"> <AIAvatar /> <div className="max-w-xl p-4 rounded-2xl bg-slate-700/50 text-slate-200 rounded-bl-none"> <Spinner size="sm" /> </div> </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="mx-4 mb-2 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg text-sm">{error}</div>}

          <div className="p-4 border-t border-slate-700/50">
            {attachedImageUrl && (
              <div className="relative w-24 h-24 mb-2 p-1 border border-slate-600 rounded-lg">
                <img src={attachedImageUrl} alt="attachment preview" className="w-full h-full object-cover rounded-md" />
                <button onClick={() => { setAttachedImage(null); setAttachedImageUrl(null); }} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full hover:bg-red-600">
                  <Icon name="close" className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-slate-900/50 border border-slate-700 rounded-lg p-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 self-center text-slate-400 hover:text-teal-400 transition-colors" title="Attach Image" disabled={loading}>
                <Icon name="attach" className="w-6 h-6" />
              </button>
              <button onClick={handleToggleListening} className={`p-2 self-center rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-teal-400'}`} title={isListening ? 'Stop listening' : 'Use voice input'} disabled={loading}>
                <Icon name="microphone" className="w-6 h-6" />
              </button>
              {isListening && <span className="self-center text-sm text-slate-400 animate-pulse hidden sm:inline">Listening...</span>}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={`Message ${activePersona.name} (${activeModel.name})...`}
                className="flex-1 bg-transparent resize-none focus:outline-none placeholder-slate-500 max-h-36 overflow-y-auto"
                rows={1}
                disabled={loading}
              />
              <button onClick={handleSendMessage} disabled={loading || (!input.trim() && !attachedImage)} className="p-2 self-center rounded-full bg-teal-500 text-white hover:bg-teal-600 disabled:bg-teal-500/50 disabled:cursor-not-allowed transition-transform duration-200 transform hover:scale-110">
                {loading ? <Spinner size="sm" /> : <Icon name="send" className="w-6 h-6" />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageAttach(e.target.files[0])} />
            </div>
          </div>
        </div>
    </div>
  );
};

export default Chatbot;