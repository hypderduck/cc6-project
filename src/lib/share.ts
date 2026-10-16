import { isSensitive, locShort } from './privacy';
import type { Report } from './types';

const TYPE_WORD = { fatality: 'Roadkill', injury: 'Injured animal', sighting: 'Wildlife sighting' } as const;
const TAIL = 'Drive slowly and log wildlife on Wildwatch NTU.';

/** Never includes the reporter's name, never an exact spot for protected species. */
export function shareText(r: Report) {
  const word = TYPE_WORD[r.type];
  if (isSensitive(r)) return `${word}: a protected species near NTU campus. ${TAIL}`;
  return `${word}: ${r.species} near ${locShort(r)}. ${TAIL}`;
}

// Placeholder until the app is hosted.
export const shareLink = (r: Report) => `https://wildwatch-ntu.example/report/${r.id}`;

export const telegramUrl = (r: Report) =>
  `https://t.me/share/url?url=${encodeURIComponent(shareLink(r))}&text=${encodeURIComponent(shareText(r))}`;

export const whatsappUrl = (r: Report) =>
  `https://wa.me/?text=${encodeURIComponent(shareText(r) + ' ' + shareLink(r))}`;

export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
