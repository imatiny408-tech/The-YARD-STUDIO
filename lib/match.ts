import type { Creator, Genre, Role } from "./data";

const EARTH_RADIUS_MI = 3958.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles (haversine). */
export function distanceMiles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

/** Proof-of-Work: verified credits weighted by log-scaled streams plus recency. */
export function proofOfWork(c: Creator) {
  const now = 2026;
  const score = c.credits.reduce((sum, cr) => sum + 10 + Math.log10(cr.streams + 1) * 6 - (now - cr.year) * 2, 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type MatchQuery = {
  roles: Role[];
  genres: Genre[];
  radius: number; // miles; Infinity for global
  availableOnly: boolean;
  budget: number; // max the hirer will pay; 0 = any
  lat: number;
  lng: number;
};

export type Match = { creator: Creator; distance: number; score: number; pow: number };

/**
 * Filters by radius / availability / budget, then ranks on
 * distance, skill overlap, recent activity and verified credits.
 */
export function rankMatches(creators: Creator[], q: MatchQuery): Match[] {
  return creators
    .map((c) => {
      const distance = distanceMiles(q.lat, q.lng, c.lat, c.lng);
      const pow = proofOfWork(c);
      const roleHit = q.roles.length ? c.roles.filter((r) => q.roles.includes(r)).length / q.roles.length : 1;
      const genreHit = q.genres.length ? c.genres.filter((g) => q.genres.includes(g)).length / q.genres.length : 1;
      const proximity = Number.isFinite(q.radius) ? 1 - Math.min(distance / Math.max(q.radius, 1), 1) : 1 / (1 + distance / 250);
      const recency = 1 / (1 + c.lastActiveDays / 3);
      const score = Math.round(100 * (0.3 * roleHit + 0.2 * genreHit + 0.2 * proximity + 0.1 * recency + 0.2 * (pow / 100)));
      return { creator: c, distance, score, pow, roleHit };
    })
    .filter((m) => m.distance <= q.radius)
    .filter((m) => !q.roles.length || m.roleHit > 0)
    .filter((m) => !q.availableOnly || m.creator.available)
    .filter((m) => !q.budget || m.creator.rateMin <= q.budget)
    .sort((a, b) => b.score - a.score)
    .map(({ creator, distance, score, pow }) => ({ creator, distance, score, pow }));
}
