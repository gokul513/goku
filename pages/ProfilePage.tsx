
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../App';
import { getPosts } from '../services/storageService';
import { Post } from '../types';
import { Icons } from '../constants';

type ProfileTab = 'bookmarks' | 'liked' | 'identity';

interface ProfilePageProps {
  initialTab?: ProfileTab;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ initialTab = 'bookmarks' }) => {
  const { user, setView } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPasskey, setShowPasskey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setView('home');
      return;
    }
    const fetchPosts = async () => {
      const allPosts = await getPosts();
      setPosts(allPosts);
    };
    fetchPosts();
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const filteredPosts = useMemo(() => {
    if (!user) return [];
    if (activeTab === 'bookmarks') {
      return posts.filter(p => user.bookmarks.includes(p.id));
    } else if (activeTab === 'liked') {
      return posts.filter(p => user.likedPosts.includes(p.id));
    }
    return [];
  }, [user, activeTab, posts]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 animate-in fade-in duration-700">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-16 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]">
        <div className="relative">
          {user.avatar ? (
            <img src={user.avatar} className="w-32 h-32 rounded-full border-4 border-indigo-50 shadow-xl object-cover" alt={user.name} />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-indigo-50 shadow-xl bg-indigo-600 flex items-center justify-center text-white text-4xl font-black uppercase">
              {user.name.charAt(0)}
            </div>
          )}
          <button 
            onClick={() => setView('profile_edit')}
            className="absolute bottom-0 right-0 p-2.5 bg-slate-900 text-white rounded-full shadow-lg border-2 border-white hover:bg-indigo-600 transition-all hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </button>
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <h1 className="text-4xl font-black text-slate-900 font-serif tracking-tight">{user.name}</h1>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-100">{user.role}</span>
          </div>
          <p className="text-slate-500 font-medium mb-6">{user.email}</p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Narratives</p>
              <p className="text-lg font-black text-slate-900">{user.bookmarks.length}</p>
            </div>
            <div className="bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Appreciations</p>
              <p className="text-lg font-black text-slate-900">{user.likedPosts.length}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setView('profile_edit')}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all self-center md:self-start"
        >
          Customize Identity
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-10 border-b border-slate-100 mb-12 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'bookmarks' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          My Collection
          {activeTab === 'bookmarks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-in slide-in-from-left-2 duration-300" />}
        </button>
        <button 
          onClick={() => setActiveTab('liked')}
          className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'liked' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          Appreciations
          {activeTab === 'liked' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-in slide-in-from-left-2 duration-300" />}
        </button>
        <button 
          onClick={() => setActiveTab('identity')}
          className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'identity' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          Identity & Security
          {activeTab === 'identity' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-in slide-in-from-left-2 duration-300" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'identity' ? (
          <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Credentials Card */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Icons.User />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Credential Vault</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="group">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Display Username</label>
                      <button 
                        onClick={() => handleCopy(user.name, 'name')}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedField === 'name' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700 flex justify-between items-center">
                      <span>{user.name}</span>
                    </div>
                  </div>
                  <div className="group">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">System Identifier (Email)</label>
                      <button 
                        onClick={() => handleCopy(user.email, 'email')}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedField === 'email' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Status Card */}
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 text-indigo-400 rounded-2xl flex items-center justify-center">
                    <Icons.Pin />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Passkey Protocol</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Secure Passkey</label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowPasskey(!showPasskey)}
                          className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20 transition-all"
                        >
                          {showPasskey ? 'Hide' : 'Reveal'}
                        </button>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-white rounded shadow-sm">Verified</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-white tracking-widest relative">
                      {showPasskey ? (
                        <span className="animate-in fade-in duration-300">DemoPasskey123!</span>
                      ) : (
                        <span>••••••••••••</span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/40 mt-4 italic leading-relaxed">Identity vault access requires active session verification. Reveal protocol enabled for recovery synchronization.</p>
                  </div>

                  <button 
                    onClick={() => setView('profile_edit')}
                    className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95"
                  >
                    Modify Passkey Configuration
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-[3rem] flex items-start gap-6">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                 <Icons.Sparkles />
               </div>
               <div>
                 <h4 className="font-black text-indigo-900 mb-1">Identity Continuity</h4>
                 <p className="text-sm text-indigo-700/70 font-medium leading-relaxed">Your narrative identifiers were established on {new Date(user.joinedAt).toLocaleDateString()}. For system-wide synchronization, ensure your <span className="font-black text-indigo-900">Email Identifier</span> remains verified in the global registry.</p>
               </div>
            </div>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
            {filteredPosts.map(post => (
              <button key={post.id} onClick={() => setView({ type: 'post', id: post.id })} className="group text-left">
                <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                  <div className="aspect-video overflow-hidden">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-10">
                    <h3 className="text-xl font-bold mb-4 group-hover:text-indigo-600 transition-colors leading-tight font-serif tracking-tight">{post.title}</h3>
                    <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6">{post.excerpt}</p>
                    <div className="flex items-center gap-3">
                      <img src={`https://picsum.photos/seed/${post.authorId}/100`} className="w-6 h-6 rounded-lg" alt="" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{post.authorName}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-slate-200">
              {activeTab === 'bookmarks' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 font-serif">Empty Space</h3>
            <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">Your {activeTab === 'bookmarks' ? 'collection' : 'appreciation list'} is waiting for new narratives.</p>
            <button 
              onClick={() => setView('home')}
              className="inline-block px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Explore Narratives
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
