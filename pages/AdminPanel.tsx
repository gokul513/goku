
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Post, User, UserRole, PostStatus } from '../types';
import { getPosts, getUsers, moderatePost, requestRevision, restorePost, moderateUserIdentity } from '../services/storageService';
import { Icons } from '../constants';

type AdminTab = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'DELETED' | 'VERIFICATIONS';

const AdminPanel: React.FC = () => {
  const { user, setView } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('PENDING');
  
  // Moderation Handshake States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'REJECTED' | 'REVISION_REQUESTED' | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) {
      setView('home');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [allPosts, allUsers] = await Promise.all([getPosts(), getUsers()]);
    setPosts(allPosts);
    setUsers(allUsers);
  };

  const openModerationModal = (post: Post, type: 'REJECTED' | 'REVISION_REQUESTED') => {
    setSelectedPost(post);
    setModalType(type);
    setModerationNote('');
    setShowModal(true);
  };

  const handleModerationSubmit = async () => {
    if (!selectedPost || !modalType) return;
    if (modalType === 'REVISION_REQUESTED' && !moderationNote.trim()) {
      alert("Council standards require explicit feedback for revision requests.");
      return;
    }

    setIsProcessing(true);
    try {
      if (modalType === 'REVISION_REQUESTED') {
        await requestRevision(selectedPost.id, moderationNote);
      } else {
        await moderatePost(selectedPost.id, 'REJECTED', moderationNote);
      }
      
      await loadData();
      setShowModal(false);
      setSelectedPost(null);
      setModalType(null);
    } catch (err) {
      alert("Handshake failure. Audit logs may be locked.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickApprove = async (id: string) => {
    setIsProcessing(true);
    await moderatePost(id, 'PUBLISHED');
    await loadData();
    setIsProcessing(false);
  };

  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    await restorePost(id);
    await loadData();
    setIsProcessing(false);
  };

  const handleApproveUser = async (userId: string) => {
    setIsProcessing(true);
    await moderateUserIdentity(userId, true);
    await loadData();
    setIsProcessing(false);
  };

  const filteredPosts = useMemo(() => posts.filter(p => p.status === activeTab), [posts, activeTab]);
  const pendingAuthors = useMemo(() => users.filter(u => u.role === UserRole.AUTHOR && !u.isApproved && !u.isSubscribed), [users]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 font-serif tracking-tight mb-2">Council Hub</h1>
          <p className="text-slate-500 font-medium tracking-tight uppercase text-xs">Strategic Platform Oversight</p>
        </div>
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-[2rem] shadow-inner">
           {(['PENDING', 'PUBLISHED', 'REJECTED', 'DELETED', 'VERIFICATIONS'] as const).map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab)}
               className={`px-6 md:px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {tab}
               {tab === 'VERIFICATIONS' && pendingAuthors.length > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-lg animate-pulse">
                   {pendingAuthors.length}
                 </span>
               )}
             </button>
           ))}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        {activeTab === 'VERIFICATIONS' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-8 py-5">Creator Identity</th>
                <th className="px-6 py-5">Credential Request</th>
                <th className="px-8 py-5 text-right">Administrative Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingAuthors.map(pendingUser => (
                <tr key={pendingUser.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                      <img src={pendingUser.avatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100" />
                      <div>
                        <p className="font-black text-slate-900 leading-tight mb-1">{pendingUser.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pendingUser.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-xs font-medium text-slate-600 italic line-clamp-2 max-w-xs">
                      {pendingUser.bio || "No verification statement provided."}
                    </p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2">
                      Registered: {new Date(pendingUser.joinedAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                       <button 
                        onClick={() => handleApproveUser(pendingUser.id)}
                        disabled={isProcessing}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                       >
                         {isProcessing ? 'Processing...' : 'Verify Identity'}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-8 py-5">Narrative Insight</th>
                <th className="px-6 py-5">Originality Audit</th>
                <th className="px-8 py-5 text-right">Council Commands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPosts.map(post => (
                <tr key={post.id} className={`group hover:bg-slate-50/30 transition-colors ${activeTab === 'DELETED' ? 'opacity-70' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                      <img src={post.coverImage} className="w-16 h-12 rounded-xl object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                      <div>
                        <button onClick={() => setView({ type: 'post', id: post.id })} className="font-black text-slate-900 leading-tight mb-1 hover:text-indigo-600 text-left block">
                          {post.title}
                        </button>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By {post.authorName} • {post.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${post.plagiarismScore! >= 80 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                           {post.plagiarismScore !== undefined ? `${100 - post.plagiarismScore}% Original` : 'Unscanned'}
                         </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {post.plagiarismMatches?.length || 0} Matched Sources
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      {activeTab === 'DELETED' ? (
                        <button 
                          onClick={() => handleRestore(post.id)} 
                          disabled={isProcessing}
                          className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                        >
                          <Icons.Reply /> Restore Narrative
                        </button>
                      ) : (
                        <>
                          {activeTab === 'PENDING' && (
                            <button 
                              onClick={() => openModerationModal(post, 'REVISION_REQUESTED')}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent hover:border-indigo-100 transition-all"
                            >
                              Revise
                            </button>
                          )}
                          
                          {activeTab !== 'PUBLISHED' && (
                            <button 
                              onClick={() => handleQuickApprove(post.id)} 
                              disabled={isProcessing}
                              className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all border border-green-100" 
                              title="Authorize Publication"
                            >
                              <Icons.Pin />
                            </button>
                          )}

                          {activeTab !== 'REJECTED' && (
                            <button 
                              onClick={() => openModerationModal(post, 'REJECTED')}
                              disabled={isProcessing}
                              className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100" 
                              title="Archive Narrative"
                            >
                              <Icons.Trash />
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setView({ type: 'post', id: post.id })} 
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Review
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {((activeTab === 'VERIFICATIONS' && pendingAuthors.length === 0) || 
           (activeTab !== 'VERIFICATIONS' && filteredPosts.length === 0)) && (
          <div className="py-40 text-center bg-slate-50/30">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl opacity-20">
               <Icons.Book />
             </div>
             <p className="text-xl font-serif italic text-slate-400">
               {activeTab === 'DELETED' ? 'The deleted archive is empty.' : 
                activeTab === 'REJECTED' ? 'No narratives currently blacklisted.' : 
                activeTab === 'VERIFICATIONS' ? 'No identity credentials awaiting review.' :
                'The moderation stream is currently clear.'}
             </p>
          </div>
        )}
      </div>

      {/* Unified Moderation Command Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" onClick={() => !isProcessing && setShowModal(false)} />
           <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${modalType === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                {modalType === 'REJECTED' ? <Icons.Trash /> : <Icons.Reply />}
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 font-serif">
                {modalType === 'REJECTED' ? 'Archive Narrative' : 'Revision Protocol'}
              </h2>
              <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                {modalType === 'REJECTED' 
                  ? 'Confirm the permanent removal of this narrative from the public stream. Provide a justification for the author.' 
                  : 'Specify the strategic adjustments required before this narrative can be authorized.'}
              </p>
              
              <textarea 
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Editorial justification..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[150px] mb-8 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all text-sm font-medium shadow-inner"
                disabled={isProcessing}
              />
              
              <div className="flex gap-4">
                 <button 
                  onClick={() => setShowModal(false)} 
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                  onClick={handleModerationSubmit} 
                  disabled={isProcessing}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                    modalType === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                  }`}
                 >
                   {isProcessing ? 'Synchronizing...' : (modalType === 'REJECTED' ? 'Confirm Archive' : 'Dispatch Feedback')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
