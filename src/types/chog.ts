export interface ChogTraits {
  body: string;
  hat: string;
  eyes: string;
  mouth?: string;
  skin?: string;
}

export interface AutoPixelSpriteData {
  tokenId: number;
  pipelineVersion: string;
  status: 'ok' | 'fallback';
  width: number;
  height: number;
  dominantColors: {
    body: string;
    mane: string;
    maneShadow: string;
  };
  headMatrix: Array<Array<string | null>> | null;
  palette: string[];
  portraitUrl?: string;
  portraitBase64?: string;
  traits?: Array<{ trait_type: string; value: string }>;
  reason?: string;
  generatedAt?: number;
}

export interface TokenRecord {
  tokenId: number;
  name: string;
  shortName: string;
  owner: string;
  isResident: boolean;
  traits: ChogTraits;
  wins: number;
  losses: number;
  points: number;
  friends: number[];
  badges: string[];
  scores: {
    stacker?: number;
    snake?: number;
    memory?: number;
    [key: string]: number | undefined;
  };
  imageUrl?: string;
  proxyImageUrl?: string;
  rawAttributes?: Array<{ trait_type: string; value: string }>;
  spriteUrl?: string;
  portraitUrl?: string;
  pixelData?: AutoPixelSpriteData | null;
}

export interface TownZone {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorY: number;
  color: string;
}

export interface Entity {
  tokenId: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: number;
  anim: number;
  pose: 'idle' | 'sit' | 'wave' | 'dance' | 'laugh' | 'sleep';
  squash: number;
  emote: string | null;
  emoteTimer: number;
  bubble: string | null;
  bubbleTimer: number;
  moving?: boolean;
}

export interface MarketListing {
  tokenId: number;
  name: string;
  priceMon: number;
  rarity: string;
  traits: ChogTraits;
  marketplace: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  tokenId: number;
  speaker: string;
  text: string;
  time: string;
  channel: 'public' | 'dm';
}

export interface ToastItem {
  id: string;
  ttl: number;
  type: 'info' | 'challenge' | 'success' | 'alert';
  title: string;
  subtitle: string;
  opponentId?: number;
  gameType?: 'four' | 'duel' | 'showdown';
}

export interface Active1v1Game {
  type: 'four' | 'duel' | 'showdown';
  opponentId: number;
}
