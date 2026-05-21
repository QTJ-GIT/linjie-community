export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

/** Section slug — 字符串自由形式，由 sections 表数据驱动。
 *  历史代码里硬编码 'general' / 'qa' / 'stocks' 仍可继续用。 */
export type SectionSlug = string;

export type Section = {
  slug: string;
  name: string;
  description: string | null;
  parent_slug: string | null;
  sort_order: number;
};

export type SectionTreeNode = Section & {
  children: SectionTreeNode[];
};

export type PostType = 'post' | 'question';

export type PostSentiment = 'bull' | 'bear' | 'neutral' | 'question' | 'rant';

export type Post = {
  id: string;
  author_id: string;
  section_slug: SectionSlug;
  type: PostType;
  title: string;
  body_json: Record<string, unknown>;
  body_text: string;
  accepted_answer_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  score: number;
  sentiment?: PostSentiment | null;
  is_pinned?: boolean;
  last_activity_at?: string | null;
  last_replier_id?: string | null;
};

export type PostWithAuthor = Post & {
  author: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
  tickers?: string[];
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  my_vote?: 1 | -1 | 0;
  last_replier?: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'> | null;
};

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body_json: Record<string, unknown>;
  body_text: string;
  is_answer: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  score: number;
  /** 0011_comments_path.sql — dot-separated ancestor chain (including self). */
  path?: string | null;
  /** 0011_comments_path.sql — depth from root (root = 0). */
  depth?: number | null;
  /** 0011_comments_path.sql — direct child comment count. */
  child_count?: number | null;
};

export type CommentWithAuthor = Comment & {
  author: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
  children?: CommentWithAuthor[];
  like_count?: number;
  liked_by_me?: boolean;
  my_vote?: 1 | -1 | 0;
};

export type Ticker = {
  symbol: string;
  market: 'US' | 'CN';
  name: string;
};

export type ChatRoom = {
  slug: string;
  name: string;
  kind: 'global' | 'ticker';
  ref_symbol: string | null;
};

export type ChatMessage = {
  id: string;
  room_slug: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type ChatMessageWithAuthor = ChatMessage & {
  author: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
};

export type NotificationKind =
  | 'comment_on_post'
  | 'reply_to_comment'
  | 'mention'
  | 'answer_accepted'
  | 'like';

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  kind: NotificationKind;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'> | null;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type TickerFollow = {
  user_id: string;
  symbol: string;
  created_at: string;
};

export type DmThread = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
  created_at: string;
};

export type DmThreadWithPeer = DmThread & {
  other_user: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
  last_message_preview?: string | null;
  unread_count?: number;
};

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type DmMessageWithSender = DmMessage & {
  sender: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
};

export type Reaction = {
  user_id: string;
  target_type: 'post' | 'comment' | 'chat_message';
  target_id: string;
  emoji: string;
  created_at: string;
};
export type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };
export type Poll = { post_id: string; multiple: boolean; closes_at: string | null; created_at: string };
export type PollOption = { id: string; poll_id: string; idx: number; text: string };
export type PollVote = { poll_id: string; option_id: string; user_id: string; created_at: string };

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type ReportTargetType = 'post' | 'comment' | 'chat_message' | 'user';

export type Report = {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

// ── Teaching Hall ────────────────────────────────────────────────────────
export type TeachingResourceType = 'video' | 'article';

export type TeachingResource = {
  id: string;
  author_id: string;
  type: TeachingResourceType;
  title: string;
  description: string | null;
  video_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  body_json: Record<string, unknown> | null;
  body_text: string | null;
  cover_image_url: string | null;
  category: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};

export type TeachingResourceWithAuthor = TeachingResource & {
  author: Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
};

