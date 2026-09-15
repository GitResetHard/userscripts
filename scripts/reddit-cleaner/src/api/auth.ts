import type { UserInfo } from '../types';

interface MeApiResponse {
  data?: {
    name?: string;
    modhash?: string;
  };
  error?: number;
}

/**
 * Fetches the current user's username and modhash from Reddit's /api/me.json.
 * Works on both www.reddit.com and old.reddit.com via the shared session cookie.
 * Throws if the user is not logged in.
 */
export async function fetchUserInfo(): Promise<UserInfo> {
  const res = await fetch('https://www.reddit.com/api/me.json', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`/api/me.json returned HTTP ${res.status}`);

  const json: MeApiResponse = await res.json();

  const name = json.data?.name;
  const modhash = json.data?.modhash;

  if (!name || !modhash) throw new Error('Not logged in or session expired.');

  return { username: name, modhash };
}
