
import React, { useState, useEffect, useRef } from 'react';
import { getInstantDefinition, generateSpeech } from '../services/geminiService';
import { Icons } from '../constants';

interface DictionaryPopupProps {
  word: string;
  context: string;
  x: number;
  y: number;
  onClose: () => void;
}

const DictionaryPopup: React.FC<DictionaryPopupProps> = ({ word, context, x, y, onClose }) => {
  const [data, setData] = useState<{ definition: string; partOfSpeech: string; usage: string; pronunciation?: string; synonyms?: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPronouncing, setIsPronouncing] = useState(false);
  const [error, setError] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const fetchDef = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const result = await getInstantDefinition(word, context);
        setData(result);
      } catch (err) {
        console.error("Dictionary error:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDef();

    return () => {
      audioCtxRef.current?.close();
    };
  }, [word]);

  const handlePronounce = async () => {
    if (isPronouncing) return;
    setIsPronouncing(true);
    try {
      const base64 = await generateSpeech(word, 'Puck');
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const dataInt16 = new Int16Array(bytes.buffer);
      const frameCount = dataInt16.length;
      const buffer = ctx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPronouncing(false);
      source.start();
    } catch (err) {
      console.error("Speech failed", err);
      setIsPronouncing(false);
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -110%)',
    zIndex: 1000,
  };

  return (
    <div 
      ref={popupRef}
      style={style}
      className="w-80 bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-100 p-6 animate-in fade-in zoom-in duration-300 pointer-events-auto"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xl font-black text-slate-900 truncate leading-none">{word}</h4>
            <button 
              onClick={handlePronounce}
              disabled={isPronouncing}
              className={`p-1.5 rounded-lg transition-all ${isPronouncing ? 'bg-indigo-600 text-white animate-pulse' : 'text-indigo-400 hover:bg-indigo-50'}`}
              title="Pronounce Word"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {data.partOfSpeech}
              </span>
              {data.pronunciation && (
                <span className="text-[10px] font-mono text-slate-400 italic">
                  {data.pronunciation}
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1 text-slate-300 hover:text-slate-900 transition-colors">
          <Icons.X />
        </button>
      </div>

      {isLoading ? (
        <div className="py-4 space-y-3">
          <div className="h-3 bg-slate-50 rounded-full animate-pulse w-full"></div>
          <div className="h-3 bg-slate-50 rounded-full animate-pulse w-5/6"></div>
          <div className="h-3 bg-slate-50 rounded-full animate-pulse w-4/6"></div>
        </div>
      ) : error ? (
        <p className="text-xs text-slate-400 italic py-4">Definition unavailable for this term.</p>
      ) : data ? (
        <div className="space-y-5 animate-in fade-in duration-500">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {data.definition}
          </p>
          
          {data.synonyms && data.synonyms.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Synonyms</p>
              <div className="flex flex-wrap gap-1.5">
                {data.synonyms.slice(0, 3).map(s => (
                  <span key={s} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contextual Usage</p>
            <p className="text-xs italic text-slate-500 font-serif leading-relaxed">
              "{data.usage}"
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DictionaryPopup;
