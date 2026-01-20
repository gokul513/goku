
export enum UserRole {
  ADMIN = 'ADMIN',
  AUTHOR = 'AUTHOR',
  READER = 'READER'
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Secure passkey for demo auth
  role: UserRole;
  avatar: string;
  bio?: string;
  bookmarks: string[];
  likedPosts: string[];
  status: UserStatus;
  joinedAt: string;
  lastLogin?: string;
  isApproved?: boolean;   // Admin verification
  isSubscribed?: boolean; // Paid fast-track
}

export type Category = 'Engineering' | 'Design' | 'Culture' | 'Business' | 'Product' | 'Uncategorized';

export interface ContentAudit {
  wordCount: number;
  sentenceCount: number;
  depthScore: number; // 0-100 based on headers/lists/formatting
  checkedAt: string;
}

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'DELETED' | 'REVISION_REQUESTED';

export interface GrammarIssue {
  original: string;
  suggestion: string;
  explanation: string;
}

export interface PlagiarismMatch {
  url: string;
  title: string;
  similarity: number;
  matchedText: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  publishedAt: string;
  coverImage: string;
  videoUrl?: string;
  status: PostStatus;
  previousStatus?: PostStatus;
  tags: string[];
  category: Category;
  likes: number;
  views: number;
  readingTime: number;
  isFeatured: boolean;
  isLowQuality?: boolean;
  contentAudit?: ContentAudit;
  // Plagiarism Validation
  plagiarismCheckedAt?: string;
  plagiarismScore?: number;
  plagiarismPassed?: boolean;
  plagiarismMatches?: PlagiarismMatch[];
  
  moderationNote?: string;
  fontStyle?: 'serif' | 'sans' | 'mono';
  pageBackground?: string; // Author custom background
}

export interface GovernanceSettings {
  maxPlagiarism: number;
  minReadability: number;
  minWordCount: number;
  minSentenceCount: number;
  blockOnFailure: boolean;
}

export interface QualityReport {
  checkedAt: string;
  plagiarismScore: number;
  plagiarismMatches: PlagiarismMatch[];
  readabilityScore: number;
  tone: string;
  passed: boolean;
}

export interface AIAnalysis {
  summary: string;
  seoKeywords: string[];
  tone: string;
  readabilityScore: number;
}

export type NexusGroupType = 'READERS_ONLY' | 'MIXED' | 'AUTHORS_ONLY';
export interface NexusGroup { id: string; name: string; description: string; image: string; type: NexusGroupType; ownerId: string; memberIds: string[]; isPrivate: boolean; createdAt: string; }
export type NexusMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'LIVE_PHOTO';
export interface NexusMessage { id: string; groupId: string; senderId: string; senderName: string; senderAvatar: string; type: NexusMessageType; content: string; mediaUrl?: string; createdAt: string; }
export interface Comment { id: string; postId: string; authorId: string; authorName: string; authorAvatar?: string; content: string; createdAt: string; isPinned?: boolean; isDeleted?: boolean; parentId?: string; likes?: number; }
export interface FlashBroadcast { id: string; content: string; timestamp: string; expiresAt: string; level: 'INFO' | 'ALERT' | 'URGENT'; }
export interface Message { id: string; senderId: string; senderName: string; subject: string; content: string; createdAt: string; type: 'BROADCAST' | 'DIRECT'; }
export interface MessageRecipient { messageId: string; userId: string; isRead: boolean; readAt?: string; }
