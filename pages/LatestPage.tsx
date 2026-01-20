
import React, { useEffect, useState, useMemo } from 'react';
import { getPosts } from '../services/storageService';
import { Post } from '../types';
import PostCard from '../components/PostCard';

const INITIAL_VISIBLE = 6;
const INCREMENT = 6;

const LatestPage: React.FC = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isAppending, setIsAppending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      setIsLoading(true);
      const posts = await getPosts();
      const published = posts
        .filter(p => p.status === 'PUBLISHED')
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setAllPosts(published);
      setIsLoading(false);
    };
    fetchLatest();
  }, []);

  const handleLoadMore = async () => {
    setIsAppending(true);
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
      <header className="mb-20 text-center">
        <h1 className="text-6xl font-black text-slate-900 mb-4 font-serif tracking-tighter">Latest Arrivals</h1>
        <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          The freshest perspectives from our global community of innovators, updated in real-time.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {visiblePosts.map(post => (
              <div key={post.id} className="relative">
                 <div className="absolute -top-3 -right-3 z-10">
                    <span className="bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl ring-4 ring-white">New</span>
                 </div>
                 <PostCard post={post} />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8">
               <button 
                onClick={handleLoadMore}
                disabled={isAppending}
                className="group relative px-12 py-5 border-2 border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-2xl active:scale-95"
               >
                 <span className={isAppending ? 'opacity-0' : 'opacity-100'}>Extend Stream</span>
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
      )}

      {!isLoading && allPosts.length === 0 && (
        <div className="text-center py-40 bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
          <p className="text-slate-400 italic text-xl font-serif">No fresh narratives detected in the stream.</p>
        </div>
      )}
    </div>
  );
};

export default LatestPage;
