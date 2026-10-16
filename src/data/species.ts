// Final list to be confirmed with Earthlink and Nature Watch. `w` = generator weight.
export interface Species {
  name: string;
  w: number;
  emoji: string;
  sensitive?: boolean;
  note?: string;
}

export const SPECIES: Species[] = [
  { name: 'Green crested lizard', w: 16, emoji: '🦎' },
  { name: 'Reticulated python', w: 13, emoji: '🐍' },
  { name: 'Birds', w: 13, emoji: '🐦' },
  { name: 'Malayan water monitor', w: 11, emoji: '🦎' },
  { name: 'Common palm civet', w: 10, emoji: '🐾' },
  { name: 'Wild boar', w: 9, emoji: '🐗' },
  { name: 'Smooth-coated otter', w: 12, emoji: '🦦' },
  { name: 'Equatorial spitting cobra', w: 8, emoji: '🐍' },
  { name: 'Keel-bellied whip snake', w: 6, emoji: '🐍' },
  { name: 'Sunda pangolin', w: 5, emoji: '🐾', sensitive: true, note: 'critically endangered' },
];

export const OTHER_SPECIES = 'Other / unsure';

export const speciesByName = (name: string) => SPECIES.find((s) => s.name === name);
export const emojiFor = (name: string) => speciesByName(name)?.emoji ?? '🐾';
