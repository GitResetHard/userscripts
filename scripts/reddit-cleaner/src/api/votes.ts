import { config } from '../config';
import type { UpvotedPost } from '../types';

interface PostData {
  name: string;
  title: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  thumbnail: string;
  created_utc: number;
  over_18: boolean;
}

interface ListingChild {
  data: PostData;
}

interface ListingResponse {
  data: {
    children: ListingChild[];
    after: string | null;
  };
  error?: number;
  message?: string;
}

function parse(child: ListingChild): UpvotedPost {
  const d = child.data;
  return {
    fullname: d.name,
    title: d.title,
    subreddit: d.subreddit,
    subredditPrefixed: d.subreddit_name_prefixed,
    score: d.score,
    numComments: d.num_comments,
    url: d.url,
    permalink: `https://www.reddit.com${d.permalink}`,
    thumbnail: d.thumbnail?.startsWith('http') ? d.thumbnail : '',
    createdUtc: d.created_utc,
    nsfw: d.over_18,
  };
}

/**
 * Fetches every upvoted post for the logged-in user.
 * Returns 'private' if the user's upvotes are not publicly visible.
 * Paginates automatically; calls `onProgress(count)` after each page.
 */
export async function fetchAllUpvoted(
  username: string,
  onProgress?: (count: number) => void,
): Promise<UpvotedPost[] | 'private'> {
  const all: UpvotedPost[] = [];
  let after: string | null = null;

  do {
    const params = new URLSearchParams({
      limit: String(config.api.pageSize),
      sort: 'new',
      raw_json: '1',
    });
    if (after) params.set('after', after);

    const res = await fetch(
      `https://www.reddit.com/user/${encodeURIComponent(username)}/upvoted.json?${params}`,
      { credentials: 'include', headers: { Accept: 'application/json' } },
    );

    if (res.status === 403) return 'private';
    if (!res.ok) throw new Error(`Upvoted API returned HTTP ${res.status}`);

    const json: ListingResponse = await res.json();
    if (json.error === 403) return 'private';

    const children = json.data.children;
    if (children.length === 0) break;

    all.push(...children.map(parse));
    after = json.data.after;
    onProgress?.(all.length);
  } while (after);

  return all;
}

/**
 * Removes an upvote (sets vote to neutral, dir=0).
 * `postFullname` is the Reddit fullname, e.g. "t3_abc123".
 */
export async function unvote(postFullname: string, modhash: string): Promise<void> {
  const res = await fetch('https://www.reddit.com/api/vote', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Modhash': modhash,
    },
    body: new URLSearchParams({ id: postFullname, dir: '0', api_type: 'json' }),
  });

  if (!res.ok) throw new Error(`Unvote ${postFullname} failed: HTTP ${res.status}`);
}
