
import React, { useState, useEffect, useRef } from 'react';

interface TTSPlayerProps {
  base64Audio: string;
  title: string;
  onClose: () => void;
}

const TTSPlayer: React.FC<TTSPlayerProps> = ({ base64Audio, title, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // PCM Decoding Logic
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  useEffect(() => {
    const initAudio = async () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = ctx;
      const bytes = decodeBase64(base64Audio);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
      bufferRef.current = buffer;
      setDuration(buffer.duration);
      playFrom(0);
    };

    initAudio();

    return () => {
      stopPlayback();
      audioCtxRef.current?.close();
    };
  }, [base64Audio]);

  const playFrom = (offset: number) => {
    if (!audioCtxRef.current || !bufferRef.current) return;

    stopPlayback();

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = bufferRef.current;
    source.playbackRate.value = playbackRate;
    source.connect(audioCtxRef.current.destination);
    
    source.onended = () => {
      // Only set to false if we reached the end naturally, not via manual stop
      if (Math.abs(getCurrentTime() - bufferRef.current!.duration) < 0.1) {
        setIsPlaying(false);
      }
    };

    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = audioCtxRef.current.currentTime - (offset / playbackRate);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausedAtRef.current = getCurrentTime();
      stopPlayback();
      setIsPlaying(false);
    } else {
      playFrom(pausedAtRef.current >= duration ? 0 : pausedAtRef.current);
    }
  };

  const getCurrentTime = () => {
    if (!audioCtxRef.current || !isPlaying) return pausedAtRef.current;
    return (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const time = getCurrentTime();
        setCurrentTime(time);
        setProgress((time / duration) * 100);
        if (time >= duration) {
          setIsPlaying(false);
          pausedAtRef.current = 0;
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, duration, playbackRate]);

  const handleSeek = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, getCurrentTime() + seconds));
    if (isPlaying) {
      playFrom(newTime);
    } else {
      pausedAtRef.current = newTime;
      setCurrentTime(newTime);
      setProgress((newTime / duration) * 100);
    }
  };

  const updatePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (isPlaying) {
      const current = getCurrentTime();
      stopPlayback();
      // We need to re-calculate startTime based on new rate
      setTimeout(() => playFrom(current), 0);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6 animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] text-white">
        <div className="flex items-center gap-6">
          {/* Avatar / Icon with Visualizer */}
          <div className="relative group shrink-0">
            <div className={`absolute -inset-2 bg-indigo-500 rounded-full blur-xl opacity-20 transition-all duration-1000 ${isPlaying ? 'animate-pulse scale-110' : 'scale-100'}`}></div>
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isPlaying ? 'animate-bounce' : ''}>
                <path d="M12 2v20M2 10v4M22 10v4M7 6v12M17 6v12" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">Narrating Story</p>
                <h4 className="text-sm font-bold truncate leading-tight pr-4">{title}</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
                  {[0.75, 1, 1.25, 1.5].map(rate => (
                    <button
                      key={rate}
                      onClick={() => updatePlaybackRate(rate)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${playbackRate === rate ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden mb-3 group cursor-pointer">
              <div 
                className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 tracking-widest">{formatTime(currentTime)}</span>
              
              <div className="flex items-center gap-6">
                <button onClick={() => handleSeek(-10)} className="text-slate-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="m7 4 12 8-12 8V4z"/></svg>
                  )}
                </button>
                <button onClick={() => handleSeek(10)} className="text-slate-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>
                </button>
              </div>

              <span className="text-[10px] font-black text-slate-500 tracking-widest">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TTSPlayer;
