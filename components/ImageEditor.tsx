
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { editImage } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface GalleryHistoryItem {
  id: number;
  prompt: string;
  originalUrl: string;
  editedUrl: string;
}

interface EditState {
  editedUrl: string | null;
  prompt: string;
  intensity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
}

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [galleryHistory, setGalleryHistory] = useState<GalleryHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  
  const [intensity, setIntensity] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [sepia, setSepia] = useState<number>(0);

  const [editHistory, setEditHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoInProgress = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const AUTO_SAVE_KEY = 'imageEditorAutoSave';

  const [showSaveNotification, setShowSaveNotification] = useState<boolean>(false);
  const notificationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('imageEditingHistory');
      if (storedHistory) {
        setGalleryHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load image editing history from localStorage", error);
    }
  }, []);
  
  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem(AUTO_SAVE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (window.confirm("An unsaved editing session was found. Would you like to restore it?")) {
          setOriginalImage(savedState.originalImage);
          setEditedImage(savedState.editedImage);
          setPrompt(savedState.prompt);
          setIntensity(savedState.intensity ?? 100);
          setBrightness(savedState.brightness ?? 100);
          setContrast(savedState.contrast ?? 100);
          setSaturation(savedState.saturation ?? 100);
          setSepia(savedState.sepia ?? 0);
          
          const initialHistoryState: EditState = {
            editedUrl: savedState.editedImage,
            prompt: savedState.prompt,
            intensity: savedState.intensity ?? 100,
            brightness: savedState.brightness ?? 100,
            contrast: savedState.contrast ?? 100,
            saturation: savedState.saturation ?? 100,
            sepia: savedState.sepia ?? 0,
          };
          setEditHistory([initialHistoryState]);
          setHistoryIndex(0);

        } else {
          localStorage.removeItem(AUTO_SAVE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to restore image editor state from localStorage", error);
      localStorage.removeItem(AUTO_SAVE_KEY);
    }
  }, []);

  const stateRef = useRef({ originalImage, editedImage, prompt, intensity, brightness, contrast, saturation, sepia });
  useEffect(() => {
    stateRef.current = { originalImage, editedImage, prompt, intensity, brightness, contrast, saturation, sepia };
  }, [originalImage, editedImage, prompt, intensity, brightness, contrast, saturation, sepia]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (stateRef.current.originalImage) {
        try {
          localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(stateRef.current));
          
          if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
          setShowSaveNotification(true);
          notificationTimeoutRef.current = window.setTimeout(() => setShowSaveNotification(false), 2500);

        } catch (error) {
          console.error("Failed to auto-save image editor state", error);
        }
      }
    }, 30000);

    return () => {
        clearInterval(intervalId);
        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImage = new Image();
    const overlayImage = new Image();
    
    let baseLoaded = false, overlayLoaded = false;
    const p1 = new Promise<void>(res => { baseImage.onload = () => { baseLoaded = true; res(); }; });
    baseImage.src = originalImage;
    if (baseImage.complete) { baseLoaded = true; }

    let p2 = Promise.resolve();
    if(editedImage) {
        p2 = new Promise<void>(res => { overlayImage.onload = () => { overlayLoaded = true; res(); }; });
        overlayImage.src = editedImage;
        if(overlayImage.complete) { overlayLoaded = true; }
    }

    Promise.all([p1,p2]).then(() => {
        if (!baseLoaded) return;
        canvas.width = baseImage.naturalWidth;
        canvas.height = baseImage.naturalHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%)`;
        ctx.drawImage(baseImage, 0, 0);

        if (editedImage && overlayLoaded && intensity > 0) {
            ctx.globalAlpha = intensity / 100;
            ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }
        ctx.filter = 'none';
    });

  }, [originalImage, editedImage, intensity, brightness, contrast, saturation, sepia]);
  
  const addHistoryState = useCallback((newState: EditState) => {
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [editHistory, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoInProgress.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const prevState = editHistory[newIndex];
    setEditedImage(prevState.editedUrl);
    setPrompt(prevState.prompt);
    setIntensity(prevState.intensity);
    setBrightness(prevState.brightness);
    setContrast(prevState.contrast);
    setSaturation(prevState.saturation);
    setSepia(prevState.sepia);
  }, [canUndo, editHistory, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoInProgress.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const nextState = editHistory[newIndex];
    setEditedImage(nextState.editedUrl);
    setPrompt(nextState.prompt);
    setIntensity(nextState.intensity);
    setBrightness(nextState.brightness);
    setContrast(nextState.contrast);
    setSaturation(nextState.saturation);
    setSepia(nextState.sepia);
  }, [canRedo, editHistory, historyIndex]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isModifier = e.ctrlKey || e.metaKey;
        if (isModifier && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) { handleRedo(); } 
            else { handleUndo(); }
        } else if (isModifier && e.key === 'y') {
            e.preventDefault();
            handleRedo();
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  useEffect(() => {
    isUndoRedoInProgress.current = false;
  });

  useEffect(() => {
    if (loading || isUndoRedoInProgress.current || historyIndex < 0) return;

    const handler = setTimeout(() => {
        const currentState = editHistory[historyIndex];
        if (currentState && (
            currentState.intensity !== intensity || currentState.brightness !== brightness ||
            currentState.contrast !== contrast || currentState.saturation !== saturation ||
            currentState.sepia !== sepia
        )) {
            addHistoryState({
                ...currentState,
                intensity, brightness, contrast, saturation, sepia,
            });
        }
    }, 500);

    return () => clearTimeout(handler);
  }, [intensity, brightness, contrast, saturation, sepia, addHistoryState, loading, editHistory, historyIndex]);

  const handleResetAdjustments = () => {
    setIntensity(100);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    localStorage.removeItem(AUTO_SAVE_KEY);
    setError(null);
    setEditedImage(null);
    setResponseText(null);
    setEditHistory([]);
    setHistoryIndex(-1);
    handleResetAdjustments();
    setSelectedHistoryId(null);
    const url = await fileToDataUrl(file);
    setOriginalImage(url);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt) { setError('Please enter a prompt to describe your edit.'); return; }
    if (!originalImage) { setError('Please upload an image to edit.'); return; }
    setLoading(true);
    setError(null);
    setEditedImage(null);
    setResponseText(null);
    setSelectedHistoryId(null);
    
    try {
      const [header, data] = originalImage.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const result = await editImage(prompt, { data, mimeType });
      
      if (result.imageUrl) setEditedImage(result.imageUrl);
      if (result.text) setResponseText(result.text);
      
      handleResetAdjustments();
      const newEditState: EditState = {
        editedUrl: result.imageUrl!, prompt, intensity: 100,
        brightness: 100, contrast: 100, saturation: 100, sepia: 0
      };
      addHistoryState(newEditState);

      const newHistoryItem: GalleryHistoryItem = {
        id: Date.now(), prompt, originalUrl: originalImage, editedUrl: result.imageUrl!,
      };
      const updatedHistory = [newHistoryItem, ...galleryHistory].slice(0, 20);
      setGalleryHistory(updatedHistory);
      localStorage.setItem('imageEditingHistory', JSON.stringify(updatedHistory));

    } catch (e: any) {
      setError(e.message || 'Failed to edit image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, originalImage, galleryHistory, addHistoryState]);
  
  const handleSelectFromHistory = (item: GalleryHistoryItem) => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setPrompt(item.prompt);
    setOriginalImage(item.originalUrl);
    setEditedImage(item.editedUrl);
    setError(null);
    setResponseText(null);
    handleResetAdjustments();
    setSelectedHistoryId(item.id);
    
    const initialHistoryState: EditState = {
        editedUrl: item.editedUrl, prompt: item.prompt, intensity: 100,
        brightness: 100, contrast: 100, saturation: 100, sepia: 0
    };
    setEditHistory([initialHistoryState]);
    setHistoryIndex(0);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire image editing history? This action cannot be undone.')) {
      setGalleryHistory([]);
      localStorage.removeItem('imageEditingHistory');
      setSelectedHistoryId(null);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `nexus-ai-edited-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const AdjustmentSlider: React.FC<{
    label: string, value: number, onChange: (v: number) => void,
    min?: number, max?: number, unit?: string,
  }> = ({ label, value, onChange, min = 0, max = 100, unit = '' }) => (
    <div>
        <div className="flex justify-between items-center text-sm font-medium text-slate-400 px-1">
            <label htmlFor={`${label}-slider`}>{label}</label>
            <span>{value}{unit}</span>
        </div>
        <input
            id={`${label}-slider`} type="range" min={min} max={max} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-teal-500 [&::-moz-range-thumb]:bg-teal-500"
            aria-label={`${label} slider`}
        />
    </div>
  );

  return (
    <div className="p-8 animate-fade-in relative">
      {showSaveNotification && (
        <div
          className="absolute top-4 right-4 z-10 bg-green-600/90 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg animate-fade-in"
          role="status"
          aria-live="polite"
        >
          Progress saved
        </div>
      )}
      <h2 className="text-3xl font-bold mb-6 text-slate-100">AI Image Editor (Gemini)</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-300">1. Upload an Image</h3>
          <div 
            className="w-full aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center p-4 relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleImageUpload(e.dataTransfer.files[0]); }}
          >
            {originalImage ? (
              <>
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-md" />
                 <button 
                  onClick={() => {
                    setOriginalImage(null); setEditedImage(null); setResponseText(null);
                    localStorage.removeItem(AUTO_SAVE_KEY); setEditHistory([]); setHistoryIndex(-1);
                    setSelectedHistoryId(null);
                  }}
                  className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                  title="Remove Image" > <Icon name="close" className="w-5 h-5" /> </button>
              </>
            ) : (
              <div className="text-center text-slate-500">
                <Icon name="image" className="w-16 h-16 mx-auto text-slate-600" />
                <p>Drag & drop, or click to upload</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" >
            {originalImage ? 'Change Image' : 'Select Image from Device'}
          </button>
        </div>
        <div className="flex flex-col gap-3">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-300">3. View Result</h3>
             <div className="flex gap-2">
                <button onClick={handleUndo} disabled={!canUndo} className="flex items-center gap-1.5 px-2 py-1 text-sm rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors" title="Undo (Ctrl+Z)" > <Icon name="undo" className="w-4 h-4" /> <span>Undo</span> </button>
                <button onClick={handleRedo} disabled={!canRedo} className="flex items-center gap-1.5 px-2 py-1 text-sm rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors" title="Redo (Ctrl+Y)" > <Icon name="redo" className="w-4 h-4" /> <span>Redo</span> </button>
             </div>
           </div>
          <div className="w-full aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center p-4 relative group">
            {loading && <div className="text-center text-slate-400"><Spinner size="lg" /><p className="mt-2">Editing your image...</p></div>}
            {originalImage && !loading && (
              <>
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain rounded-md shadow-lg" />
                {editedImage && <button onClick={handleDownload} className="absolute bottom-4 right-4 bg-slate-900/70 text-white p-2 rounded-full hover:bg-teal-600 transition-all opacity-0 group-hover:opacity-100" title="Download Image" > <Icon name="download" className="w-6 h-6" /> </button>}
              </>
            )}
            {!originalImage && !loading && (
              <div className="text-center text-slate-500">
                <Icon name="sparkles" className="w-16 h-16 mx-auto text-slate-600" />
                <p>Your edited image will appear here.</p>
              </div>
            )}
          </div>
           {!loading && editedImage && (
            <div className="space-y-3 pt-2">
                <AdjustmentSlider label="AI Edit Intensity" value={intensity} onChange={setIntensity} unit="%" />
                <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                    <h4 className="text-md font-semibold text-slate-400">Adjustments</h4>
                    <button onClick={handleResetAdjustments} className="text-xs font-semibold text-teal-400 hover:text-teal-300">Reset All</button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <AdjustmentSlider label="Brightness" value={brightness} onChange={setBrightness} min={0} max={200} unit="%" />
                    <AdjustmentSlider label="Contrast" value={contrast} onChange={setContrast} min={0} max={200} unit="%" />
                    <AdjustmentSlider label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} unit="%" />
                    <AdjustmentSlider label="Sepia" value={sepia} onChange={setSepia} min={0} max={100} unit="%" />
                </div>
            </div>
          )}
          {responseText && !loading && <div className="text-sm p-3 bg-slate-900/70 rounded-md text-slate-300 italic"><p>{responseText}</p></div>}
        </div>
      </div>
      
      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">2. Describe Your Edit</h3>
          <textarea
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a futuristic city in the background, make the cat wear a wizard hat, change the season to winter..."
            className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow duration-200 resize-none h-24 placeholder-slate-500"
            disabled={loading || !originalImage}
          />
        </div>
        <div className="flex justify-end">
           <button
            onClick={handleGenerate}
            disabled={loading || !prompt || !originalImage}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? <Spinner /> : <Icon name="edit-image" className="w-5 h-5" />}
            <span>{loading ? 'Generating...' : 'Generate Edit'}</span>
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      {galleryHistory.length > 0 && (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {galleryHistory.map((item) => (
              <div
                key={item.id}
                className={`relative aspect-square group cursor-pointer rounded-lg ${
                  selectedHistoryId === item.id ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-teal-500' : ''
                }`}
                onClick={() => handleSelectFromHistory(item)}
              >
                <img
                  src={item.editedUrl}
                  alt={item.prompt}
                  className="w-full h-full object-cover rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105"
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

export default ImageEditor;