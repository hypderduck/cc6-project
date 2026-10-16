import type { ReportType } from '@/lib/types';

// Index = hour 0–23. Peaks at dusk and night.
export const HOUR_WEIGHTS = [5, 4, 3, 3, 4, 6, 7, 5, 3, 2, 2, 2, 2, 2, 2, 3, 3, 4, 8, 11, 10, 9, 7, 6];

export const TYPE_WEIGHTS: { type: ReportType; w: number }[] = [
  { type: 'fatality', w: 45 },
  { type: 'injury', w: 30 },
  { type: 'sighting', w: 25 },
];

export const REPORTER_NAMES = ['Mei', 'Arjun', 'Sam', 'Nur', 'Jia Hao', 'Priya', 'Kai', 'Hannah', 'Zheng', 'Aisha'];

export const COMMENTER_NAMES = ['Wei Jie', 'Shan', 'Daniel', 'Farah', 'Yi Ting', 'Ravi', 'Ming', 'Bryan', 'Leena', 'Chloe'];

export const COMMENT_POOL: Record<ReportType, string[]> = {
  fatality: [
    'Thanks for logging this. This stretch is really dark at night.',
    'Sad to see. Drivers, please slow down here.',
    'Saw something similar here last week.',
    'Is the road lighting here ever going to be fixed?',
  ],
  injury: [
    'Did someone call the hotline?',
    'Hope it makes it. Thanks for reporting.',
    'I stopped traffic for a moment but could not get close.',
  ],
  sighting: [
    'Lovely! Was it near the drain?',
    'Spotted one here too a couple of weeks ago.',
    'Great photo. Please keep your distance!',
    'Thanks for sharing, this helps everyone know what to expect.',
  ],
};

/** 3-hour time-of-day bins. */
export const TIME_BINS = [
  'midnight–3 am',
  '3–6 am',
  '6–9 am',
  '9 am–noon',
  'noon–3 pm',
  '3–6 pm',
  '6–9 pm',
  '9 pm–midnight',
];
export const TIME_BINS_SHORT = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

export const TYPE_LABEL: Record<ReportType, string> = {
  sighting: 'Sighting',
  injury: 'Injury',
  fatality: 'Fatality',
};

export const HEAT_RAMP = ['#f9c5a8', '#f2a273', '#e8793f', '#c24a14', '#8a3309'];

export const SERIES_COLOR: Record<ReportType, string> = {
  fatality: '#9a3a0c',
  injury: '#e0692a',
  sighting: '#5c8a68',
};

export const HOTLINES = {
  acres: { label: 'ACRES 24-hr rescue', number: '9783 7782', tel: '+6597837782' },
  nparks: { label: 'NParks', number: '1800-476-1600', tel: '18004761600' },
};
