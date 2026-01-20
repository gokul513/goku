
import React, { useState, useEffect, useRef } from 'react';
import { User, NexusGroup, NexusMessage, NexusMessageType, UserRole } from '../types';
import { getNexusMessages, sendNexusMessage, getMembersOfGroup, addNexusMember, removeNexusMember, getUsers } from '../services/storageService';
import { Icons } from '../constants';

interface NexusInterfaceProps {
  user: User;
  group: NexusGroup;
  onClose: () => void;
}

const NexusInterface: React.FC<NexusInterfaceProps> = ({ user, group, onClose }) => {
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [msgs, mems, users] = await Promise.all([
        getNexusMessages(group.id),
        getMembersOfGroup(group.id),
        getUsers()
      ]);
      setMessages(msgs);
      setMembers(mems);
      setAllUsers(users);
    };
    loadData();

    // Simulated real-time polling (every 3 seconds)
    const interval = setInterval(async () => {
      const msgs = await getNexusMessages(group.id);
      if (msgs.length !== messages.length) {
        setMessages(msgs);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [group.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const msg = await sendNexusMessage(user, group.id, {
      type: 'TEXT',
      content: inputText.trim()
    });
    setMessages([...messages, msg]);
    inputText && setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      let type: NexusMessageType = 'IMAGE';
      if (file.type.startsWith('video/')) type = 'VIDEO';
      // For mock "Live Photo", we'll just treat GIFs as live photos
      if (file.type === 'image/gif') type = 'LIVE_PHOTO';

      const msg = await sendNexusMessage(user, group.id, {
        type,
        content: '',
        mediaUrl: base64
      });
      setMessages([...messages, msg]);
      setIsUploading(false);
    };
  };

  const handleAddMember = async (userId: string) => {
    await addNexusMember(group.id, userId);
    const mems = await getMembersOfGroup(group.id);
    setMembers(mems);
  };

  const handleRemoveMember = async (userId: string) => {
    await removeNexusMember(group.id, userId);
    const mems = await getMembersOfGroup(group.id);
    setMembers(mems);
  };

  const isOwner = user.id === group.ownerId;

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in duration-500">
      {/* Nexus Header */}
      <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <img src={group.image} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" alt="" />
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{group.name}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{members.length} Active Narrators</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMemberManager(!showMemberManager)}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
            title="Manage Circle"
          >
            <Icons.User />
          </button>
          <button onClick={onClose} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-white rounded-xl transition-all">
            <Icons.X />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Messages Stream */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
            {messages.map((msg, i) => {
              const isMine = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex gap-3 max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-xl border border-white shadow-sm self-end overflow-hidden flex-shrink-0">
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {msg.senderName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className={`space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                        {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className={`p-4 rounded-3xl ${
                        isMine ? 'bg-slate-950 text-white shadow-xl rounded-tr-none' : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.type === 'TEXT' && <p className="text-sm font-medium leading-relaxed">{msg.content}</p>}
                        {msg.type === 'IMAGE' && (
                           <div className="space-y-2">
                             <img src={msg.mediaUrl} className="rounded-2xl max-h-60 w-full object-cover" />
                             {msg.content && <p className="text-xs italic">{msg.content}</p>}
                           </div>
                        )}
                        {msg.type === 'VIDEO' && (
                           <video src={msg.mediaUrl} controls className="rounded-2xl max-h-60" />
                        )}
                        {msg.type === 'LIVE_PHOTO' && (
                           <div className="relative group">
                             <img src={msg.mediaUrl} className="rounded-2xl max-h-60" />
                             <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/50 text-[8px] text-white rounded-full font-black uppercase tracking-widest backdrop-blur-sm">Live</span>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <footer className="p-6 border-t border-slate-50 bg-white">
            <form onSubmit={handleSend} className="relative flex items-center gap-4">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors"
                title="Dispatch Media"
              >
                <Icons.Share />
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*,video/*"
                onChange={handleFileUpload}
              />
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Participate in the discourse..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() && !isUploading}
                className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
          </footer>
        </div>

        {/* Member Manager Pane */}
        {showMemberManager && (
          <div className="w-80 border-l border-slate-50 bg-slate-50/50 p-8 overflow-y-auto animate-in slide-in-from-right-10 duration-500">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Narrator Circle</h4>
            
            <div className="space-y-6 mb-12">
               {members.map(mem => (
                 <div key={mem.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                         {mem.avatar ? (
                           <img src={mem.avatar} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black uppercase">
                             {mem.name.charAt(0)}
                           </div>
                         )}
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-800 leading-none mb-0.5">{mem.name}</p>
                          <p className="text-[8px] font-black uppercase text-indigo-500">{mem.role}</p>
                       </div>
                    </div>
                    {isOwner && mem.id !== user.id && (
                       <button 
                        onClick={() => handleRemoveMember(mem.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                       >
                         <Icons.X />
                       </button>
                    )}
                 </div>
               ))}
            </div>

            {isOwner && (
               <>
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Invite Peers</h4>
                 <div className="space-y-4">
                    {allUsers.filter(u => !group.memberIds.includes(u.id)).map(u => (
                      <button 
                        key={u.id}
                        onClick={() => handleAddMember(u.id)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all text-left"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-[8px] font-black uppercase">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-700">{u.name}</p>
                         </div>
                         <Icons.Pen />
                      </button>
                    ))}
                 </div>
               </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NexusInterface;
