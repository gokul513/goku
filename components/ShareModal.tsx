
import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { Icons } from '../constants';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ post, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  
  // Construct a shareable URL (simulated for local dev)
  const shareUrl = `${window.location.origin}/#post/${post.id}`;
  const shareText = `Check out this narrative on Lumina: "${post.title}"`;

  useEffect(() => {
    // Attempt native share if available and modal just opened
    if (isOpen && navigator.share) {
      const handleNativeShare = async () => {
        try {
          await navigator.share({
            title: post.title,
            text: post.excerpt,
            url: shareUrl,
          });
          onClose(); // Close if shared via native
        } catch (err) {
          console.debug("Native share cancelled or failed, falling back to modal UI.");
        }
      };
      
      // We trigger this only on a user interaction, so we don't call it immediately
      // but the buttons in the modal can use it.
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        console.error("Native share failed", err);
      }
    }
  };

  const channels = [
    {
      name: 'WhatsApp',
      icon: <Icons.WhatsApp />,
      color: 'bg-green-50 text-green-600',
      action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')
    },
    {
      name: 'Twitter (X)',
      icon: <Icons.X />,
      color: 'bg-slate-900 text-white',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}&via=LuminaNarratives`, '_blank')
    },
    {
      name: 'LinkedIn',
      icon: <Icons.LinkedIn />,
      color: 'bg-blue-50 text-blue-600',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      name: 'Email',
      icon: <Icons.Mail />,
      color: 'bg-indigo-50 text-indigo-600',
      action: () => window.location.href = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(shareText + '\n\nRead more at: ' + shareUrl)}`
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-100 p-10 md:p-14 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">Share Narrative</h2>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Distribute this insight to your circle.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <Icons.X />
          </button>
        </header>

        <div className="space-y-10">
          {/* Quick Copy Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Narrative Link</label>
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-3xl group transition-all focus-within:ring-4 focus-within:ring-indigo-500/5">
              <div className="flex-1 px-4 text-sm font-bold text-slate-500 truncate select-all">{shareUrl}</div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <Icons.Link />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Channels */}
          <div className="grid grid-cols-2 gap-4">
            {channels.map(channel => (
              <button 
                key={channel.name}
                onClick={channel.action}
                className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${channel.color}`}>
                  {channel.icon}
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{channel.name}</span>
              </button>
            ))}
            
            {navigator.share && (
              <button 
                onClick={handleNativeShare}
                className="col-span-2 flex items-center justify-center gap-4 p-5 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-100 transition-all group"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Icons.Share />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Open System Share</span>
              </button>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center pt-8 border-t border-slate-50">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Lumina Connectivity Hub • Protocol Secured</p>
        </footer>
      </div>
    </div>
  );
};

export default ShareModal;
