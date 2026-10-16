import { ViewHeader } from '@/components/ui';
import { HOTLINES } from '@/data/constants';

// Content still needs vetting by Earthlink or another expert.
const GUIDE = [
  {
    emoji: '🦦',
    name: 'Smooth-coated otter',
    tips: [
      'Keep a good distance, especially near pups.',
      "Don't chase them for photos.",
      'If one is injured, do not handle it. Call ACRES.',
    ],
  },
  {
    emoji: '🐗',
    name: 'Wild boar',
    tips: [
      "Stay calm and don't run.",
      'Give it space and a clear escape route.',
      'Never feed it.',
      'Report sightings near buildings.',
    ],
  },
  {
    emoji: '🐍',
    name: 'Reticulated python',
    tips: [
      'Generally shy and non-aggressive.',
      'Keep your distance and let it move on.',
      'Do not try to relocate it yourself.',
    ],
  },
  {
    emoji: '🦎',
    name: 'Monitor lizard',
    tips: [
      'Harmless if left alone.',
      'Avoid cornering it.',
      "If it's on a road, report the location so it can be safely guided away.",
    ],
  },
];

export function GuideView() {
  return (
    <div className="view">
      <div className="narrow-col">
        <ViewHeader title="Encounter guide" sub="What to do if you meet these campus residents." />
        <div className="guide-list">
          {GUIDE.map((g) => (
            <details key={g.name} className="card guide-card">
              <summary>
                <span className="guide-emoji" aria-hidden>
                  {g.emoji}
                </span>
                <span className="guide-name">{g.name}</span>
                <span className="guide-arrow" aria-hidden>
                  ›
                </span>
              </summary>
              <ul className="guide-tips">
                {g.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <section className="card card-dark hotlines" aria-labelledby="hotlines-h">
          <h2 id="hotlines-h">Hotlines</h2>
          <ul>
            {Object.values(HOTLINES).map((h) => (
              <li key={h.tel}>
                <span>{h.label}</span>
                <a href={`tel:${h.tel}`}>
                  <strong>{h.number}</strong>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <p className="note">Guide content is a draft and still needs to be checked by Earthlink NTU or another expert.</p>
      </div>
    </div>
  );
}
