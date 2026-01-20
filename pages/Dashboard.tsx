
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App.tsx';
import { getPosts, deletePost, subscribeToPro, getAuthorMessages, markMessageAsRead, getNexusGroupsForUser, createNexusGroup } from '../services/storageService.ts';
import { Post, UserRole, PostStatus, Message, NexusGroup } from '../types.ts';
import { Icons } from '../constants.tsx';
import NexusInterface from '../components/NexusInterface.tsx';

type DashboardTab = 'LIBRARY' | 'INBOX' | 'GROUPS';

const Dashboard: React.FC = () => {
  const { user, setView, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('LIBRARY');
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<(Message & { isRead: boolean })[]>([]);
  const [nexusGroups, setNexusGroups] = useState<NexusGroup[]>([]);
  const [activeNexusGroup, setActiveNexusGroup] = useState<NexusGroup | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [filter, setFilter] = useState<PostStatus | 'ALL'>('ALL');
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const fetchPosts = async () => {
    if (!user) return;
    setIsLoading(true);
    const all = await getPosts();
    const userPosts = user.role === UserRole.ADMIN 
      ? all 
      : all.filter(p => p.authorId === user.id);
    setPosts(userPosts);
    setIsLoading(false);
  };

  const fetchMessages = async () => {
    if (!user) return;
    const msgs = await getAuthorMessages(user.id);
    setMessages(msgs as (Message & { isRead: boolean })[]);
  };

  const fetchNexusGroups = async () => {
    if (!user) return;
    const groups = await getNexusGroupsForUser(user.id);
    setNexusGroups(groups);
  };

  useEffect(() => {
    if (!user) {
      setView('home');
      return;
    }
    fetchPosts();
    fetchMessages();
    fetchNexusGroups();
  }, [user]);

  const stats = useMemo(() => {
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length;
    const unreadMessages = messages.filter(m => !m.isRead).length;
    return { totalViews, totalLikes, publishedCount, unreadMessages };
  }, [posts, messages]);

  const filteredPosts = useMemo(() => {
    if (filter === 'ALL') return posts.filter(p => p.status !== 'DELETED');
    return posts.filter(p => p.status === filter);
  }, [posts, filter]);

  const handleDelete = async (id: string) => {
    if (confirm('Archive this manuscript? It will be stowed in the deleted narratives section.')) {
      await deletePost(id);
      await fetchPosts();
    }
  };

  const handleMessageExpand = async (msg: Message & { isRead: boolean }) => {
    if (expandedMessageId === msg.id) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(msg.id);
      if (!msg.isRead && user) {
        await markMessageAsRead(msg.id, user.id);
        fetchMessages(); 
      }
    }
  };

  const isVerifiedCreator = user?.role === UserRole.ADMIN || user?.isApproved || user?.isSubscribed;

  if (!isVerifiedCreator && user?.role === UserRole.AUTHOR) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in zoom-in duration-700">
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="p-16 md:p-24 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-indigo-600 shadow-xl shadow-indigo-100">
               <Icons.Pen />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 font-serif tracking-tighter mb-6">creator_status: pending</h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-16">
              Lumina maintains an elite narrative environment. To begin publishing, your identity must be verified by our administrative council.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl transform hover:scale-[1.02] transition-all flex flex-col items-center">
                  <div className="px-5 py-2 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8">Fast-Track Protocol</div>
                  <h3 className="text-2xl font-black mb-4">Pro Creator</h3>
                  <p className="text-slate-400 text-sm font-medium mb-12 leading-relaxed opacity-70">Bypass the verification queue. Establish your creator identity immediately and unlock advanced editorial tools.</p>
                  <div className="text-4xl font-black mb-12">$19<span className="text-lg text-slate-500 font-medium ml-1">/mo</span></div>
                  <button onClick={() => subscribeToPro(user!.id).then(refreshUser)} disabled={isSubscribing} className="w-full py-5 bg-white text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                    {isSubscribing ? 'Processing Transaction...' : 'Establish Subscription'}
                  </button>
               </div>
               <div className="bg-white border-2 border-slate-100 p-10 rounded-[3rem] flex flex-col items-center group">
                  <div className="px-5 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8">Standard Queue</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Manual Review</h3>
                  <p className="text-slate-500 text-sm font-medium mb-12 leading-relaxed">Your profile has been submitted to the Council. Average processing time is currently <span className="font-black text-slate-900">72 hours</span>.</p>
                  <button disabled className="w-full py-5 border-2 border-slate-100 text-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] cursor-not-allowed">
                    Review in Progress
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
        <div>
          <h1 className="text-6xl font-black text-slate-900 font-serif tracking-tighter mb-4">The Author Hub</h1>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-600">Principal Performance Oversight</p>
        </div>
        
        <div className="flex wrap gap-5">
          <StatCard label="Total Views" value={stats.totalViews} />
          <StatCard label="Appreciations" value={stats.totalLikes} />
          <StatCard label="Published" value={stats.publishedCount} />
        </div>
      </header>

      <div className="flex gap-12 border-b border-slate-100 mb-16 overflow-x-auto no-scrollbar">
        {(['LIBRARY', 'INBOX', 'GROUPS'] as DashboardTab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-6 px-2 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
          >
            {tab}
            {tab === 'INBOX' && stats.unreadMessages > 0 && (
              <span className="absolute -top-1 -right-4 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-lg">
                {stats.unreadMessages}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-indigo-600 rounded-full animate-in slide-in-from-left duration-500" />
            )}
          </button>
        ))}
      </div>

      <main>
        {activeTab === 'LIBRARY' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-12">
               <div className="flex gap-3 p-2 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  {(['ALL', 'PUBLISHED', 'PENDING', 'DRAFT'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {f}
                    </button>
                  ))}
               </div>
               <button onClick={() => setView('new')} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95">
                 <Icons.Pen /> New Narrative
               </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredPosts.map(post => (
                <div key={post.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all group flex flex-col md:flex-row items-center gap-10">
                  <div className="w-full md:w-40 h-28 rounded-3xl overflow-hidden shrink-0 shadow-lg">
                    <img src={post.coverImage} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        post.status === 'PUBLISHED' ? 'bg-green-50 text-green-600 border border-green-100' :
                        post.status === 'PENDING' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse' :
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {post.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{post.category}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors tracking-tight">{post.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Reading Time: {post.readingTime}m • Views: {post.views.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setView({ type: 'edit', id: post.id })} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Edit Thesis">
                      <Icons.Pen />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Stow Archive">
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="py-40 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                  <p className="text-slate-400 font-serif italic text-2xl">No archived narratives in this sector.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'INBOX' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
             {messages.map(msg => (
               <div key={msg.id} className={`bg-white rounded-[3rem] border transition-all ${msg.isRead ? 'border-slate-50 opacity-60 hover:opacity-100' : 'border-indigo-100 shadow-2xl shadow-indigo-50/50 scale-[1.01]'}`}>
                 <button 
                  onClick={() => handleMessageExpand(msg)}
                  className="w-full p-10 text-left"
                 >
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${msg.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-xl rotate-3'}`}>
                          <Icons.Mail />
                        </div>
                        <div>
                          <p className={`text-xl font-black ${msg.isRead ? 'text-slate-500' : 'text-slate-900'} tracking-tight`}>{msg.subject}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Lumina Editorial Council • {new Date(msg.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {!msg.isRead && <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200"></div>}
                   </div>
                   {expandedMessageId === msg.id && (
                     <div className="mt-10 pt-10 border-t border-slate-50 animate-in fade-in duration-500">
                        <p className="text-slate-700 text-lg leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                        <div className="mt-10 flex justify-end">
                          <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all">Submit Response Protocol</button>
                        </div>
                     </div>
                   )}
                 </button>
               </div>
             ))}
             {messages.length === 0 && (
                <div className="py-40 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                   <p className="text-slate-400 font-serif italic text-2xl">Transmission buffer is clear.</p>
                </div>
             )}
          </div>
        )}

        {activeTab === 'GROUPS' && (
          <div className="animate-in fade-in duration-700">
             {activeNexusGroup ? (
               <div className="relative">
                 <button 
                  onClick={() => setActiveNexusGroup(null)}
                  className="mb-10 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-all group"
                 >
                   <Icons.Reply /> <span className="group-hover:-translate-x-1 transition-transform">Back to Circles</span>
                 </button>
                 <NexusInterface 
                   user={user!} 
                   group={activeNexusGroup} 
                   onClose={() => setActiveNexusGroup(null)} 
                 />
               </div>
             ) : (
               <>
                 <div className="flex items-center justify-between mb-16">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Narrative Circles</h2>
                   <button 
                     onClick={() => setView('dashboard')} 
                     className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
                   >
                     Initialize Nexus
                   </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {nexusGroups.map(group => (
                      <button 
                        key={group.id} 
                        onClick={() => setActiveNexusGroup(group)}
                        className="group bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-700 text-left"
                      >
                         <div className="flex items-center gap-8 mb-10">
                            <img src={group.image} className="w-24 h-24 rounded-[2.5rem] border-8 border-slate-50 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-700" alt="" />
                            <div className="flex-1">
                               <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 tracking-tight">{group.name}</h3>
                               <p className="text-[11px] font-black uppercase text-indigo-600 tracking-[0.2em]">{group.type.replace('_', ' ')}</p>
                            </div>
                         </div>
                         <p className="text-base font-medium text-slate-500 leading-relaxed mb-10 line-clamp-2">{group.description}</p>
                         <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">{group.memberIds.length} Members</span>
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em]">Enter Archive →</span>
                         </div>
                      </button>
                    ))}
                    {nexusGroups.length === 0 && (
                      <div className="col-span-full py-40 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                        <p className="text-slate-400 font-serif italic text-2xl">No active nexus connections established.</p>
                      </div>
                    )}
                 </div>
               </>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string, value: number }) => (
  <div className="bg-white px-10 py-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center min-w-[160px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</span>
    <span className="text-3xl font-black text-slate-900 tracking-tight">{value.toLocaleString()}</span>
  </div>
);

export default Dashboard;
