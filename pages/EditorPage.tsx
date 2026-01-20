
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../App.tsx';
import { Post, Category, PostStatus, GovernanceSettings, PlagiarismMatch } from '../types.ts';
import { getPosts, savePost, getGovernance, performContentAudit, calculateReadingTime } from '../services/storageService.ts';
import { expandToProArticle, synthesizeNarrativeFlow, performPlagiarismAudit } from '../services/geminiService.ts';
import { Icons } from '../constants.tsx';

const CATEGORIES: Category[] = ['Engineering', 'Design', 'Culture', 'Business', 'Product'];
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800';
const MAX_MEDIA_SIZE = 30 * 1024 * 1024; 

const EditorPage: React.FC<{ id?: string }> = ({ id }) => {
  const { user, setView } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | 'Uncategorized'>('Uncategorized');
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER);
  const [fontStyle, setFontStyle] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [status, setStatus] = useState<PostStatus>('DRAFT');
  const [gov, setGov] = useState<GovernanceSettings | null>(null);
  
  const [isPreview, setIsPreview] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isMediaProcessing, setIsMediaProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isPlagiarismChecking, setIsPlagiarismChecking] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const [plagiarismScore, setPlagiarismScore] = useState<number | undefined>(undefined);
  const [plagiarismMatches, setPlagiarismMatches] = useState<PlagiarismMatch[]>([]);
  const [auditPerformed, setAuditPerformed] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Initial load logic
  useEffect(() => {
    const init = async () => {
      const settings = await getGovernance();
      setGov(settings);
      if (id) {
        const posts = await getPosts();
        const existing = posts.find(p => p.id === id);
        if (existing) {
          setTitle(existing.title);
          setContent(existing.content);
          setCategory(existing.category);
          setCoverImage(existing.coverImage || DEFAULT_COVER);
          setFontStyle(existing.fontStyle || 'serif');
          setStatus(existing.status);
          setPlagiarismScore(existing.plagiarismScore);
          setPlagiarismMatches(existing.plagiarismMatches || []);
          setAuditPerformed(existing.plagiarismScore !== undefined);
        }
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    if (!isPreview && editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [isPreview]);

  const audit = useMemo(() => performContentAudit(content, coverImage), [content, coverImage]);
  const liveReadingTime = useMemo(() => calculateReadingTime(content, coverImage !== DEFAULT_COVER), [content, coverImage]);
  const hasHeadings = useMemo(() => /<h[1-6]/.test(content), [content]);
  const isContentTooShort = useMemo(() => gov ? audit.wordCount < gov.minWordCount : false, [audit, gov]);
  
  // BYPASSED FOR DEMO REVIEW: Content no longer blocked by scan
  const needsFix = category === 'Uncategorized' || isContentTooShort || !hasHeadings;

  const syncContent = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const saveCaretPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  };

  const applyFormatting = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    syncContent();
  };

  const handleGlobalError = (err: any) => {
    const msg = err.message || "System error.";
    if (msg.includes('QUOTA_EXHAUSTED')) {
      setIsQuotaExhausted(true);
      setErrorMessage("The narrative engine is cooldown. Please wait 60 seconds.");
    } else {
      setErrorMessage(msg);
    }
  };

  const handleAutoFix = async (currentTitle?: string, currentContent?: string) => {
    const targetTitle = currentTitle || title;
    const targetContent = currentContent || content;
    
    if (!targetContent.trim() && !targetTitle.trim()) return;
    
    setIsAutoFixing(true);
    setErrorMessage(null);
    setIsQuotaExhausted(false);
    try {
      const mediaAssets: string[] = [];
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = targetContent;
      const mediaElements = tempDiv.querySelectorAll('img[src^="data:"], video[src^="data:"]');
      mediaElements.forEach(el => mediaAssets.push((el as any).src));

      const fix = await synthesizeNarrativeFlow(targetTitle, targetContent);
      
      let finalContent = fix.polishedContent;
      mediaAssets.forEach(asset => {
        finalContent = finalContent.replace('src="[MEDIA_ASSET_DATA_REMOVED_FOR_PROCESSING]"', `src="${asset}"`);
      });

      setContent(finalContent);
      setCategory(fix.category);
      if (editorRef.current) {
        editorRef.current.innerHTML = finalContent;
      }
    } catch (err: any) {
      handleGlobalError(err);
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handlePlagiarismCheck = async () => {
    if (!content.trim()) return;
    setIsPlagiarismChecking(true);
    setErrorMessage(null);
    setIsQuotaExhausted(false);
    try {
      const result = await performPlagiarismAudit(title, content);
      setPlagiarismScore(result.plagiarismScore);
      setPlagiarismMatches(result.matches);
      setAuditPerformed(true);
    } catch (err: any) {
      handleGlobalError(err);
    } finally {
      setIsPlagiarismChecking(false);
    }
  };

  const handleOpenKeyManager = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      window.location.reload();
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_SIZE) return setErrorMessage(`Cover asset exceeds professional limits.`);
    
    setIsMediaProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCoverImage(base64);
      setIsMediaProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_SIZE) return setErrorMessage(`File size exceeds professional limits.`);
    
    setIsMediaProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const htmlToInsert = file.type.startsWith('image/') 
        ? `<figure><img src="${base64}" alt="Injected Evidence" /><figcaption>Fig. Documented Insight</figcaption></figure>`
        : `<figure><video src="${base64}" controls playsinline /><figcaption>Fig. Kinetic Proof</figcaption></figure>`;
      
      insertHTML(htmlToInsert);
      setIsMediaProcessing(false);

      const updatedHTML = editorRef.current?.innerHTML || content;
      await handleAutoFix(title, updatedHTML);
    };
    reader.readAsDataURL(file);
  };

  const insertHTML = (html: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      let range = selection?.rangeCount ? selection.getRangeAt(0) : savedRangeRef.current;
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      const fragment = range.createContextualFragment(html + "<p><br></p>");
      range.deleteContents();
      range.insertNode(fragment);
      syncContent();
    }
  };

  const handlePolish = async () => {
    if (!content.trim()) return;
    setIsExpanding(true);
    setErrorMessage(null);
    setIsQuotaExhausted(false);
    try {
      const polished = await expandToProArticle(title, content);
      setContent(polished);
      if (editorRef.current) {
        editorRef.current.innerHTML = polished;
      }
    } catch (err: any) {
      handleGlobalError(err);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSubmission = async () => {
    if (!user) return;
    
    if (category === 'Uncategorized') return setErrorMessage("Strategic domain assignment required.");
    if (isContentTooShort) return setErrorMessage(`Narrative density insufficient (${audit.wordCount}/${gov?.minWordCount}).`);
    if (!hasHeadings) return setErrorMessage("Structural hierarchy (H2/H3) required.");

    setIsSubmitting(true);
    try {
      const cleanText = content.replace(/<[^>]*>/g, ' ').trim();
      const excerpt = cleanText.length > 200 ? cleanText.substring(0, 197) + "..." : cleanText;
      const newPost: Post = {
        id: id || Math.random().toString(36).substr(2, 9),
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title, content, excerpt, authorId: user.id, authorName: user.name,
        publishedAt: new Date().toISOString(), coverImage, status: 'PENDING',
        category: category as Category, tags: [], likes: 0, views: 0, readingTime: liveReadingTime,
        isFeatured: false, plagiarismScore, plagiarismMatches, fontStyle
      };
      await savePost(newPost);
      setView('dashboard');
    } catch (err: any) {
      handleGlobalError(err);
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const fontClass = fontStyle === 'serif' ? 'post-font-serif' : fontStyle === 'mono' ? 'post-font-mono' : 'post-font-sans';

  return (
    <div className={`min-h-screen bg-slate-50 relative ${isFocusMode ? 'bg-white' : ''}`}>
      {!isFocusMode && (
        <header className="sticky top-0 z-[60] bg-white/95 backdrop-blur-xl border-b border-slate-100 px-10 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-8">
            <button onClick={() => setView('dashboard')} className="text-slate-400 font-black flex items-center gap-3 hover:text-indigo-600 transition-all group">
              <Icons.Reply /> 
              <span className="text-[10px] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">Exit Desk</span>
            </button>
            <div className="h-6 w-px bg-slate-100"></div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
               <button onClick={() => { syncContent(); setIsPreview(false); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isPreview ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-400'}`}>Write</button>
               <button onClick={() => { syncContent(); setIsPreview(true); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPreview ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-400'}`}>Preview</button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsFocusMode(true)} 
              className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all"
              title="Zen Focus Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
            <button onClick={() => {
              syncContent();
              savePost({
                id: id || Math.random().toString(36).substr(2, 9),
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                title, content, excerpt: content.substring(0, 100), authorId: user!.id, authorName: user!.name,
                publishedAt: new Date().toISOString(), coverImage, status: 'DRAFT',
                category: category as any, tags: [], likes: 0, views: 0, readingTime: liveReadingTime,
                isFeatured: false, plagiarismScore, plagiarismMatches, fontStyle
              }).then(() => setView('dashboard'));
            }} className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors">Stow Draft</button>
            <button 
              onClick={() => { syncContent(); setShowSubmitModal(true); }} 
              disabled={isSubmitting} 
              className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSubmitting ? 'Transmitting...' : 'Upload to Council'}
            </button>
          </div>
        </header>
      )}

      {isFocusMode && (
        <button 
          onClick={() => setIsFocusMode(false)}
          className="fixed top-12 right-12 z-[100] p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl hover:scale-110 opacity-10 hover:opacity-100 transition-all"
        >
          <Icons.X />
        </button>
      )}

      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6 animate-in slide-in-from-top-6 duration-500">
           <div className={`${isQuotaExhausted ? 'bg-amber-500' : 'bg-rose-600'} text-white p-6 rounded-[2rem] shadow-2xl flex items-center justify-between border border-white/20`}>
             <div className="flex-1 flex items-start gap-4">
               <span className="p-1 bg-white/20 rounded-lg shrink-0">
                 {isQuotaExhausted ? <Icons.Sparkles /> : <Icons.X />}
               </span> 
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                    {isQuotaExhausted ? 'API Rate Limit Reached' : 'Narrative Engine Status'}
                  </p>
                  <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                  {isQuotaExhausted && (
                    <button 
                      onClick={handleOpenKeyManager}
                      className="mt-3 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all"
                    >
                      Establish High-Capacity Key
                    </button>
                  )}
               </div>
             </div>
             <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0 ml-4"><Icons.X /></button>
           </div>
        </div>
      )}

      <main className="max-w-[100vw] mx-auto flex h-[calc(100vh-60px)] relative">
        {!isFocusMode && !isPreview && (
          <aside className="w-96 bg-white border-r border-slate-100 p-10 overflow-y-auto hidden xl:block">
            <div className="space-y-10">
              <section className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                 <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">Principal Integrity Pulse</p>
                 <div className="space-y-4 mb-8">
                   <LiveCheck label="Strategic Domain" passed={category !== 'Uncategorized'} detail={category} />
                   <LiveCheck label="Word Density" passed={!isContentTooShort} detail={`${audit.wordCount} words`} />
                   <LiveCheck label="Structural Flow" passed={hasHeadings} detail={hasHeadings ? 'Verified' : 'Missing H2'} />
                   <LiveCheck label="Hero Asset" passed={coverImage !== DEFAULT_COVER} detail={coverImage !== DEFAULT_COVER ? 'Customized' : 'Default'} />
                   <LiveCheck label="Originality Scan" passed={auditPerformed} detail={auditPerformed ? (plagiarismScore === 0 ? 'Unique' : 'Checked') : 'Optional'} />
                 </div>
              </section>

              <section className="bg-slate-50 border border-slate-100 p-8 rounded-[3rem] shadow-inner">
                 <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Asset Reference</p>
                 <div className="relative group rounded-[2rem] overflow-hidden aspect-video mb-6 border-4 border-white shadow-xl">
                   <img src={coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Cover Preview" />
                   <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => coverInputRef.current?.click()} className="p-4 bg-white text-slate-900 rounded-full shadow-2xl hover:scale-110 transition-all">
                        <Icons.Share />
                      </button>
                   </div>
                 </div>
                 <button 
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all"
                 >
                   Change Hero Asset
                 </button>
                 <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
              </section>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Strategic Domain</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-4 rounded-2xl border text-left transition-all group ${
                        category === cat 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70 group-hover:opacity-100">Domain</p>
                      <p className="text-[11px] font-black uppercase tracking-tighter truncate">{cat}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-y-auto px-8 md:px-24 py-20">
          <div className="max-w-4xl mx-auto">
            {isPreview ? (
              <div className={`animate-in fade-in duration-700 ${fontClass}`}>
                 <div className="flex items-center gap-4 mb-10">
                   <span className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{category}</span>
                   <div className="h-px flex-1 bg-slate-100"></div>
                 </div>
                 <h1 className="text-7xl font-black mb-16 leading-[1.1] tracking-tighter text-slate-900">{title || 'Untitled Narrative'}</h1>
                 {coverImage !== DEFAULT_COVER && (
                   <div className="aspect-[21/9] rounded-[3rem] overflow-hidden mb-16 shadow-2xl">
                     <img src={coverImage} className="w-full h-full object-cover" alt="Narrative Cover" />
                   </div>
                 )}
                 <div className="prose prose-slate prose-2xl max-w-none narrative-body pb-32" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border border-slate-100 p-3 rounded-[2rem] shadow-xl mb-16 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <button onClick={() => applyFormatting('formatBlock', 'h2')} className="px-4 py-2 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">H2</button>
                      <button onClick={() => applyFormatting('formatBlock', 'h3')} className="px-4 py-2 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">H3</button>
                      <div className="w-px h-6 bg-slate-100 mx-2"></div>
                      <button 
                        onClick={() => handleAutoFix()} 
                        disabled={isAutoFixing}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isAutoFixing ? 'text-indigo-400 animate-pulse' : 'text-indigo-600 hover:bg-indigo-50'}`}
                      >
                         <Icons.Sparkles /> {isAutoFixing ? 'Fixing Grammar...' : 'Grammar Fix'}
                      </button>
                      <button 
                        onClick={() => handlePlagiarismCheck()} 
                        disabled={isPlagiarismChecking}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isPlagiarismChecking ? 'text-slate-400 animate-pulse' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                         <Icons.Pin /> {isPlagiarismChecking ? 'Auditing...' : 'Check Originality'}
                      </button>
                   </div>
                   <div className="flex items-center gap-3">
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 group transition-all">
                        {isMediaProcessing ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : <Icons.Share />}
                        <span>Media Injection</span>
                     </button>
                     <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
                   </div>
                </div>

                <div className="mb-12">
                  <div className="flex items-center gap-4 mb-4">
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="bg-indigo-50 text-indigo-700 border-none rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                    >
                      <option value="Uncategorized">Select Domain</option>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {liveReadingTime > 0 && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{liveReadingTime} min read</span>}
                  </div>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="The Professional Thesis Title"
                    className={`w-full text-7xl font-black border-none focus:ring-0 placeholder:text-slate-100 outline-none bg-transparent ${fontClass} tracking-tighter`}
                  />
                </div>
                <div 
                  ref={editorRef}
                  contentEditable
                  onInput={syncContent}
                  onBlur={saveCaretPosition}
                  className={`w-full min-h-[70vh] text-2xl leading-relaxed outline-none bg-transparent narrative-body prose-slate ${fontClass} empty:before:content-[attr(data-placeholder)] empty:before:text-slate-100/50 pb-40 transition-all duration-300 ${isAutoFixing ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}
                  data-placeholder="Initiate the authoritative investigation..."
                />
              </div>
            )}
          </div>
        </div>

        {!isFocusMode && !isPreview && (
          <aside className="w-[500px] bg-white border-l border-slate-100 p-12 overflow-y-auto hidden 2xl:block">
            <div className="space-y-12">
              <div className="relative">
                {needsFix && content.trim() && (
                  <div className="absolute -top-4 -left-4 z-10 bg-rose-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg animate-bounce">Council Alerts</div>
                )}
                <button 
                  onClick={handlePolish}
                  disabled={isExpanding || !content.trim()}
                  className="w-full py-16 bg-slate-900 rounded-[4rem] text-white shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-6 group disabled:opacity-50 disabled:grayscale"
                >
                  <div className={`w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 ${isExpanding ? 'animate-spin scale-110' : 'group-hover:rotate-12'}`}>
                     <Icons.Sparkles />
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-black uppercase tracking-[0.4em]">Editorial expansion</p>
                    <p className="text-[10px] font-medium opacity-60 tracking-widest mt-1">Enhance prose quality</p>
                  </div>
                </button>
              </div>

              {auditPerformed && (
                <div className={`p-10 rounded-[3rem] border transition-all duration-700 ${plagiarismScore! >= 80 ? 'bg-rose-50 border-rose-200 shadow-rose-100 shadow-xl' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex items-center justify-between mb-8">
                     <h4 className={`text-[11px] font-black uppercase tracking-[0.3em] ${plagiarismScore! >= 80 ? 'text-rose-600' : 'text-slate-400'}`}>Originality Index</h4>
                     <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${plagiarismScore === 0 ? 'bg-green-100 text-green-700' : plagiarismScore! < 80 ? 'bg-amber-100 text-amber-700' : 'bg-rose-600 text-white shadow-lg'}`}>
                       {plagiarismScore !== undefined ? (100 - plagiarismScore) + '% Unique' : 'Checked'}
                     </span>
                   </div>
                   <div className="space-y-4">
                     {plagiarismMatches.length > 0 ? plagiarismMatches.map((match, i) => (
                       <div key={i} className={`p-4 rounded-2xl flex items-start gap-4 border ${plagiarismScore! >= 80 ? 'bg-white border-rose-100' : 'bg-white border-slate-100'}`}>
                         <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${plagiarismScore! >= 80 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50'}`}>{i + 1}</div>
                         <div className="min-w-0">
                           <p className="text-xs font-bold text-slate-900 truncate mb-1">{match.title}</p>
                           <a href={match.url} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-indigo-600 tracking-widest hover:underline truncate block">View Source</a>
                         </div>
                       </div>
                     )) : (
                       <div className="p-8 text-center bg-white/50 rounded-2xl border border-slate-100">
                          <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-xs font-black uppercase text-green-600 tracking-widest">Verified Original</p>
                       </div>
                     )}
                   </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowSubmitModal(false)} />
           <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] border border-slate-100 p-8 md:p-16 animate-in zoom-in slide-in-from-bottom-12 duration-500 scrollbar-thin scrollbar-thumb-slate-200">
              <header className="mb-12 text-center">
                 <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 transition-colors ${plagiarismScore! >= 80 ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                    <Icons.Pen />
                 </div>
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 font-serif">Submission Review</h2>
                 <p className="text-slate-500 text-lg font-medium leading-relaxed">Manuscript must meet all professional benchmarks.</p>
              </header>
              <div className="space-y-6 mb-16">
                 <QualityCheck label="Strategic Domain Assignment" value={category} passed={category !== 'Uncategorized'} />
                 <QualityCheck label="Narrative Word Density" value={`${audit.wordCount}/${gov?.minWordCount}`} passed={!isContentTooShort} />
                 <QualityCheck label="Architectural Formatting" value={hasHeadings ? 'VALID' : 'MISSING HEADERS'} passed={hasHeadings} />
                 <QualityCheck label="Originality Check" value={auditPerformed ? (plagiarismScore === 0 ? 'CLEAN' : 'SAMPLED') : 'SKIPPED'} passed={true} />
              </div>
              <div className="sticky bottom-0 bg-white pt-6 border-t border-slate-50 mt-12">
                <div className="flex flex-col sm:flex-row gap-6">
                   <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-slate-100 transition-all">Revise Draft</button>
                   <button 
                    onClick={handleSubmission}
                    disabled={isSubmitting || needsFix}
                    className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                   >
                      {isSubmitting ? 'Transmitting...' : 'Confirm Upload'}
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const LiveCheck = ({ label, passed, detail }: { label: string, passed: boolean, detail: string }) => (
  <div className="flex items-center justify-between py-1 group">
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${passed ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'}`}>
        {passed ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
        )}
      </div>
      <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">{label}</span>
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${passed ? 'text-green-400/70' : 'text-rose-400/70'}`}>{detail}</span>
  </div>
);

const QualityCheck = ({ label, value, passed }: { label: string, value: string, passed: boolean }) => (
  <div className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${passed ? 'bg-slate-50 border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
     <div>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${passed ? 'text-slate-400' : 'text-rose-400'}`}>{label}</p>
        <p className={`text-sm font-black uppercase ${passed ? 'text-slate-900' : 'text-rose-600'}`}>{value}</p>
     </div>
     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${passed ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
        {passed ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
        )}
     </div>
  </div>
);

export default EditorPage;
