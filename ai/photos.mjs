// Only public X photo IDs cross the provider boundary. Rebuild the URL so credentials,
// tracking parameters and fragments from the page cannot accompany a photo.
export function postPhotos(images) {
  if (!Array.isArray(images) || images.length > 4) throw new Error('context');
  const photos = new Map();
  for (const raw of images) {
    if (typeof raw !== 'string' || raw.length > 2048) continue;
    let url;
    try { url = new URL(raw); } catch { continue; }
    if (url.origin !== 'https://pbs.twimg.com' || url.username || url.password) continue;
    const match = /^\/media\/([\w-]+)(?:\.(jpg|jpeg|png|webp))?$/.exec(url.pathname);
    if (!match) continue;
    const format = match[2] || url.searchParams.get('format') || 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(format)) continue;
    const uri = `https://pbs.twimg.com/media/${match[1]}?format=${format}&name=large`;
    photos.set(match[1], { uri, mimeType: `image/${format === 'jpg' ? 'jpeg' : format}` });
  }
  return [...photos.values()];
}
