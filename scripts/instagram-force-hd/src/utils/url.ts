export function shouldTouchUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('instagram.com') ||
    url.includes('/graphql') ||
    url.includes('/api/v1/') ||
    url.includes('fbcdn.net') ||
    url.includes('cdninstagram.com')
  );
}
