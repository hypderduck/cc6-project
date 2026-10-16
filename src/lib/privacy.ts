import { hotspotById } from '@/data/hotspots';
import { speciesByName } from '@/data/species';
import type { Report } from './types';

export const isSensitive = (r: Pick<Report, 'species'>) => !!speciesByName(r.species)?.sensitive;

/** Location label in the feed. */
export function locText(r: Report) {
  if (isSensitive(r)) return 'Location withheld (protected species)';
  if (r.elsewhere) return 'Elsewhere on campus';
  return hotspotById(r.hs)?.name ?? 'Elsewhere on campus';
}

/** Location used in share text. */
export function locShort(r: Report) {
  if (isSensitive(r) || r.elsewhere) return 'NTU campus';
  return hotspotById(r.hs)?.short ?? 'NTU campus';
}

export const isAnon = (name: string) => name === 'Anonymous';

/** Name to show on a post or comment. Your own items read "You". */
export const displayName = (name: string, mine?: boolean) => (mine ? 'You' : name);
