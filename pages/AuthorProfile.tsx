
import React, { useEffect, useState, useMemo } from 'react';
import { getUsers, getPosts } from '../services/storageService';
import { User, Post } from '../types';
import { useAuth } from '../App';

interface AuthorProfileProps {
  id: string;
}

const AuthorProfile: React.FC<AuthorProfileProps> = ({ id }) => {
  const { setView } = useAuth();
  const [author, setAuthor] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const loadAuthorData = async () => {
      if (id) {
        const allUsers = await getUsers();
        const foundUser = allUsers.find(u => u.id === id);
        setAuthor(foundUser || null);

        const allPosts = await getPosts();
        setPosts(allPosts.filter(p => p.authorId === id && p.status === 'PUBLISHED'));
      }
    };
    loadAuthorData();
  }, [id]);

  const totalViews = useMemo(() => posts.reduce((sum, p) => sum + (p.views || 0), 0), [posts]);

  if (!author) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-medium">Author not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <header className="mb-20">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          {author.avatar ? (
            <img 
              src={author.avatar} 
              className="w-40 h-40 rounded-full border-8 border-slate-50 shadow-xl object-cover" 
              alt={author.name} 
            />
          ) : (
            <div className="w-40 h-40 rounded-full border-8 border-slate-50 shadow-xl bg-indigo-600 flex items-center justify-center text-white text-6xl font-black uppercase">
              {author.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 text-center md:text-left pt-4">
            <h1 className="text-4xl font-black text-slate-900 mb-2 font-serif">{author.name}</h1>
            <p className="text-xl text-slate-500 max-w-2xl mb-6 font-medium leading-relaxed">
              {author.bio || "A luminary in the making, sharing profound stories with the world."}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="bg-indigo-50 px-6 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Publications</p>
                <p className="text-2xl font-black text-indigo-600">{posts.length}</p>
              </div>
              <div className="bg-slate-50 px-6 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Views</p>
                <p className="text-2xl font-black text-slate-900">{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-1 bg-indigo-600 rounded-full"></span>
            Published Work
          </h2>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.map(post => (
              <button onClick={() => setView({ type: 'post', id: post.id })} key={post.id} className="group text-left">
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 h-full flex flex-col">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img 
                      src={post.coverImage} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt="" 
                    />
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">
                      {post.excerpt}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-slate-500 italic">No published stories yet.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuthorProfile;
