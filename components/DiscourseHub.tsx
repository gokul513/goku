
import React, { useState, useEffect, useMemo } from 'react';
import { Comment, User, UserRole } from '../types';
// Removed updateComment from imports as it is not exported by storageService and not used in this component.
import { getCommentsByPostId, addComment, softDeleteComment, togglePinComment } from '../services/storageService';
import { Icons } from '../constants';

interface DiscourseHubProps {
  postId: string;
  postAuthorId: string;
  currentUser: User | null;
}

const DiscourseHub: React.FC<DiscourseHubProps> = ({ postId, postAuthorId, currentUser }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    const cms = await getCommentsByPostId(postId);
    setComments(cms);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !content.trim()) return;

    setIsSubmitting(true);
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      postId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content,
      createdAt: new Date().toISOString(),
      parentId: replyTo?.id,
      isPinned: false,
      isDeleted: false,
      likes: 0
    };

    await addComment(newComment);
    setContent('');
    setReplyTo(null);
    await loadComments();
    setIsSubmitting(false);
  };

  const handleTogglePin = async (id: string) => {
    await togglePinComment(id, postId);
    await loadComments();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this discourse entry? Thread hierarchy will be preserved but content masked.")) {
      await softDeleteComment(id);
      await loadComments();
    }
  };

  // Build discourse tree
  const tree = useMemo(() => {
    const map = new Map<string, Comment & { children: any[] }>();
    const roots: any[] = [];

    comments.forEach(c => map.set(c.id, { ...c, children: [] }));
    
    comments.forEach(c => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Reorder roots so pinned is first
    return roots.sort((a, b) => {
      if (a.isPinned) return -1;
      if (b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [comments]);

  return (
    <section className="mt-24 pt-12 border-t border-slate-100">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Narrative Discourse</h3>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">{comments.length} total entries</p>
        </div>
        {!currentUser && (
          <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full">Sign in to participate</p>
        )}
      </div>

      {currentUser && (
        <form onSubmit={handleSubmit} className="mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
          {replyTo && (
            <div className="flex items-center justify-between mb-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                 Replying to <span className="text-indigo-600">@{replyTo.authorName}</span>
               </p>
               <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-900">
                 <Icons.X />
               </button>
            </div>
          )}
          <div className="relative group">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contribute to the discourse..."
              className="w-full min-h-[140px] bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/20 outline-none transition-all resize-none text-lg font-medium placeholder:text-slate-300 shadow-inner"
            />
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="absolute bottom-4 right-4 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all transform active:scale-95 disabled:opacity-30"
            >
              {isSubmitting ? 'Transmitting...' : 'Post Entry'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {isLoading ? (
          [1, 2].map(i => <div key={i} className="h-40 bg-slate-50 rounded-[2.5rem] animate-pulse" />)
        ) : tree.length > 0 ? (
          tree.map(node => (
            <DiscourseItem 
              key={node.id} 
              comment={node} 
              onReply={setReplyTo} 
              onDelete={handleDelete}
              onPin={handleTogglePin}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
              isRoot
            />
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-serif italic text-xl">The discourse is currently silent.</p>
          </div>
        )}
      </div>
    </section>
  );
};

interface ItemProps {
  comment: any;
  onReply: (c: Comment) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  currentUser: User | null;
  postAuthorId: string;
  isRoot?: boolean;
}

const DiscourseItem: React.FC<ItemProps> = ({ comment, onReply, onDelete, onPin, currentUser, postAuthorId, isRoot }) => {
  const canDelete = currentUser && (currentUser.id === comment.authorId || currentUser.id === postAuthorId || currentUser.role === UserRole.ADMIN);
  const canPin = currentUser && (currentUser.id === postAuthorId || currentUser.role === UserRole.ADMIN);
  const isPostAuthor = comment.authorId === postAuthorId;

  return (
    <div className={`group animate-in fade-in slide-in-from-bottom-4 duration-500 ${comment.isPinned ? 'ring-2 ring-indigo-500/20 bg-indigo-50/10' : ''} ${isRoot ? '' : 'ml-8 md:ml-12 border-l border-slate-100 pl-8'}`}>
      <div className={`p-8 md:p-10 rounded-[2.5rem] transition-all relative ${comment.isPinned ? 'bg-white shadow-xl' : 'hover:bg-slate-50/80 border border-transparent hover:border-slate-100'}`}>
        {comment.isPinned && (
          <div className="absolute -top-3 left-10 flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200">
            <Icons.Pin />
            <span className="text-[9px] font-black uppercase tracking-widest">Pinned Narrative</span>
          </div>
        )}

        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
              {comment.authorAvatar ? (
                <img src={comment.authorAvatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-black uppercase">
                  {comment.authorName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">@{comment.authorName}</span>
                {isPostAuthor && (
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest">Author</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canPin && isRoot && (
              <button onClick={() => onPin(comment.id)} className={`p-2 rounded-xl transition-all ${comment.isPinned ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:text-indigo-600'}`}>
                <Icons.Pin />
              </button>
            )}
            {currentUser && !comment.isDeleted && (
              <button onClick={() => onReply(comment)} className="p-2 bg-white text-slate-400 border border-slate-100 rounded-xl hover:text-indigo-600 transition-all">
                <Icons.Reply />
              </button>
            )}
            {canDelete && !comment.isDeleted && (
              <button onClick={() => onDelete(comment.id)} className="p-2 bg-white text-slate-400 border border-slate-100 rounded-xl hover:text-red-600 transition-all">
                <Icons.Trash />
              </button>
            )}
          </div>
        </header>

        <div className={`text-lg leading-relaxed ${comment.isDeleted ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
          {comment.content}
        </div>
      </div>

      {comment.children.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.children.map((child: any) => (
            <DiscourseItem 
              key={child.id} 
              comment={child} 
              onReply={onReply} 
              onDelete={onDelete} 
              onPin={onPin}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscourseHub;
