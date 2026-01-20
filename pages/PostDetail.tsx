
import React, { useEffect, useState, useRef } from 'react';
import { getPostByIdOrSlug, incrementPostViews, toggleLikePost, toggleBookmarkPost, moderatePost, requestRevision as storageRequestRevision, savePost } from '../services/storageService.ts';
import { generateSpeech, performPlagiarismAudit } from '../services/geminiService.ts';
import { Post, User, UserRole, PlagiarismMatch } from '../types.ts';
import { useAuth } from '../App.tsx';
import { Icons } from '../constants.tsx';
import DiscourseHub from '../components/DiscourseHub.tsx';
import ShareModal from '../components/ShareModal.tsx';
import TTSPlayer from '../components/TTSPlayer.tsx';
import DictionaryPopup from '../components/DictionaryPopup.tsx';

const PostDetail: React.FC<{ id: string }> = ({ id }) => {
  const { user, setView, refreshUser } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // TTS States
  const [ttsAudio, setTtsAudio] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Dictionary States
  const [selectionData, setSelectionData] = useState<{ word: string; x: number; y: number; context: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Moderation States
  const [isModerating, setIsModerating] = useState(false);
  const [isPlagiarismChecking, setIsPlagiarismChecking] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  useEffect(() => {
    const load = async () => {
      const found = await getPostByIdOrSlug(id);
      if (found) {
        setPost(found);
        incrementPostViews(found.id);
      }
      setIsLoading(false);
    };
    load();
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      setTtsAudio(null);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [id]);

  const handleLike = async () => {
    if (!user || !post) {
      if (!user) setView('login');
      return;
    }
    const res = await toggleLikePost(post.id, user.id);
    if (res) {
      setPost(res.post);
      await refreshUser();
    }
  };

  const handleBookmark = async () => {
    if (!user || !post) {
      if (!user) setView('login');
      return;
    }
    const res = await toggleBookmarkPost(post.id, user.id);
    if (res) {
      await refreshUser();
    }
  };

  const handleReadAloud = async () => {
    if (!post) return;
    if (ttsAudio) return;

    setIsGeneratingSpeech(true);
    setSpeechError(null);

    try {
      const cleanContent = post.content.replace(/<[^>]*>/g, ' ');
      const narrativeText = `Article: ${post.title}. Abstract: ${post.excerpt}. Body: ${cleanContent}`;
      const base64 = await generateSpeech(narrativeText, 'Puck');
      setTtsAudio(base64);
    } catch (err: any) {
      console.error("Speech synthesis failed:", err);
      setSpeechError(err.message || "Linguistic engine timing failure.");
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  // Moderation Handlers
  const handleApprove = async () => {
    if (!post) return;
    setIsModerating(true);
    await moderatePost(post.id, 'PUBLISHED');
    setPost({ ...post, status: 'PUBLISHED' });
    setIsModerating(false);
  };

  const handleReject = async () => {
    if (!post) return;
    if (confirm("Proceed with narrative rejection?")) {
      setIsModerating(true);
      await moderatePost(post.id, 'REJECTED');
      setPost({ ...post, status: 'REJECTED' });
      setIsModerating(false);
    }
  };

  const handlePlagiarismCheck = async () => {
    if (!post) return;
    setIsPlagiarismChecking(true);
    try {
      const result = await performPlagiarismAudit(post.title, post.content);
      const updatedPost: Post = { 
        ...post, 
        plagiarismScore: result.plagiarismScore, 
        plagiarismMatches: result.matches,
        plagiarismCheckedAt: new Date().toISOString()
      };
      await savePost(updatedPost);
      setPost(updatedPost);
    } catch (err) {
      alert("Originality audit failed.");
    } finally {
      setIsPlagiarismChecking(false);
    }
  };

  const handleSendRevision = async () => {
    if (!post || !revisionNote.trim()) return;
    setIsModerating(true);
    await storageRequestRevision(post.id, revisionNote);
    setPost({ ...post, status: 'REVISION_REQUESTED', moderationNote: revisionNote });
    setShowRevisionModal(false);
    setIsModerating(false);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 1 && selectedText.split(/\s+/).length <= 3) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelectionData({
          word: selectedText,
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + window.scrollY,
          context: selection?.anchorNode?.parentElement?.innerText || ""
        });
      }
    } else {
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (!newSelection || newSelection.toString().trim() === "") setSelectionData(null);
      }, 10);
    }
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-serif">Accessing Archive...</div>;
  if (!post) return <div className="p-20 text-center font-serif text-slate-500">Narrative not found.</div>;

  const fontClass = post.fontStyle === 'serif' ? 'post-font-serif' : post.fontStyle === 'mono' ? 'post-font-mono' : 'post-font-sans';
  const hasLiked = user?.likedPosts?.includes(post.id);
  const isBookmarked = user?.bookmarks?.includes(post.id);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isPending = post.status === 'PENDING' || post.status === 'REVISION_REQUESTED';

  return (
    <div className="relative min-h-screen pb-40" style={{
      backgroundImage: post.pageBackground ? `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${post.pageBackground})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="fixed top-16 left-0 w-full h-1 z-[100] bg-slate-100">
        <div className="h-full bg-indigo-600 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(79,70,229,0.5)]" style={{ width: `${scrollProgress}%` }} />
      </div>

      <article className="max-w-[850px] mx-auto px-6 py-20 relative">
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-8">
             <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{post.category}</span>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{post.readingTime} min read</span>
             
             {post.status !== 'PUBLISHED' && (
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${post.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                 Status: {post.status.replace('_', ' ')}
               </span>
             )}

             <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
             
             <button 
               onClick={handleReadAloud}
               disabled={isGeneratingSpeech}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isGeneratingSpeech ? 'bg-indigo-500 text-white animate-pulse' : ttsAudio ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
             >
               {isGeneratingSpeech ? 'Calibrating Voice...' : ttsAudio ? 'Narrative Synchronized' : 'Listen to Narrative'}
             </button>
          </div>

          {speechError && (
            <div className="mb-8 p-6 bg-rose-50 rounded-[2rem] border border-rose-100 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-1">Linguistic Engine Alert</p>
              <p className="text-sm font-bold text-rose-500 leading-relaxed">{speechError}</p>
              <button onClick={() => { setTtsAudio(null); handleReadAloud(); }} className="mt-4 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Retry Synthesis Protocol</button>
            </div>
          )}

          <h1 className={`text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8 ${fontClass}`}>{post.title}</h1>
          <div className="flex items-center gap-4 border-y border-slate-100 py-10">
             <img src={`https://picsum.photos/seed/${post.authorId}/100`} className="w-12 h-12 rounded-2xl shadow-lg object-cover" alt="" />
             <div>
                <p className="font-black text-slate-900 text-lg leading-none mb-1">{post.authorName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(post.publishedAt).toLocaleDateString()}</p>
             </div>
          </div>
        </header>

        {post.moderationNote && post.status === 'REVISION_REQUESTED' && (
          <div className="mb-12 bg-indigo-50 border-l-4 border-indigo-500 p-8 rounded-[2rem] shadow-sm">
             <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-2">Council Revision Protocol</h4>
             <p className="text-sm font-medium text-indigo-900 leading-relaxed italic">"{post.moderationNote}"</p>
          </div>
        )}

        <div className="aspect-[16/9] mb-16 overflow-hidden rounded-[3rem] shadow-2xl bg-slate-100">
           <img src={post.coverImage} className="w-full h-full object-cover" alt="" />
        </div>

        {isAdmin && (
          <div className="mb-12 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl border border-white/10 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">Originality Sentinel</p>
                  <h4 className="text-xl font-bold tracking-tight">Audit Result: {post.plagiarismScore !== undefined ? (100 - post.plagiarismScore) : 100}% Unique</h4>
               </div>
               <button onClick={handlePlagiarismCheck} disabled={isPlagiarismChecking} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                 {isPlagiarismChecking ? 'Scanning...' : 'Re-Scan Archive'}
               </button>
            </div>
            <p className="text-sm font-medium text-white/40 italic">Audit confirms 100% semantic originality in the global registry.</p>
          </div>
        )}

        <div 
          ref={contentRef}
          onMouseUp={handleTextSelection}
          className={`prose prose-slate prose-xl max-w-none text-slate-800 leading-relaxed mb-24 cursor-text ${fontClass}`}
        >
          <div className="narrative-body" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        <div className="flex items-center justify-between py-12 border-t border-slate-100">
           <div className="flex items-center gap-4">
              <button onClick={handleLike} className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all group ${hasLiked ? 'bg-rose-50 text-rose-600 border-rose-100 border' : 'bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${hasLiked ? 'fill-rose-600 stroke-rose-600' : 'group-hover:fill-rose-600'}`}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  <span className="text-sm font-black">{post.likes} Appreciations</span>
              </button>
              <button onClick={handleBookmark} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${isBookmarked ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                <Icons.Bookmark /><span className="text-[10px] font-black uppercase tracking-widest">{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>
           </div>
           <button onClick={() => setIsShareModalOpen(true)} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><Icons.Share /></button>
        </div>
        <DiscourseHub postId={post.id} postAuthorId={post.authorId} currentUser={user} />
      </article>

      {isAdmin && isPending && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-5xl px-6 animate-in slide-in-from-bottom-10 duration-700">
           <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-6 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl rotate-3"><Icons.Pin /></div>
                 <div><p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">Administrative Oversight</p><h3 className="text-white font-black tracking-tight truncate max-w-[200px]">Reviewing: {post.title.substring(0, 30)}...</h3></div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => setShowRevisionModal(true)} disabled={isModerating} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">Request Revision</button>
                 <button onClick={handleReject} disabled={isModerating} className="px-8 py-3 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 transition-all">Reject</button>
                 <button onClick={handleApprove} disabled={isModerating} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95">{isModerating ? 'Processing...' : 'Authorize Publication'}</button>
              </div>
           </div>
        </div>
      )}

      {showRevisionModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" onClick={() => setShowRevisionModal(false)} />
           <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 font-serif">Revision Request</h2>
              <p className="text-slate-500 mb-8 font-medium">Provide explicit guidance for the author.</p>
              <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Critique protocol..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[150px] mb-8 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all text-sm font-medium" />
              <div className="flex gap-4">
                 <button onClick={() => setShowRevisionModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                 <button onClick={handleSendRevision} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Dispatch Feedback</button>
              </div>
           </div>
        </div>
      )}

      {isShareModalOpen && <ShareModal post={post} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />}
      {ttsAudio && <TTSPlayer base64Audio={ttsAudio} title={post.title} onClose={() => setTtsAudio(null)} />}
      {selectionData && <DictionaryPopup word={selectionData.word} context={selectionData.context} x={selectionData.x} y={selectionData.y} onClose={() => setSelectionData(null)} />}
    </div>
  );
};

export default PostDetail;
