import { config } from '../config';
import type { Subreddit } from '../types';

interface SubredditData {
  name: string;
  display_name: string;
  display_name_prefixed: string;
  subscribers: number;
  icon_img: string;
  community_icon: string;
  url: string;
  over18: boolean;
}

interface ListingChild {
  data: SubredditData;
}

interface ListingResponse {
  data: {
    children: ListingChild[];
    after: string | null;
  };
  error?: number;
}

function parse(child: ListingChild): Subreddit {
  const d = child.data;
  // Prefer community_icon (higher quality) over icon_img; strip query params.
  const rawIcon = d.community_icon || d.icon_img || '';
  return {
    fullname: d.name,
    name: d.display_name,
    displayPrefixed: d.display_name_prefixed,
    subscribers: d.subscribers ?? 0,
    iconUrl: (rawIcon.split('?')[0]) ?? '',
    url: `https://www.reddit.com${d.url}`,
    nsfw: d.over18,
  };
}

/**
 * Fetches every subscribed subreddit for the logged-in user.
 * Paginates automatically; calls `onProgress(count)` after each page.
 */
export async function fetchAllSubscribed(
  onProgress?: (count: number) => void,
): Promise<Subreddit[]> {
  const all: Subreddit[] = [];
  let after: string | null = null;

  do {
    const params = new URLSearchParams({ limit: String(config.api.pageSize), raw_json: '1' });
    if (after) params.set('after', after);

    const res = await fetch(`https://www.reddit.com/subreddits/mine/subscriber.json?${params}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`Subreddits API returned HTTP ${res.status}`);

    const json: ListingResponse = await res.json();
    if (json.error) throw new Error(`Subreddits API error ${json.error}`);

    const children = json.data.children;
    all.push(...children.map(parse));
    after = json.data.after;
    onProgress?.(all.length);
  } while (after);

  return all;
}

/**
 * Unsubscribes from a subreddit by display name (e.g. "AskReddit").
 * Uses X-Modhash header for CSRF protection.
 */
export async function unsubscribe(subName: string, modhash: string): Promise<void> {
  const res = await fetch('https://www.reddit.com/api/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Modhash': modhash,
    },
    body: new URLSearchParams({ action: 'unsub', sr_name: subName, api_type: 'json' }),
  });

  if (!res.ok) throw new Error(`Unsubscribe r/${subName} failed: HTTP ${res.status}`);
}
