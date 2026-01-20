
import React, { useState, useEffect } from 'react';
import { FlashBroadcast } from '../types';
import { getActiveFlashBroadcast } from '../services/storageService';
import { Icons } from '../constants';

const FlashBanner: React.FC = () => {
  const [broadcast, setBroadcast] = useState<FlashBroadcast | null>(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const checkBroadcast = () => {
      const active = getActiveFlashBroadcast();
      setBroadcast(active);
    };

    checkBroadcast();
    
    // Listen for storage events (admin sends broadcast in another tab or same window event)
    window.addEventListener('storage', checkBroadcast);
    const interval = setInterval(checkBroadcast, 2000); // Polling fallback

    return () => {
      window.removeEventListener('storage', checkBroadcast);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!broadcast) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(broadcast.expiresAt).getTime();
      const start = new Date(broadcast.timestamp).getTime();
      const total = end - start;
      const remaining = end - now;

      if (remaining <= 0) {
        setBroadcast(null);
        clearInterval(timer);
      } else {
        setProgress((remaining / total) * 100);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [broadcast]);

  if (!broadcast) return null;

  const levelStyles = {
    INFO: 'bg-indigo-600 text-white shadow-indigo-200',
    ALERT: 'bg-amber-500 text-white shadow-amber-200',
    URGENT: 'bg-rose-600 text-white shadow-rose-200'
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-6 animate-in slide-in-from-top-10 fade-in duration-500">
      <div className={`relative overflow-hidden rounded-[2rem] shadow-2xl p-6 flex items-center gap-6 ${levelStyles[broadcast.level]}`}>
        {/* Progress Bar Background */}
        <div className="absolute bottom-0 left-0 h-1.5 bg-black/20 w-full" />
        <div 
          className="absolute bottom-0 left-0 h-1.5 bg-white/40 transition-all duration-100 ease-linear" 
          style={{ width: `${progress}%` }} 
        />

        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Icons.Sparkles />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Platform Dispatch</span>
             <span className="w-1 h-1 bg-white/40 rounded-full" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admin Announcement</span>
          </div>
          <p className="text-sm font-bold leading-relaxed pr-4 line-clamp-2 italic">
            "{broadcast.content}"
          </p>
        </div>

        <button 
          onClick={() => setBroadcast(null)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <Icons.X />
        </button>
      </div>
    </div>
  );
};

export default FlashBanner;
