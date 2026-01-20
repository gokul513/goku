
import { Post, User, UserRole, Category, GovernanceSettings, PostStatus, Message, NexusGroup, NexusMessage, Comment, FlashBroadcast } from '../types.ts';

const API_BASE = 'http://localhost:8000/api';

/**
 * PRODUCTION NOTE: 
 * We use a Hybrid Storage approach. It attempts to sync with the Django backend 
 * if available, otherwise maintains state in LocalStorage for offline resilience.
 */

const LOCAL_KEYS = {
  POSTS: 'lumina_posts',
  USERS: 'lumina_users_list',
  GOV: 'lumina_governance',
  COMMENTS: 'lumina_comments',
  NEXUS: 'lumina_nexus_groups',
  NEXUS_MSGS: 'lumina_nexus_messages',
  MESSAGES: 'lumina_direct_messages',
  FLASH: 'lumina_flash_broadcast'
};

// --- API Helpers ---

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn(`API unavailable at ${endpoint}, falling back to local storage.`);
    return null;
  }
};

// --- Posts ---

export const getPosts = async (): Promise<Post[]> => {
  const backendPosts = await apiFetch('/posts');
  if (backendPosts) return backendPosts;
  
  const stored = localStorage.getItem(LOCAL_KEYS.POSTS);
  return stored ? JSON.parse(stored) : [];
};

export const getPostByIdOrSlug = async (id: string): Promise<Post | undefined> => {
  const backendPost = await apiFetch(`/posts/${id}`);
  if (backendPost) return backendPost;

  const posts = await getPosts();
  return posts.find(p => p.id === id || p.slug === id);
};

export const savePost = async (post: Post): Promise<Post> => {
  await apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(post)
  });

  // Local sync
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === post.id);
  if (index >= 0) posts[index] = post;
  else posts.unshift(post);
  localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(posts));

  return post;
};

export const incrementPostViews = async (id: string) => {
  await apiFetch(`/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ views: true })
  });

  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index >= 0) {
    posts[index].views = (posts[index].views || 0) + 1;
    localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(posts));
  }
};

export const deletePost = async (id: string) => {
  await apiFetch(`/posts/${id}`, { method: 'DELETE' });
  const posts = await getPosts();
  const filtered = posts.filter(p => p.id !== id);
  localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(filtered));
};

export const restorePost = async (id: string) => {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index >= 0) {
    posts[index].status = 'PUBLISHED';
    localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(posts));
  }
};

// --- Auth & Users ---

export const getUsers = async (): Promise<User[]> => {
  const backendUsers = await apiFetch('/users');
  if (backendUsers) return backendUsers;
  
  const stored = localStorage.getItem(LOCAL_KEYS.USERS);
  return stored ? JSON.parse(stored) : [];
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const backendUser = await apiFetch(`/users/${id}`);
  if (backendUser) return backendUser;

  const users = await getUsers();
  return users.find(u => u.id === id);
};

export const loginWithBackend = async (email: string, password?: string): Promise<User | null> => {
  const user = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (user) {
    localStorage.setItem('lumina_user', JSON.stringify(user));
    return user;
  }
  
  // Local fallback
  const users = await getUsers();
  const found = users.find(u => u.email === email && u.password === password);
  if (found) {
    localStorage.setItem('lumina_user', JSON.stringify(found));
    return found;
  }
  return null;
};

export const addUser = async (u: User) => {
  await apiFetch('/signup', {
    method: 'POST',
    body: JSON.stringify(u)
  });
  // Local fallback
  const users = await getUsers();
  users.push(u);
  localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
};

export const updateUser = async (user: User): Promise<User> => {
  await apiFetch(`/users/${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify(user)
  });
  const users = await getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) users[index] = user;
  localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
  return user;
};

export const moderateUserIdentity = async (id: string, approved: boolean) => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index >= 0) {
    users[index].isApproved = approved;
    localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
  }
};

export const subscribeToPro = async (uid: string) => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === uid);
  if (index >= 0) {
    users[index].isSubscribed = true;
    localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
  }
};

// --- Comments ---

export const getCommentsByPostId = async (pid: string): Promise<Comment[]> => {
  const backendComments = await apiFetch(`/posts/${pid}/comments`);
  if (backendComments) return backendComments;

  const stored = localStorage.getItem(LOCAL_KEYS.COMMENTS);
  const all: Comment[] = stored ? JSON.parse(stored) : [];
  return all.filter(c => c.postId === pid);
};

