
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from './types.ts';
import { getUserById, seedInitialData, loginWithBackend } from './services/storageService.ts';
import { Icons, APP_NAME } from './constants.tsx';

// Pages
import HomePage from './pages/HomePage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PostDetail from './pages/PostDetail.tsx';
import EditorPage from './pages/EditorPage.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import AuthorProfile from './pages/AuthorProfile.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import LatestPage from './pages/LatestPage.tsx';
import TopicsPage from './pages/TopicsPage.tsx';
import EditProfilePage from './pages/EditProfilePage.tsx';
import SearchPage from './pages/SearchPage.tsx';

// Components
import FlashBanner from './components/FlashBanner.tsx';
import GlobalDictionary from './components/GlobalDictionary.tsx';

export type View = 
  | { type: 'home' }
  | { type: 'login' }
  | { type: 'signup' }
  | { type: 'latest' }
  | { type: 'topics' }
  | { type: 'post', id: string }
  | { type: 'dashboard' }
  | { type: 'admin' }
  | { type: 'new' }
  | { type: 'edit', id: string }
  | { type: 'profile', tab?: 'bookmarks' | 'liked' | 'identity' }
  | { type: 'profile_edit' }
  | { type: 'author', id: string }
  | { type: 'search', query?: string, category?: string };

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  view: View;
  setView: (view: View | string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>({ type: 'home' });
  const [showLexicon, setShowLexicon] = useState(false);

  const setView = (v: View | string) => {
    if (typeof v === 'string') {
      setCurrentView({ type: v as any });
    } else {
      setCurrentView(v);
    }
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        await seedInitialData();
        const saved = localStorage.getItem('lumina_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed); // Immediate local trust, then refresh
          const latest = await getUserById(parsed.id);
          if (latest) setUser(latest);
        }
      } catch (e) {
        console.error("Session restoration failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const refreshUser = async () => {
    const saved = localStorage.getItem('lumina_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const latest = await getUserById(parsed.id);
      if (latest) {
        setUser(latest);
        localStorage.setItem('lumina_user', JSON.stringify(latest));
      }
    }
  };

  const login = async (email: string, password?: string): Promise<User | null> => {
    const u = await loginWithBackend(email, password);
    if (u) {
      setUser(u);
      return u;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lumina_user');
    setView('home');
  };

  const renderView = () => {
    if (isLoading) return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <svg className="animate-spin h-12 w-12 text-indigo-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );

    const isPrivate = !['home', 'login', 'signup', 'latest', 'topics', 'post', 'author', 'search'].includes(currentView.type);
    if (isPrivate && !user) return <LoginPage />;

    switch (currentView.type) {
      case 'home': return <HomePage />;
      case 'login': return <LoginPage />;
      case 'signup': return <SignupPage />;
      case 'latest': return <LatestPage />;
      case 'topics': return <TopicsPage />;
      case 'post': return <PostDetail id={currentView.id} />;
      case 'dashboard': return <Dashboard />;
      case 'admin': return <AdminPanel />;
      case 'new': return <EditorPage />;
      case 'edit': return <EditorPage id={currentView.id} />;
      case 'profile': return <ProfilePage initialTab={currentView.tab} />;
      case 'profile_edit': return <EditProfilePage />;
      case 'author': return <AuthorProfile id={currentView.id} />;
      case 'search': return <SearchPage initialQuery={currentView.query} initialCategory={currentView.category} />;
      default: return <HomePage />;
    }
  };

  const showNavbar = !['login', 'signup'].includes(currentView.type);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading, view: currentView, setView }}>
      <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
        <FlashBanner />
        {showNavbar && (
          <Navbar 
            user={user} 
            logout={logout} 
            setView={setView} 
            currentView={currentView} 
            onOpenLexicon={() => setShowLexicon(true)}
          />
        )}
        <main className="flex-1 transition-all duration-500">
          {renderView()}
        </main>
        <GlobalDictionary isOpen={showLexicon} onClose={() => setShowLexicon(false)} />
        {showNavbar && (
          <footer className="bg-slate-950 text-white py-32 px-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-20">
              <div className="md:col-span-5">
                <button onClick={() => setView('home')} className="text-4xl font-black bg-gradient-to-tr from-white to-indigo-400 bg-clip-text text-transparent tracking-tighter mb-8 block">
                  {APP_NAME}.
                </button>
                <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                  Decentralized insights for the strategic elite. We build the infrastructure for high-density narrative distribution.
                </p>
              </div>
              <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
                <FooterGroup title="Platform" links={['Discovery', 'Sectors', 'Verified Authors', 'Latest Inquiries']} />
                <FooterGroup title="Governance" links={['Council Rules', 'Originality Audit', 'Identity Verification']} />
                <FooterGroup title="System" links={['API Access', 'Operational Logs', 'Contact Node']} />
              </div>
            </div>
            <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
              <p>© 2024 {APP_NAME} ARCHIVE PROJECT. ALL NODES VERIFIED.</p>
              <div className="flex gap-10">
                <button className="hover:text-white transition-colors">Security Protocol</button>
                <button className="hover:text-white transition-colors">Linguistic Standards</button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </AuthContext.Provider>
  );
};

const FooterGroup = ({ title, links }: { title: string, links: string[] }) => (
  <div className="space-y-6">
    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-500">{title}</h4>
    <ul className="space-y-4">
      {links.map(l => (
        <li key={l}><button className="text-slate-400 hover:text-white transition-colors text-sm font-bold text-left">{l}</button></li>
      ))}
    </ul>
  </div>
);

const Navbar = ({ user, logout, setView, currentView, onOpenLexicon }: any) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setView({ type: 'search', query: searchQuery.trim() });
    setSearchQuery('');
  };

  return (
    <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-6 md:px-12 h-20 flex items-center justify-between transition-all">
      <div className="flex items-center gap-12">
        <button onClick={() => setView('home')} className="text-3xl font-black bg-slate-950 bg-clip-text text-transparent tracking-tighter hover:scale-105 transition-transform">
          {APP_NAME}.
        </button>
        <div className="hidden lg:flex gap-10 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
          <button onClick={() => setView('home')} className={`hover:text-indigo-600 transition-colors ${currentView.type === 'home' ? 'text-slate-900' : ''}`}>Discovery</button>
          <button onClick={() => setView('latest')} className={`hover:text-indigo-600 transition-colors ${currentView.type === 'latest' ? 'text-slate-900' : ''}`}>Stream</button>
          <button onClick={() => setView('topics')} className={`hover:text-indigo-600 transition-colors ${currentView.type === 'topics' ? 'text-slate-900' : ''}`}>Domains</button>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <form onSubmit={handleSearchSubmit} className="relative hidden xl:block w-72">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="Inquiry Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
          />
        </form>

        <button onClick={onOpenLexicon} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all border border-slate-100">
          <Icons.Book />
        </button>

        {!user ? (
          <div className="flex items-center gap-4">
            <button onClick={() => setView('login')} className="text-[11px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 px-4">Sign In</button>
            <button onClick={() => setView('signup')} className="px-8 py-3 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all">Initiate</button>
          </div>
        ) : (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="group flex items-center gap-4 p-1 pr-4 bg-slate-50 border border-slate-100 rounded-full hover:bg-white hover:shadow-xl transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-slate-950 overflow-hidden border-2 border-white shadow-lg">
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-black text-slate-900 leading-none mb-1">{user.name}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500">{user.role}</p>
              </div>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-4 w-64 bg-white border border-slate-100 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] py-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <DropdownItem icon={<Icons.User />} label="Identity Profile" onClick={() => setView('profile')} />
                {(user.role === UserRole.ADMIN || user.role === UserRole.AUTHOR) && (
                  <DropdownItem icon={<Icons.Dashboard />} label="Author Hub" onClick={() => setView('dashboard')} />
                )}
                {user.role === UserRole.ADMIN && (
                  <DropdownItem icon={<Icons.Home />} label="Council Hub" onClick={() => setView('admin')} />
                )}
                <div className="h-px bg-slate-50 my-2 mx-6" />
                <button onClick={logout} className="w-full px-8 py-3 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-colors text-left flex items-center gap-4">
                   <Icons.Trash /> Logout Protocol
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

const DropdownItem = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all text-left flex items-center gap-4">
    <span className="opacity-60">{icon}</span>
    {label}
  </button>
);

export default App;
