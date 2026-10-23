import { TownZone } from '../types/chog';

export const TOWN_ZONES: TownZone[] = [
  { id: 'cafe',     name: 'Chog Cafe',     icon: '☕', x: 150, y: 125, w: 126, h: 78, doorX: 150, doorY: 145, color: '#E0467E' },
  { id: 'plaza',    name: 'Central Plaza', icon: '⛲', x: 400, y: 270, w: 132, h: 68, doorX: 400, doorY: 295, color: '#64E8D8' },
  { id: 'arcade',   name: 'Pixel Arcade',  icon: '🕹️', x: 645, y: 125, w: 128, h: 80, doorX: 645, doorY: 145, color: '#FFDF6D' },
  { id: 'park',     name: 'Genesis Park',  icon: '🌳', x: 150, y: 385, w: 124, h: 74, doorX: 150, doorY: 405, color: '#8CE071' },
  { id: 'market',   name: 'Chog Market',   icon: '🏪', x: 400, y: 405, w: 132, h: 74, doorX: 400, doorY: 425, color: '#F4A236' },
  { id: 'townhall', name: 'Town Hall',     icon: '🏛️', x: 645, y: 385, w: 128, h: 78, doorX: 645, doorY: 405, color: '#64E8D8' },
];

export const RESIDENT_CACHED_BATCH_LINES: Record<number, string[]> = {
  1337: [
    '10K TPS cap stays ON during Chog Duel!',
    'Just cleared 4 lines in Block Stacker—try beating 5,100 pts!',
    'My little green frog plushie says you cannot connect 4 on me!',
  ],
  88: [
    'Spotted a rare Mint Cyber Chog at the Market stalls for 38.5 MON!',
    'Laser eyes locked on the Chog Four board.',
    'Remember: when a Chog is sold, its wins and badges stay with the Token ID!',
  ],
  420: [
    'Watching the lotus ripples at Whispering Pond... peak cozy.',
    'Anyone up for a chill round of Memory Match?',
  ],
  909: [
    'Fastest reaction finger in Chog Town—260ms in Chog Duel!',
    'Meet me outside the Pixel Arcade neon sign!',
  ],
  555: [
    'Fresh pixel espresso brewing under the striped Cafe awning!',
    'Love seeing heart-eyes Chogs hanging out in the Plaza.',
  ],
  2048: [
    'Welcome to Chog Town! Test the Token Transfer Demo inside Town Hall!',
    'All 51 of my wins are bound to Token #2048 forever.',
  ],
};
