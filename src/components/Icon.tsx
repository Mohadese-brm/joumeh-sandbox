// Icons only from the Joumeh pack (handoff assets/svg, Figma Foundations 151:2). Recoloured to currentColor.
const raw = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const icons: Record<string, string> = {};
for (const [k, v] of Object.entries(raw)) {
  const name = k.split('/').pop()!.replace(/^icon-/, '').replace(/\.svg$/, '');
  // Exported vectors are cropped to their bounds; re-centre them in the pack's 24×24 frame so stroke weight/size match Figma.
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(v); const w = vb ? +vb[1] : 24, h = vb ? +vb[2] : 24;
  icons[name] = v.replace(/viewBox="[^"]*"/, `viewBox="${(-(24 - w) / 2).toFixed(3)} ${(-(24 - h) / 2).toFixed(3)} 24 24"`).replace(/ overflow="visible"/, '').replace(/ id="[^"]*"/g, '').replace(/(stroke|fill)="#(2D264B|1C1917)"/gi, '$1="currentColor"').replace(/ style="[^"]*"/g, '').replace(/preserveAspectRatio="none"/, '').replace(/ width="[^"]*" height="[^"]*"/, ' width="100%" height="100%"');
}
export type IconName = 'add' | 'bag-1' | 'category' | 'close-circle' | 'close' | 'danger-circle' | 'heart-1' | 'home-1' | 'information-circle' | 'left-2' | 'minus' | 'profile-1' | 'right-2' | 'search-1' | 'send-1' | 'tick';
export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <span className={`icon ${className}`} style={{ inlineSize: size, blockSize: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }} />;
}
