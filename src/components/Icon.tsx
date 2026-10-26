// Icons only from the Joumeh pack (handoff assets/svg, Figma Foundations 151:2). Recoloured to currentColor.
const raw = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const icons: Record<string, string> = {};
const FRAME: Record<string, number> = { 'chev-d': 20, trash: 20, 'shield-tick': 20, 'card-lg': 32 };
for (const n of ['home', 'orders', 'returns', 'location', 'heart', 'card', 'support', 'settings', 'logout']) FRAME[`nav-${n}`] = 20;
for (const [k, v] of Object.entries(raw)) {
  const name = k.split('/').pop()!.replace(/^icon-/, '').replace(/\.svg$/, '');
  // Exported vectors are cropped to their bounds; re-centre them in the pack's 24×24 frame so stroke weight/size match Figma.
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(v); const w = vb ? +vb[1] : 24, h = vb ? +vb[2] : 24;
  // Round-1 exports (account nav 124:4322, delete/shield 127:468·125:4203) were rendered in a 20px frame; card-lg in a 32px frame.
  const F = FRAME[name] ?? 24;
  icons[name] = v.replace(/viewBox="[^"]*"/, `viewBox="${(-(F - w) / 2).toFixed(3)} ${(-(F - h) / 2).toFixed(3)} ${F} ${F}"`).replace(/ overflow="visible"/, '').replace(/ id="[^"]*"/g, '').replace(/(stroke|fill)="#[0-9A-F]{6}"/gi, '$1="currentColor"').replace(/ style="[^"]*"/g, '').replace(/preserveAspectRatio="none"/, '').replace(/ width="[^"]*" height="[^"]*"/, ' width="100%" height="100%"');
}
export type IconName = 'add' | 'bag-1' | 'category' | 'close-circle' | 'close' | 'danger-circle' | 'heart-1' | 'heart-2' | 'chev-d' | 'home-1' | 'information-circle' | 'left-2' | 'minus' | 'profile-1' | 'right-2' | 'search-1' | 'send-1' | 'tick' | 'call' | 'star-1' | 'message-1'
  | 'nav-home' | 'nav-orders' | 'nav-returns' | 'nav-location' | 'nav-heart' | 'nav-card' | 'nav-support' | 'nav-settings' | 'nav-logout' | 'trash' | 'shield-tick' | 'card-lg' | 'menu';
export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <span className={`icon ${className}`} style={{ inlineSize: size, blockSize: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }} />;
}
