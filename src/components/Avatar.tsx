export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** The person's picture when there is one and you may see it; otherwise initials in their colour. */
export function Avatar({ user, size = 32, title }: { user: { name: string; color?: string | null; pictureUrl?: string | null }; size?: number; title?: string }) {
  if (user.pictureUrl) {
    return <img className="avatar avatar--picture" src={user.pictureUrl} width={size} height={size} alt={title ?? ''} title={title} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar" data-outside={!user.color || undefined} title={title} aria-hidden={title ? undefined : true}
      style={{ width: size, height: size, background: user.color ?? undefined, fontSize: Math.max(10, Math.round(size * 0.38)) }}>
      {initials(user.name)}
    </span>
  );
}