export const addComment = async (c: Comment) => {
  await apiFetch(`/posts/${c.postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(c)
  });

  const stored = localStorage.getItem(LOCAL_KEYS.COMMENTS);
  const all: Comment[] = stored ? JSON.parse(stored) : [];
  all.push(c);
  localStorage.setItem(LOCAL_KEYS.COMMENTS, JSON.stringify(all));
};

export const softDeleteComment = async (id: string) => {
  const stored = localStorage.getItem(LOCAL_KEYS.COMMENTS);
  const all: Comment[] = stored ? JSON.parse(stored) : [];
  const index = all.findIndex(c => c.id === id);
  if (index >= 0) {
    all[index].isDeleted = true;
    all[index].content = "[Discourse entry purged for narrative hygiene]";
    localStorage.setItem(LOCAL_KEYS.COMMENTS, JSON.stringify(all));
  }
};

export const togglePinComment = async (id: string, pid: string) => {
  const stored = localStorage.getItem(LOCAL_KEYS.COMMENTS);
  const all: Comment[] = stored ? JSON.parse(stored) : [];
  const index = all.findIndex(c => c.id === id);
  if (index >= 0) {
    all[index].isPinned = !all[index].isPinned;
    localStorage.setItem(LOCAL_KEYS.COMMENTS, JSON.stringify(all));
  }
};

// --- Nexus & Groups ---

export const getNexusGroupsForUser = async (uid: string): Promise<NexusGroup[]> => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS);
  const all: NexusGroup[] = stored ? JSON.parse(stored) : [];
  return all.filter(g => g.memberIds.includes(uid));
};

export const createNexusGroup = async (group: NexusGroup): Promise<NexusGroup> => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS);
  const groups: NexusGroup[] = stored ? JSON.parse(stored) : [];
  groups.push(group);
  localStorage.setItem(LOCAL_KEYS.NEXUS, JSON.stringify(groups));
  return group;
};

export const getNexusMessages = async (groupId: string): Promise<NexusMessage[]> => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS_MSGS);
  const all: NexusMessage[] = stored ? JSON.parse(stored) : [];
  return all.filter(m => m.groupId === groupId);
};

export const sendNexusMessage = async (user: User, groupId: string, data: Partial<NexusMessage>): Promise<NexusMessage> => {
  const msg: NexusMessage = {
    id: Math.random().toString(36).substr(2, 9),
    groupId,
    senderId: user.id,
    senderName: user.name,
    senderAvatar: user.avatar,
    type: data.type || 'TEXT',
    content: data.content || '',
    mediaUrl: data.mediaUrl,
    createdAt: new Date().toISOString()
  };
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS_MSGS);
  const all: NexusMessage[] = stored ? JSON.parse(stored) : [];
  all.push(msg);
  localStorage.setItem(LOCAL_KEYS.NEXUS_MSGS, JSON.stringify(all));
  return msg;
};

export const getMembersOfGroup = async (groupId: string): Promise<User[]> => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS);
  const groups: NexusGroup[] = stored ? JSON.parse(stored) : [];
  const group = groups.find(g => g.id === groupId);
  if (!group) return [];
  const users = await getUsers();
  return users.filter(u => group.memberIds.includes(u.id));
};

export const addNexusMember = async (groupId: string, userId: string) => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS);
  const groups: NexusGroup[] = stored ? JSON.parse(stored) : [];
  const index = groups.findIndex(g => g.id === groupId);
  if (index >= 0 && !groups[index].memberIds.includes(userId)) {
    groups[index].memberIds.push(userId);
    localStorage.setItem(LOCAL_KEYS.NEXUS, JSON.stringify(groups));
  }
};

export const removeNexusMember = async (groupId: string, userId: string) => {
  const stored = localStorage.getItem(LOCAL_KEYS.NEXUS);
  const groups: NexusGroup[] = stored ? JSON.parse(stored) : [];
  const index = groups.findIndex(g => g.id === groupId);
  if (index >= 0) {
    groups[index].memberIds = groups[index].memberIds.filter(id => id !== userId);
    localStorage.setItem(LOCAL_KEYS.NEXUS, JSON.stringify(groups));
  }
};

// --- Messages & Broadcasts ---

export const getAuthorMessages = async (uid: string): Promise<(Message & { isRead: boolean })[]> => {
  const stored = localStorage.getItem(LOCAL_KEYS.MESSAGES);
  return stored ? JSON.parse(stored) : [];
};

export const markMessageAsRead = async (mid: string, uid: string) => {
  const messages = await getAuthorMessages(uid);
  const index = messages.findIndex(m => m.id === mid);
  if (index >= 0) {
    messages[index].isRead = true;
    localStorage.setItem(LOCAL_KEYS.MESSAGES, JSON.stringify(messages));
  }
};

export const getActiveFlashBroadcast = (): FlashBroadcast | null => {
  const stored = localStorage.getItem(LOCAL_KEYS.FLASH);
  if (!stored) return null;
  const broadcast: FlashBroadcast = JSON.parse(stored);
  if (new Date(broadcast.expiresAt).getTime() < Date.now()) {
    localStorage.removeItem(LOCAL_KEYS.FLASH);
    return null;
  }
  return broadcast;
};

// --- Search & Filtering ---

export const searchPlatform = async (q: string, cat?: string) => {
  const posts = await getPosts();
  const users = await getUsers();
  const query = q.toLowerCase();
  
  const filteredPosts = posts.filter(p => 
    p.status === 'PUBLISHED' &&
    (!cat || p.category === cat) &&
    (p.title.toLowerCase().includes(query) || p.excerpt.toLowerCase().includes(query) || p.authorName.toLowerCase().includes(query))
  );

  const authors = users.filter(u => 
    u.role === UserRole.AUTHOR && 
    (u.name.toLowerCase().includes(query) || (u.bio && u.bio.toLowerCase().includes(query)))
  );

  const readers = users.filter(u => 
    u.role === UserRole.READER && 
    (u.name.toLowerCase().includes(query))
  );

  return { posts: filteredPosts, authors, readers };
};

export const getPostsByCategory = async (cat: string) => {
  const posts = await getPosts();
  if (cat === 'All') return posts.filter(p => p.status === 'PUBLISHED');
  return posts.filter(p => p.status === 'PUBLISHED' && p.category === cat);
};

// --- Moderation ---

export const moderatePost = async (postId: string, status: PostStatus, note?: string) => {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index >= 0) {
    posts[index].status = status;
    if (note) posts[index].moderationNote = note;
    localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(posts));
  }
};

export const requestRevision = async (postId: string, note: string) => {
  await moderatePost(postId, 'REVISION_REQUESTED', note);
};

// --- Social ---

export const toggleLikePost = async (pid: string, uid: string) => {
  const posts = await getPosts();
  const users = await getUsers();
  const pIdx = posts.findIndex(p => p.id === pid);
  const uIdx = users.findIndex(u => u.id === uid);

  if (pIdx < 0 || uIdx < 0) return null;

  const post = posts[pIdx];
  const user = users[uIdx];

  const hasLiked = user.likedPosts.includes(pid);
  if (hasLiked) {
    user.likedPosts = user.likedPosts.filter(id => id !== pid);
    post.likes = Math.max(0, (post.likes || 0) - 1);
  } else {
    user.likedPosts.push(pid);
    post.likes = (post.likes || 0) + 1;
  }

  localStorage.setItem(LOCAL_KEYS.POSTS, JSON.stringify(posts));
  localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
  
  const sessionUser = localStorage.getItem('lumina_user');
  if (sessionUser) {
    const parsed = JSON.parse(sessionUser);
    if (parsed.id === uid) localStorage.setItem('lumina_user', JSON.stringify(user));
  }

  return { post, user };
};

export const toggleBookmarkPost = async (pid: string, uid: string) => {
  const users = await getUsers();
  const uIdx = users.findIndex(u => u.id === uid);
  if (uIdx < 0) return null;

  const user = users[uIdx];
  const isBookmarked = user.bookmarks.includes(pid);
  if (isBookmarked) {
    user.bookmarks = user.bookmarks.filter(id => id !== pid);
  } else {
    user.bookmarks.push(pid);
  }

  localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));

  const sessionUser = localStorage.getItem('lumina_user');
  if (sessionUser) {
    const parsed = JSON.parse(sessionUser);
    if (parsed.id === uid) localStorage.setItem('lumina_user', JSON.stringify(user));
  }

  return { user };
};

// --- System Utilities ---

export const forceSystemReset = async () => {
  localStorage.clear();
  window.location.reload();
};

export const getGovernance = async (): Promise<GovernanceSettings> => {
  return {
    maxPlagiarism: 80,
    minReadability: 60,
    minWordCount: 300, 
    minSentenceCount: 10,
    blockOnFailure: true
  };
};

export const calculateReadingTime = (content: string, hasCover: boolean): number => {
  const text = content.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  let totalSeconds = (words / 225) * 60;
  return Math.max(1, Math.ceil(totalSeconds / 60));
};

export const performContentAudit = (content: string, coverImage?: string) => {
  return {
    wordCount: content.split(/\s+/).length,
    sentenceCount: content.split(/[.!?]+/).length,
    depthScore: 85,
    checkedAt: new Date().toISOString()
  };
};

export const seedInitialData = async () => {
  if (!localStorage.getItem(LOCAL_KEYS.USERS)) {
    const admin: User = {
      id: 'admin-1',
      name: 'Platform Overseer',
      email: 'admin@lumina.io',
      password: 'DemoPasskey123!',
      role: UserRole.ADMIN,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      bio: 'Lumina administrative node.',
      bookmarks: [],
      likedPosts: [],
      status: 'ACTIVE',
      joinedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify([admin]));
  }
};
