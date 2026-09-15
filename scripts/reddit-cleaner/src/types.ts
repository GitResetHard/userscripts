export interface UserInfo {
  username: string;
  modhash: string;
}

export interface Subreddit {
  /** Reddit fullname, e.g. "t5_2qh0u" — used as the unique key. */
  fullname: string;
  /** Display name without prefix, e.g. "AskReddit". */
  name: string;
  /** Display name with prefix, e.g. "r/AskReddit". */
  displayPrefixed: string;
  subscribers: number;
  iconUrl: string;
  url: string;
  nsfw: boolean;
}

export interface UpvotedPost {
  /** Reddit fullname, e.g. "t3_abc123" — used for the vote API. */
  fullname: string;
  title: string;
  subreddit: string;
  subredditPrefixed: string;
  score: number;
  numComments: number;
  /** External link URL. */
  url: string;
  /** Full Reddit permalink, e.g. https://www.reddit.com/r/.../comments/... */
  permalink: string;
  thumbnail: string;
  createdUtc: number;
  nsfw: boolean;
}

export type Tab = 'subs' | 'votes';
export type SubSort = 'az' | 'za' | 'most' | 'least';
export type VoteSort = 'newest' | 'oldest' | 'top' | 'low';
export type LoadPhase = 'idle' | 'loading' | 'done' | 'error' | 'private';
export type ActionPhase = 'idle' | 'confirming' | 'running' | 'done';

export interface Progress {
  done: number;
  total: number;
}

export interface State {
  userInfo: UserInfo | null;
  authError: string | null;

  tab: Tab;

  subsPhase: LoadPhase;
  subreddits: Subreddit[];
  selectedSubs: Set<string>;
  subsFilter: string;
  subsSort: SubSort;

  votesPhase: LoadPhase;
  upvoted: UpvotedPost[];
  selectedPosts: Set<string>;
  votesFilter: string;
  votesSort: VoteSort;

  actionPhase: ActionPhase;
  progress: Progress | null;
}
