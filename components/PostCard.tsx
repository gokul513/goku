
import React, { useState, useMemo } from 'react';
import { Post } from '../types.ts';
import { useAuth } from '../App.tsx';
import { toggleLikePost, toggleBookmarkPost } from '../services/storageService.ts';
import ShareModal from './ShareModal.tsx';
import { Icons } from '../constants.tsx';

interface PostCardProps {
  post: Post;
  showCategory?: boolean;
  highlight?: string;
}

const HighlightedText = ({ text, highlight }: { text: string; highlight?: string }) => {
  const parts = useMemo(() => {
    if (!highlight?.trim()) return [text];
    const cleanHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = cleanHighlight.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return [text];
    const pattern = new RegExp(`(${tokens.join('|')})`, 'gi');
    return text.split(pattern);
  }, [text, highlight]);

  if (!highlight?.trim()) return <>{text}</>;
  const tokens = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);

  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase())
          ? <mark key={i} className="bg-amber-100 text-amber-950 border-b border-amber-400 px-0.5 rounded-sm">{part}</mark>
          : part
      )}
    </>
  );
};

const PostCard: React.FC<PostCardProps> = ({ post: initialPost, showCategory = true, highlight }) => {
  const { user, setView, refreshUser } = useAuth();
  const [post, setPost] = useState<Post>(initialPost);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setView('login');
      return;
    }
    const res = await toggleLikePost(post.id, user.id);
    if (res) {
      setPost(res.post);
      await refreshUser();
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setView('login');
      return;
    }
    const res = await toggleBookmarkPost(post.id, user.id);
    if (res) {
      await refreshUser();
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const hasLiked = user?.likedPosts?.includes(post.id);
  const isBookmarked = user?.bookmarks?.includes(post.id);

  return (
    <div 
      onClick={() => setView({ type: 'post', id: post.id })} 
      className="group text-left block w-full cursor-pointer"
    >
      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 h-full flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="aspect-[16/10] overflow-hidden relative">
          <img 
            src={post.coverImage} 
            alt={post.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          {showCategory && (
            <div className="absolute top-6 left-6">
              <span className="px-4 py-1.5 bg-white/95 backdrop-blur shadow-xl rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-100">
                {post.category}
              </span>
            </div>
          )}
        </div>
        <div className="p-10 flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <span>{post.readingTime} min read</span>
             <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
             <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          </div>
          <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-600 transition-colors leading-tight font-serif tracking-tight text-slate-900">
            <HighlightedText text={post.title} highlight={highlight} />
          </h3>
          <p className="text-slate-500 text-lg font-medium line-clamp-2 mb-8 flex-1 leading-relaxed">
            <HighlightedText text={post.excerpt} highlight={highlight} />
          </p>
          <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={`https://picsum.photos/seed/${post.authorId}/100`} className="w-8 h-8 rounded-xl border border-slate-100 shadow-sm" alt="" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                <HighlightedText text={post.authorName} highlight={highlight} />
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleBookmark}
                className={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                <Icons.Bookmark />
              </button>
              <button onClick={handleShare} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors">
                <Icons.Share />
              </button>
              <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${hasLiked ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={hasLiked ? 'fill-rose-600' : ''}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span className="font-black">{post.likes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isShareModalOpen && <ShareModal post={post} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />}
    </div>
  );
};

export default PostCard;
