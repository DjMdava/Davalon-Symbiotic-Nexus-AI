import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateStoryStream } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';

type StoryOption = {
  genre: 'Fantasy' | 'Sci-Fi' | 'Mystery' | 'Romance' | 'Horror' | 'Adventure';
  audience: 'Children' | 'Teenagers' | 'Adults';
  tone: 'Humorous' | 'Serious' | 'Whimsical' | 'Suspenseful' | 'Dramatic' | 'Adventurous';
  length: 'Short' | 'Medium' | 'Long';
};

const StoryCreator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [options, setOptions] = useState<StoryOption>({
    genre: 'Fantasy',
    audience: 'Teenagers',
    tone: 'Adventurous',
    length: 'Medium',
  });
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Cleanup speech synthesis on unmount
    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a story idea.');
      return;
    }
    setLoading(true);
    setError(null);
    setStory('');
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsReading(false);
    }
    
    try {
      const stream = generateStoryStream(prompt, options);
      let fullStory = '';
      for await (const chunk of stream) {
        fullStory += chunk;
        setStory(fullStory);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate story. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, options]);

  const handleReadAloud = () => {
    if (isReading) {
      speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    if (story) {
      const utterance = new SpeechSynthesisUtterance(story);
      utteranceRef.current = utterance;
      utterance.onend = () => setIsReading(false);
      speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  const OptionSelector: React.FC<{
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }> = ({ label, value, options, onChange }) => (
    <div className="flex flex-col">
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 bg-slate-700/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 transition-shadow duration-200"
            disabled={loading}
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
  );
  
  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-slate-100">AI Story Creator</h2>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A shy librarian discovers a magical book that brings stories to life..."
          className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow duration-200 resize-none h-24 placeholder-slate-500"
          disabled={loading}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <OptionSelector label="Genre" value={options.genre} options={['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Adventure']} onChange={(v) => setOptions(o => ({...o, genre: v as StoryOption['genre']}))} />
            <OptionSelector label="Audience" value={options.audience} options={['Children', 'Teenagers', 'Adults']} onChange={(v) => setOptions(o => ({...o, audience: v as StoryOption['audience']}))} />
            <OptionSelector label="Tone" value={options.tone} options={['Humorous', 'Serious', 'Whimsical', 'Suspenseful', 'Dramatic', 'Adventurous']} onChange={(v) => setOptions(o => ({...o, tone: v as StoryOption['tone']}))} />
            <OptionSelector label="Length" value={options.length} options={['Short', 'Medium', 'Long']} onChange={(v) => setOptions(o => ({...o, length: v as StoryOption['length']}))} />
        </div>
        <div className="flex justify-end">
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
            >
                {loading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                <span>{loading ? 'Writing...' : 'Generate Story'}</span>
            </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      <div className="mt-6">
        {(loading || story) && (
            <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-700 min-h-[200px] relative">
                <div className="max-w-none whitespace-pre-wrap font-serif text-slate-200">
                    {story}
                    {loading && !story && <div className="text-center text-slate-400"><Spinner size="lg" /><p className="mt-2 font-sans">The story is about to unfold...</p></div>}
                </div>
                {!loading && story && (
                    <button
                        onClick={handleReadAloud}
                        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                        title={isReading ? "Stop Reading" : "Read Aloud"}
                    >
                        <Icon name={isReading ? "speaker-off" : "speaker-on"} className="w-4 h-4" />
                        <span>{isReading ? "Stop" : "Read Aloud"}</span>
                    </button>
                )}
            </div>
        )}
        {!loading && !story && (
             <div className="mt-6 min-h-[200px] flex items-center justify-center bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700">
                <div className="text-center text-slate-500">
                    <Icon name="book-open" className="w-16 h-16 mx-auto text-slate-600" />
                    <p>Your generated story will appear here.</p>
                </div>
             </div>
        )}
      </div>

    </div>
  );
};

export default StoryCreator;