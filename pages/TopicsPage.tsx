
import React, { useState, useMemo, useEffect } from 'react';
import { getPostsByCategory } from '../services/storageService';
import { Post, Category } from '../types';
import PostCard from '../components/PostCard';
import { useAuth } from '../App';

const CATEGORIES: Category[] = ['Engineering', 'Design', 'Culture', 'Business', 'Product'];
const INITIAL_VISIBLE = 6;
const INCREMENT = 6;

const TopicsPage: React.FC = () => {
  const { setView } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<Category | 'All'>('All');
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const results = await getPostsByCategory(selectedTopic);
      setAllPosts(results);
      setVisibleCount(INITIAL_VISIBLE); // Reset count on category change
      setIsLoading(false);
    };
    fetchData();
  }, [selectedTopic]);

  const handleLoadMore = async () => {
    setIsAppending(true);
    // Simulate network handshake/latency for UX feel
    await new Promise(resolve => setTimeout(resolve, 600));
    setVisibleCount(prev => prev + INCREMENT);
    setIsAppending(false);
  };

  const visiblePosts = useMemo(() => {
    return allPosts.slice(0, visibleCount);
  }, [allPosts, visibleCount]);

  const hasMore = visibleCount < allPosts.length;

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 py-16 animate-in fade-in duration-1000">
      <header className="mb-20">
        <div className="max-w-3xl">
          <h1 className="text-6xl font-black text-slate-900 mb-6 font-serif tracking-tighter">Domain Archive</h1>
          <p className="text-slate-500 text-xl font-medium leading-relaxed">
            Navigate through specialized silos of inquiry. Our curation engine segments narratives by strategic domain to facilitate deeper research.
          </p>
        </div>
      </header>

      {/* Domain Selection Tabs */}
      <div className="flex flex-wrap gap-3 mb-24 p-2 bg-slate-50 rounded-[2.5rem] border border-slate-100">
        <button 
          onClick={() => setSelectedTopic('All')}
          className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTopic === 'All' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          All Narratives
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedTopic(cat)}
            className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTopic === cat ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : allPosts.length > 0 ? (
        <div className="space-y-20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Inquiries in <span className="text-indigo-600 uppercase tracking-widest">{selectedTopic}</span></h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{allPosts.length} Narratives Found</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {visiblePosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-10">
               <button 
                onClick={handleLoadMore}
                disabled={isAppending}
                className="group relative px-12 py-5 border-2 border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-2xl hover:shadow-indigo-50 active:scale-95 disabled:opacity-50"
               >
                 <span className={isAppending ? 'opacity-0' : 'opacity-100'}>Access More Narratives</span>
                 {isAppending && (
                   <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                   </div>
                 )}
               </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-40 bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 font-serif">Domain Pending</h3>
            <p className="text-slate-400 font-medium leading-relaxed mb-10">We haven't archived any verified narratives under the "{selectedTopic}" domain yet. Be the first to establish this sector.</p>
            <button 
              onClick={() => setView('new')}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
            >
              Draft Initial Inquiry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicsPage;
