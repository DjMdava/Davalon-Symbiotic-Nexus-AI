

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateVideo, VideoImageInput, VideoAspectRatio } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';
import { VideoHistoryItem } from '../types';

interface VideoPreset {
  name: string;
  prompt: string;
}

const videoPresets: VideoPreset[] = [
  {
    name: 'Explainer Video',
    prompt: 'Create a short, engaging explainer video about [Your Product/Service]. Use simple visuals and clear narration to explain how it works and its key benefits. The tone should be friendly and informative.'
  },
  {
    name: 'Social Media Ad',
    prompt: 'Generate a dynamic 15-second social media ad for [Your Brand/Product]. It should be eye-catching, fast-paced, and end with a clear call to action like "Shop Now" or "Learn More".'
  },
  {
    name: 'Short Film Scene',
    prompt: 'A cinematic scene of a detective in a rain-soaked, neon-lit city street at night, looking thoughtfully at a mysterious clue. Moody, atmospheric lighting with a sense of suspense.'
  },
  {
    name: 'Product Showcase',
    prompt: 'A clean, elegant 360-degree showcase of [Your Product] on a minimalist background. Highlight its design, materials, and key features with smooth camera movements.'
  },
  {
    name: 'Nature Documentary Clip',
    prompt: 'A stunning, high-definition drone shot flying over a majestic mountain range at sunrise, with golden light hitting the peaks and clouds rolling through the valleys. Epic and serene.'
  },
  {
    name: 'Corporate Opener',
    prompt: 'An inspiring and professional opener for a corporate presentation. Feature abstract geometric shapes, clean transitions, and a futuristic feel, ending with a placeholder for a company logo.'
  },
  {
    name: 'Travel Vlog Intro',
    prompt: 'A high-energy travel vlog intro sequence. Quick cuts of beautiful landscapes, drone footage, and a person backpacking, set to upbeat music. End with a title card: "[Your Adventure Name]".'
  },
  {
    name: 'Real Estate Tour',
    prompt: 'A smooth, cinematic virtual tour of a modern luxury home. Glide through the living room, kitchen, and master bedroom, showcasing the spacious and elegant design. Bright, natural lighting.'
  }
];

const videoStyles = [
    { name: 'Default', value: '' },
    { name: 'Cinematic', value: 'cinematic, hyper-detailed, photorealistic, professional color grading,' },
    { name: 'Hyper-Realistic', value: 'hyper-realistic, 8k, ultra-detailed textures, lifelike,' },
    { name: 'Anime', value: 'anime style, cel-shaded, vibrant colors, japanese animation style,' },
    { name: 'Documentary', value: 'documentary footage, steady cam, natural lighting,' },
    { name: 'Claymation', value: 'claymation style, stop-motion animation,' },
    { name: 'Vintage Film', value: 'vintage film look, grain, scratches, 1950s style,' },
];


