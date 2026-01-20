
import React, { useEffect, useState } from 'react';
import { getPosts } from '../services/storageService.ts';
import { Post, Category } from '../types.ts';
import { useAuth } from '../App.tsx';
import PostCard from '../components/PostCard.tsx';

const CATEGORIES: Category[] = ['Engineering', 'Design', 'Culture', 'Business', 'Product'];

const HomePage: React.FC = () => {
  const { user, setView } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [categorySpotlights, setCategorySpotlights] = useState<Record<string, Post[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const all = await getPosts();
        const published = all.filter(p => p.status === 'PUBLISHED');
        
        setFeaturedPost(published.find(p => p.isFeatured) || published[0] || null);
        setPosts(published.slice(0, 6));

        const spotlights: Record<string, Post[]> = {};
        CATEGORIES.forEach(cat => {
          spotlights[cat] = published.filter(p => p.category === cat).slice(0, 3);
        });
        setCategorySpotlights(spotlights);
      } catch (err) {
        console.error("Home state synchronization error", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen pb-32">
      <div className={`max-w-7xl mx-auto px-5 md:px-10 py-16 transition-all duration-1000 ${!user ? 'opacity-30 blur-xl pointer-events-none select-none' : 'opacity-100'}`}>
        
        {/* Cinema Hero */}
        {featuredPost && (
          <section className="mb-28">
            <button onClick={() => setView({ type: 'post', id: featuredPost.id })} className="group text-left block w-full relative rounded-[3rem] overflow-hidden aspect-[21/9] shadow-2xl shadow-indigo-100/50">
              <img 
                src={featuredPost.coverImage} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3000ms] ease-out" 
                alt="" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-10 md:p-20 max-w-4xl">
                 <div className="flex items-center gap-4 mb-8">
                   <span className="px-5 py-2 bg-indigo-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                     Featured Perspective
                   </span>
                   <div className="h-px w-10 bg-white/20"></div>
                   <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                     {featuredPost.category}
                   </span>
                 </div>
                 <h2 className="text-4xl md:text-7xl font-serif font-black text-white mb-8 leading-[1.1] tracking-tighter group-hover:text-indigo-100 transition-colors">
                   {featuredPost.title}
                 </h2>
                 <div className="flex items-center gap-6 text-white/70 text-sm font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                      <img src={`https://picsum.photos/seed/${featuredPost.authorId}/100`} className="w-10 h-10 rounded-2xl border-2 border-white/20 shadow-xl" alt="" />
                      <span className="text-white font-black">{featuredPost.authorName}</span>
                    </div>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    <span>{featuredPost.readingTime} min read</span>
                 </div>
              </div>
            </button>
          </section>
        )}

        {/* Global Stream */}
        <section className="mb-32">
           <div className="flex items-center justify-between mb-12 border-b border-slate-100 pb-8">
             <h2 className="text-4xl font-black text-slate-900 font-serif tracking-tighter">Latest Arrivals</h2>
             <button onClick={() => setView('latest')} className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">View Entire Stream →</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {posts.map(post => <PostCard key={post.id} post={post} />)}
           </div>
        </section>

        {/* Domain Grids */}
        {CATEGORIES.map(cat => {
          const catPosts = categorySpotlights[cat] || [];
          if (catPosts.length === 0) return null;
          
          return (
            <section key={cat} className="mb-32">
              <div className="flex items-center justify-between mb-12 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-indigo-600 rounded-full" />
                  <h2 className="text-3xl font-black text-slate-900 font-serif tracking-tighter uppercase tracking-widest">{cat} Sector</h2>
                </div>
                <button 
                  onClick={() => setView({ type: 'topics' })}
                  className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:translate-x-2 transition-transform"
                >
                  Explore {cat} Archive →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {catPosts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </section>
          );
        })}
      </div>

      {!user && (
        <div className="fixed inset-0 flex items-center justify-center px-6 z-[100] pointer-events-none">
          <div className="max-w-2xl w-full bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[4rem] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] text-center animate-in zoom-in slide-in-from-bottom-24 duration-1000 pointer-events-auto">
             <div className="w-24 h-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-3">
               <span className="text-white text-4xl font-black">L.</span>
             </div>
             <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-serif mb-6 tracking-tighter">Identity Required.</h2>
             <p className="text-slate-500 text-xl font-medium leading-relaxed mb-12">
               Authenticate your session to access the multi-domain narrative library and participating in verified discourse.
             </p>
             <div className="flex flex-col sm:flex-row gap-5">
               <button onClick={() => setView('login')} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100">Enter Gateway</button>
               <button onClick={() => setView('signup')} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] hover:border-indigo-600 hover:text-indigo-600 transition-all">Establish Identity</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
