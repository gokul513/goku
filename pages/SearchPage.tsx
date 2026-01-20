
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../App';
import { Post, User, Category, UserRole } from '../types';
import { searchPlatform } from '../services/storageService';
import PostCard from '../components/PostCard';
import { Icons } from '../constants';

interface SearchPageProps {
  initialQuery?: string;
  initialCategory?: string;
}

const CATEGORIES: Category[] = ['Engineering', 'Design', 'Culture', 'Business', 'Product'];
const INITIAL_VISIBLE = 6;
const INCREMENT = 6;

const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '', initialCategory = '' }) => {
  const { setView } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [activeTab, setActiveTab] = useState<'NARRATIVES' | 'CREATORS' | 'READERS'>('NARRATIVES');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [results, setResults] = useState<{ posts: Post[], authors: any[], readers: any[] }>({
    posts: [],
    authors: [],
    readers: []
  });

  useEffect(() => {
    performSearch();
  }, [query, activeCategory]);

  const performSearch = async () => {
    setIsLoading(true);
    const searchResults = await searchPlatform(query, activeCategory || undefined);
    setResults(searchResults);
    setVisibleCount(INITIAL_VISIBLE); // Reset count on query/category change
    setIsLoading(false);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleLoadMore = async () => {
    setIsAppending(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    setVisibleCount(prev => prev + INCREMENT);
    setIsAppending(false);
  };

  const visiblePosts = useMemo(() => results.posts.slice(0, visibleCount), [results.posts, visibleCount]);
  const hasMorePosts = activeTab === 'NARRATIVES' && visibleCount < results.posts.length;

  /**
   * Universal Highlight Engine: Tokenizes the highlight query to illuminate 
   * individual terms with a sophisticated amber aesthetic.
   */
  const renderHighlightedText = useCallback((text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    
    const cleanHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = cleanHighlight.split(/\s+/).filter(t => t.length > 0);
    
    if (tokens.length === 0) return <span>{text}</span>;
    
    const pattern = new RegExp(`(${tokens.join('|')})`, 'gi');
    const parts = text.split(pattern);
    const lowerTokens = tokens.map(t => t.toLowerCase());

    return (
      <span>
        {parts.map((part, i) => 
          lowerTokens.includes(part.toLowerCase()) 
            ? <mark key={i} className="bg-amber-100 text-amber-950 border-b border-amber-400 px-0.5 rounded-sm">{part}</mark> 
            : part
        )}
      </span>
    );
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 py-16 animate-in fade-in duration-700">
      <header className="mb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-end justify-between border-b border-slate-100 pb-12">
          <div className="max-w-xl w-full">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Inquiry Engine</h1>
             </div>
             <div className="relative group">
               <input 
                 type="text" 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search by title, creator, or topic..."
                 className="w-full pl-6 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/20 outline-none shadow-sm transition-all text-xl font-serif placeholder:text-slate-200"
               />
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-[2rem] shadow-inner">
             <button 
               onClick={() => setActiveCategory('')}
               className={`px-6 py-2.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${activeCategory === '' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
             >
               All Domains
             </button>
             {CATEGORIES.map(cat => (
               <button 
                 key={cat}
                 onClick={() => setActiveCategory(cat)}
                 className={`px-6 py-2.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${activeCategory === cat ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>
      </header>

      <div className="flex gap-10 border-b border-slate-100 mb-12 overflow-x-auto no-scrollbar">
         {(['NARRATIVES', 'CREATORS', 'READERS'] as const).map(tab => (
           <button 
             key={tab}
             onClick={() => handleTabChange(tab)}
             className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
           >
             {tab} ({tab === 'NARRATIVES' ? results.posts.length : tab === 'CREATORS' ? results.authors.length : results.readers.length})
           </button>
         ))}
      </div>

      <main className="min-h-[400px]">
         {isLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
             {[1, 2, 3].map(i => (
               <div key={i} className="bg-slate-50 rounded-[2.5rem] aspect-[4/5] animate-pulse" />
             ))}
           </div>
         ) : (
           <div className="space-y-16">
             {activeTab === 'NARRATIVES' && (
               <>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                   {results.posts.length > 0 ? (
                     visiblePosts.map(post => (
                       <PostCard key={post.id} post={post} highlight={query} />
                     ))
                   ) : (
                     <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                        <p className="text-slate-400 italic text-xl font-serif">No narratives found for this inquiry.</p>
                     </div>
                   )}
                 </div>

                 {hasMorePosts && (
                    <div className="flex justify-center pt-8">
                       <button 
                        onClick={handleLoadMore}
                        disabled={isAppending}
                        className="group relative px-12 py-5 border-2 border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-2xl active:scale-95"
                       >
                         <span className={isAppending ? 'opacity-0' : 'opacity-100'}>Load More Results</span>
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
               </>
             )}

             {(activeTab === 'CREATORS' || activeTab === 'READERS') && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {(activeTab === 'CREATORS' ? results.authors : results.readers).length > 0 ? (
                   (activeTab === 'CREATORS' ? results.authors : results.readers).map(u => (
                     <button 
                       key={u.id}
                       onClick={() => setView({ type: u.role === UserRole.READER ? 'profile' : 'author', id: u.id })}
                       className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 text-center"
                     >
                       <img 
                         src={u.avatar} 
                         className="w-20 h-20 rounded-[2rem] border-4 border-slate-50 shadow-xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" 
                         alt="" 
                       />
                       <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 tracking-tight">
                         {renderHighlightedText(u.name, query)}
                       </h3>
                       <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block mb-4">
                         {u.role}
                       </p>
                       <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed italic px-2">
                         {u.bio ? renderHighlightedText(u.bio, query) : "Identity established in the platform records."}
                       </p>
                     </button>
                   ))
                 ) : (
                   <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                      <p className="text-slate-400 italic text-xl font-serif">No identities match this discovery request.</p>
                   </div>
                 )}
               </div>
             )}
           </div>
         )}
      </main>
    </div>
  );
};

export default SearchPage;