const loadingMessages = [
  "Warming up the video engine...",
  "Analyzing inputs and generating storyboard...",
  "Rendering high-resolution frames (this can take a moment)...",
  "Applying visual effects and motion...",
  "Encoding your masterpiece...",
  "Finalizing and preparing for download...",
];

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const VideoCreator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [style, setStyle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('videoGenerationHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load video history from localStorage", error);
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setError(null);
    setInputImage(file);
    const url = await fileToDataUrl(file);
    setInputImageUrl(url);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage(loadingMessages[0]);
    
    try {
      let imageInput: VideoImageInput | null = null;
      if (inputImage) {
        const imageBytes = await fileToBase64(inputImage);
        imageInput = { imageBytes, mimeType: inputImage.type };
      }

      const finalPrompt = `${style} ${prompt}`;
      let messageIndex = 0;
      const url = await generateVideo(finalPrompt, aspectRatio, () => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, imageInput);
      setVideoUrl(url);
      
      const newHistoryItem: VideoHistoryItem = {
        id: Date.now(),
        prompt: finalPrompt,
        url,
        aspectRatio,
        style: style,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10); // Keep last 10 videos
      setHistory(updatedHistory);
      localStorage.setItem('videoGenerationHistory', JSON.stringify(updatedHistory));

    } catch (e: any) {
      setError(e.message || 'Failed to generate video. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, inputImage, aspectRatio, style, history]);
  
  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };
  
  const handleSelectFromHistory = (item: VideoHistoryItem) => {
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setStyle(item.style);
    setVideoUrl(item.url);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire video history? This action cannot be undone.')) {
      history.forEach(item => URL.revokeObjectURL(item.url)); // Clean up object URLs
      setHistory([]);
      localStorage.removeItem('videoGenerationHistory');
    }
  };

  const AspectRatioButton: React.FC<{ value: VideoAspectRatio; label: string }> = ({ value, label }) => (
    <button
      onClick={() => setAspectRatio(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        aspectRatio === value ? 'bg-teal-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );
  
  const StyleButton: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <button
      onClick={() => setStyle(value)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        style === value ? 'bg-teal-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-slate-100">Professional Video Creator (Veo 2.0)</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">1. (Optional) Start with a Preset</h3>
              <div className="flex flex-wrap gap-2">
                {videoPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetClick(preset.prompt)}
                    className="px-3 py-1.5 text-sm rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    aria-label={`Select ${preset.name} preset`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-300 pt-2 mb-2">2. Describe Your Video</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A cinematic, hyper-detailed shot of a futuristic sports car racing through a neon-drenched city at night..."
                className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow duration-200 resize-none h-36 placeholder-slate-500"
                disabled={loading}
              />
            </div>
             <div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">3. Configure Settings</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Video Style (Simulated "Veo 3")</label>
                        <div className="flex flex-wrap gap-2">
                           {videoStyles.map(s => <StyleButton key={s.name} value={s.value} label={s.name} />)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Aspect Ratio</label>
                        <div className="flex space-x-2">
                            <AspectRatioButton value="16:9" label="Landscape (16:9)" />
                            <AspectRatioButton value="9:16" label="Portrait (9:16)" />
                            <AspectRatioButton value="1:1" label="Square (1:1)" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {loading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                <span>{loading ? 'Generating...' : 'Generate Video'}</span>
              </button>
            </div>
        </div>
        <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-slate-300">4. (Optional) Add an Image</h3>
             <div 
                className="w-full aspect-video bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center p-4 relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleImageUpload(e.dataTransfer.files[0]); }}
            >
                {inputImageUrl ? (
                    <>
                    <img src={inputImageUrl} alt="Input for video" className="max-w-full max-h-full object-contain rounded-md" />
                    <button 
                        onClick={() => { setInputImage(null); setInputImageUrl(null); }}
                        className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                        title="Remove Image"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                    </>
                ) : (
                    <div className="text-center text-slate-500">
                    <Icon name="image" className="w-12 h-12 mx-auto text-slate-600" />
                    <p className="mt-2 text-sm">Drag & drop, or click below</p>
                    </div>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
                {inputImageUrl ? 'Change Image' : 'Select Image from Device'}
            </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      <div className="mt-6 min-h-[300px] flex items-center justify-center bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700">
        {loading && (
          <div className="text-center text-slate-400 p-4">
            <Spinner size="lg" />
            <p className="mt-4 font-medium">{loadingMessage}</p>

            <p className="text-sm text-slate-500 mt-1">Video generation can take a few minutes. Please be patient.</p>
          </div>
        )}
        {videoUrl && !loading && (
          <div className="p-4 w-full">
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-lg">
              Your browser does not support the video tag.
            </video>
             <a
              href={videoUrl}
              download={`nexus-ai-video-${Date.now()}.mp4`}
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              <Icon name="download" className="w-5 h-5" />
              Download Video
            </a>
          </div>
        )}
        {!videoUrl && !loading && (
          <div className="text-center text-slate-500">
            <Icon name="video" className="w-16 h-16 mx-auto text-slate-600" />
            <p>Your generated video will appear here.</p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-200">History</h3>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-900/50 text-red-300 hover:bg-red-900/80 transition-colors"
              title="Clear all history"
            >
              <Icon name="trash" className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="relative aspect-video group cursor-pointer"
                onClick={() => handleSelectFromHistory(item)}
              >
                <video
                  src={item.url}
                  className="w-full h-full object-cover rounded-lg shadow-md bg-black"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-end p-2">
                  <p className="text-xs text-white truncate" title={item.prompt}>{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCreator;