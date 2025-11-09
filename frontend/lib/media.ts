export function buildMediaUrl(bucket: 'avatars' | 'covers', key: string) {
  if (!key) {
    return null;
  }
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `/media/${bucket}/${encodedKey}`;
}
