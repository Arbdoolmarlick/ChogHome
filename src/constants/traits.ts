export interface BodyTrait {
  primary: string;
  maneColor: string;
  maneShadow: string;
  outfit: string;
  vibe: string;
}

export interface HatTrait {
  hatType: string;
  flair: string;
}

export interface EyeTrait {
  eyeType: string;
}


export const TRAIT_MAPPING: {
  bodies: Record<string, BodyTrait>;
  hats: Record<string, HatTrait>;
  eyes: Record<string, EyeTrait>;
  skins: Record<string, { maneColor: string; maneShadow: string }>;
} = {
  skins: {
    'Origin': { maneColor: '#6C2BD9', maneShadow: '#4C1D95' },
    'Pink': { maneColor: '#F472B6', maneShadow: '#BE185D' },
    'Yellow': { maneColor: '#F59E0B', maneShadow: '#B45309' },
    'Red': { maneColor: '#EF4444', maneShadow: '#991B1B' },
    'Black': { maneColor: '#3B2456', maneShadow: '#14101C' },
  },
  bodies: {
    // Real on-chain Body traits
    'Red Tuxedo': {
      primary: '#EF4444',
      maneColor: '#F472B6',
      maneShadow: '#BE185D',
      outfit: 'red_tuxedo',
      vibe: 'Dapper High Roller & Formal Plaza Gentleman',
    },
    'Tuxedo': {
      primary: '#1E3A8A',
      maneColor: '#6C2BD9',
      maneShadow: '#4C1D95',
      outfit: 'navy_suit',
      vibe: 'Distinguished Gala Diplomat & Monad Diplomat',
    },
    'Blue tuxedo': {
      primary: '#2563EB',
      maneColor: '#6C2BD9',
      maneShadow: '#4C1D95',
      outfit: 'sky_suit',
      vibe: 'Azure Suited Charmer & Central Cafe Host',
    },
    'Shark Suit': {
      primary: '#0284C7',
      maneColor: '#38BDF8',
      maneShadow: '#0369A1',
      outfit: 'tps_jersey',
      vibe: 'Apex Monad Liquidity Shark & Speed Demon',
    },
    'Banana suit': {
      primary: '#FACC15',
      maneColor: '#CA8A04',
      maneShadow: '#A16207',
      outfit: 'breton_stripes',
      vibe: 'Banana-Chog Acrobat & Plaza Prankster',
    },
    'Inmate': {
      primary: '#F97316',
      maneColor: '#EA580C',
      maneShadow: '#C2410C',
      outfit: 'breton_stripes',
      vibe: 'Reformed Blockchain Rebel & Arcade Legend',
    },
    'Red Trackset': {
      primary: '#DC2626',
      maneColor: '#B91C1C',
      maneShadow: '#991B1B',
      outfit: 'tps_jersey',
      vibe: 'High-TPS Track Star & Plaza Sprinter',
    },
    // Legacy testnet aliases
    'Classic Purple': {
      primary: '#6C2BD9',
      maneColor: '#6C2BD9',
      maneShadow: '#4C1D95',
      outfit: 'breton_stripes',
      vibe: 'Charismatic Sailor & Cafe Regular',
    },
    'Mint Cyber': {
      primary: '#F472B6',
      maneColor: '#F472B6',
      maneShadow: '#BE185D',
      outfit: 'tps_jersey',
      vibe: '10K TPS Hyper-Speedster & Plushie Collector',
    },
    'Forest Moss': {
      primary: '#EF4444',
      maneColor: '#EF4444',
      maneShadow: '#991B1B',
      outfit: 'sky_suit',
      vibe: 'Laser-Focused Strategist & Market Scout',
    },
    'Golden Chog': {
      primary: '#F472B6',
      maneColor: '#F472B6',
      maneShadow: '#9D174D',
      outfit: 'navy_suit',
      vibe: 'Gold-Toothed High Roller & Town Diplomat',
    },
  },
  hats: {
    // Real on-chain Head traits
    'Wizard Hat': {
      hatType: 'star_wizard',
      flair: 'Star-studded mystical wizard cone shoots cosmic sparks!',
    },
    'MMGA Cap': {
      hatType: 'tps_cap',
      flair: 'Purple Make Monad Great Again cap flips in the wind!',
    },
    'BTC Cap': {
      hatType: 'tps_cap',
      flair: 'Bitcoin orange trucker cap spins with high TPS energy!',
    },
    'Russian Hat': {
      hatType: 'ushanka',
      flair: 'Fluffy winter ushanka ear-flaps bounce rhythmically!',
    },
    'Peace hat': {
      hatType: 'bucket',
      flair: 'Pastel peace bucket hat shields from Plaza sunshine!',
    },
    'Orange Bucket Cap': {
      hatType: 'bucket',
      flair: 'Vibrant orange bucket hat catches the sea breeze!',
    },
    'Spartan Helmet': {
      hatType: 'star_wizard',
      flair: 'Gleaming golden spartan crest radiates warrior glory!',
    },
    // Legacy testnet aliases
    'Crown': {
      hatType: 'bucket',
      flair: 'Grey striped bucket hat flips in the breeze!',
    },
    'Propeller Beanie': {
      hatType: 'tps_cap',
      flair: '10K TPS trucker cap spins off in disbelief!',
    },
    'Detective Cap': {
      hatType: 'ushanka',
      flair: 'Fluffy tan ushanka ear-flaps bounce wildly!',
    },
    'Wizard Cone': {
      hatType: 'star_wizard',
      flair: 'Starry navy wizard cone shoots golden sparks!',
    },
  },
  eyes: {
    // Real on-chain Eyes traits
    'Teary': { eyeType: 'heart_eyes' },
    'Anime Glass': { eyeType: 'gold_grin' },
    'Purple laser': { eyeType: 'green_laser' },
    'Gradient visor': { eyeType: 'rainbow_visor' },
    'Sunset visor': { eyeType: 'rainbow_visor' },
    'Plasma visor': { eyeType: 'rainbow_visor' },
    'Happy': { eyeType: 'heart_eyes' },
    'Retro Glass': { eyeType: 'gold_grin' },
    // Legacy testnet aliases
    'Sparkle': { eyeType: 'heart_eyes' },
    'Laser Visor': { eyeType: 'rainbow_visor' },
    'Narrow': { eyeType: 'green_laser' },
    'Chill': { eyeType: 'gold_grin' },
  },
};
