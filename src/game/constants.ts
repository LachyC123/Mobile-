// RUSHLINE — core tuning constants. All gameplay numbers live here.

export const COLS = 7;
export const ROWS = 11;

/** Home (player) defends the bottom row and scores by reaching row 0. */
export const HOME_GOAL_ROW = 0; // row the PLAYER must reach to score
export const AWAY_GOAL_ROW = ROWS - 1; // row the BOT must reach to score

export const BASE_AP = 4;
export const SURGE_AP = 5; // AP when Flow surge is active
export const FLOW_MAX = 6;
export const FLOW_PER_PASS = 1;
export const FLOW_PER_SHOVE = 1;
export const FLOW_PER_GOAL = 2;

export const GOALS_TO_WIN = 3;
export const MAX_PLAYS_PER_TEAM = 12; // then sudden death if tied

export type ClassId = 'RUSHER' | 'GUARD' | 'CAPTAIN';

export interface ClassDef {
  id: ClassId;
  name: string;
  spd: number;
  passRange: number;
  canShove: boolean;
  threaded: boolean; // passes cannot be intercepted
  blurb: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  RUSHER: {
    id: 'RUSHER',
    name: 'Rusher',
    spd: 3,
    passRange: 3,
    canShove: false,
    threaded: false,
    blurb: 'Fast legs. Your scoring threat.',
  },
  GUARD: {
    id: 'GUARD',
    name: 'Guard',
    spd: 2,
    passRange: 3,
    canShove: true,
    threaded: false,
    blurb: 'Can SHOVE rivals. The Core pops loose.',
  },
  CAPTAIN: {
    id: 'CAPTAIN',
    name: 'Captain',
    spd: 2,
    passRange: 4,
    canShove: false,
    threaded: true,
    blurb: 'Threaded passes are never intercepted.',
  },
};

export const CLASS_ORDER: ClassId[] = ['CAPTAIN', 'RUSHER', 'RUSHER', 'GUARD', 'GUARD'];

// ── Ranked ladder ──────────────────────────────────────────────

export interface ClubDef {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  motif: 'stripes' | 'bolt' | 'star' | 'checker' | 'hoops' | 'diamond';
}

export interface DivisionDef {
  id: string;
  name: string;
  icon: string; // short label
  color: string;
  botAP: number;
  noise: number; // utility noise; higher = dumber
  avoidsRisk: boolean; // avoids interceptable passes
  huntsInterceptions: boolean;
  clubs: ClubDef[];
}

export const PLAYER_CLUB: ClubDef = {
  id: 'voltford',
  name: 'Voltford City',
  primary: '#29d3b5',
  secondary: '#17324a',
  motif: 'bolt',
};

export const DIVISIONS: DivisionDef[] = [
  {
    id: 'rookie', name: 'Rookie', icon: 'R', color: '#9db4a0',
    botAP: 3, noise: 7, avoidsRisk: false, huntsInterceptions: false,
    clubs: [
      { id: 'mudtown', name: 'Mudtown Rovers', primary: '#a97c50', secondary: '#3b2d20', motif: 'hoops' },
      { id: 'cranes', name: 'Paper Cranes', primary: '#e8e4d8', secondary: '#5b7a8c', motif: 'stripes' },
      { id: 'brickyard', name: 'Brickyard SC', primary: '#b5533c', secondary: '#3a3a3f', motif: 'checker' },
    ],
  },
  {
    id: 'bronze', name: 'Bronze', icon: 'B', color: '#c98d4b',
    botAP: 4, noise: 4.5, avoidsRisk: false, huntsInterceptions: false,
    clubs: [
      { id: 'kestrels', name: 'Copper Kestrels', primary: '#d98e4a', secondary: '#4a2f1d', motif: 'star' },
      { id: 'harbor', name: 'Harbor Lights', primary: '#e3c878', secondary: '#274b63', motif: 'hoops' },
      { id: 'anchor', name: 'Old Anchor FC', primary: '#7a8b99', secondary: '#22303c', motif: 'diamond' },
    ],
  },
  {
    id: 'silver', name: 'Silver', icon: 'S', color: '#c9d4dd',
    botAP: 4, noise: 2.8, avoidsRisk: true, huntsInterceptions: false,
    clubs: [
      { id: 'silverline', name: 'Silverline City', primary: '#cfd8e3', secondary: '#31445c', motif: 'stripes' },
      { id: 'wolves', name: 'Mirror Wolves', primary: '#b9c6d6', secondary: '#20262e', motif: 'star' },
      { id: 'comets', name: 'Pale Comets', primary: '#dfe6ee', secondary: '#6b5b8c', motif: 'bolt' },
    ],
  },
  {
    id: 'gold', name: 'Gold', icon: 'G', color: '#ffd23f',
    botAP: 4, noise: 1.6, avoidsRisk: true, huntsInterceptions: true,
    clubs: [
      { id: 'badgers', name: 'Golden Badgers', primary: '#f2b53a', secondary: '#3a2c12', motif: 'checker' },
      { id: 'kings', name: 'Solar Kings', primary: '#ffd23f', secondary: '#8c3a2b', motif: 'star' },
      { id: 'aurum', name: 'Aurum Athletic', primary: '#e8c766', secondary: '#22303c', motif: 'diamond' },
    ],
  },
  {
    id: 'platinum', name: 'Platinum', icon: 'P', color: '#7ee8fa',
    botAP: 5, noise: 1.0, avoidsRisk: true, huntsInterceptions: true,
    clubs: [
      { id: 'ravens', name: 'Chrome Ravens', primary: '#aab8c8', secondary: '#141a24', motif: 'bolt' },
      { id: 'static', name: 'Static Void', primary: '#7ee8fa', secondary: '#23233c', motif: 'diamond' },
      { id: 'prism', name: 'Prism Union', primary: '#f4f0ff', secondary: '#5c4a8c', motif: 'stripes' },
    ],
  },
  {
    id: 'diamond', name: 'Diamond', icon: 'D', color: '#b388ff',
    botAP: 5, noise: 0.4, avoidsRisk: true, huntsInterceptions: true,
    clubs: [
      { id: 'suns', name: 'Midnight Suns', primary: '#2c3e6e', secondary: '#ffd23f', motif: 'star' },
      { id: 'obsidian', name: 'Obsidian Order', primary: '#3c3c46', secondary: '#b388ff', motif: 'diamond' },
      { id: 'supernova', name: 'Supernova FC', primary: '#ff9d5c', secondary: '#2c1a3c', motif: 'bolt' },
    ],
  },
];

export const LP_WIN = 26;
export const LP_LOSS = -14;
export const LP_LOSS_ROOKIE = -8;
export const LP_MAX = 100;

export const LOADING_TIPS = [
  'Passes travel in straight lines — rows, columns and diagonals.',
  'A rival standing NEXT to your pass lane will intercept it.',
  'The Captain\'s threaded passes can never be intercepted.',
  'Guards SHOVE adjacent rivals. The Core pops loose.',
  'Caught passes and shoves build FLOW. Full Flow = a 5th Action Point.',
  'You only get 4 actions per play. Choose who sits out.',
  'Rushers move 3 tiles. Use them to chase loose Cores.',
  'A carrier shoved into the boards still drops the Core.',
  'First to 3 goals wins. Tied after 12 plays each? Golden goal.',
  'Sometimes the best pass is backwards. Space wins games.',
  'Loose Cores belong to whoever runs onto them first.',
  'Block the lane, not the player. Interceptions win matches.',
];
