export const NAV_BADGES_REFRESH_EVENT = 'notexa_nav_badges_refresh';

type BadgeKind = 'friend_requests' | 'shared_notes' | 'shared_files';

const keyFor = (userId: number | string, kind: BadgeKind) => `notexa_seen_${kind}_${userId}`;

const normalizeIds = (ids: Array<number | string | null | undefined>) => (
  ids
    .map((id) => String(id ?? '').trim())
    .filter(Boolean)
);

export function getSeenIds(userId: number | string, kind: BadgeKind) {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const raw = window.localStorage.getItem(keyFor(userId, kind));
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(ids) ? normalizeIds(ids) : []);
  } catch {
    return new Set<string>();
  }
}

export function countUnseenIds(userId: number | string, kind: BadgeKind, ids: Array<number | string | null | undefined>) {
  const seen = getSeenIds(userId, kind);
  return normalizeIds(ids).filter((id) => !seen.has(id)).length;
}

export function markIdsSeen(userId: number | string, kind: BadgeKind, ids: Array<number | string | null | undefined>) {
  if (typeof window === 'undefined') return;

  const seen = getSeenIds(userId, kind);
  normalizeIds(ids).forEach((id) => seen.add(id));
  window.localStorage.setItem(keyFor(userId, kind), JSON.stringify(Array.from(seen)));
}

export function refreshNavBadges() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NAV_BADGES_REFRESH_EVENT));
  }
}
