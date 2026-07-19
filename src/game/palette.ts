// RUSHLINE — master palette. One strict color system for every pixel in the game.
// Roles: world base / player team / enemy team / danger / reward / interact / UI.

export const PAL = {
  // dusk sky
  skyTop: '#141b2e',
  skyMid: '#2c2a4e',
  skyLow: '#6e3a5c',
  horizon: '#e08a5c',
  star: '#ffe9c9',

  // stadium structure
  standDark: '#1b2233',
  standMid: '#252e45',
  standLight: '#31405e',
  boardBg: '#101828',
  boardText: '#e8f4e4',
  towerDark: '#2a3142',
  lamp: '#fff3c4',
  lampGlow: '#ffe9a0',

  // pitch
  grassA: '#3d9e5f',
  grassB: '#37915a',
  grassStripeA: '#45ab6a',
  grassStripeB: '#3fa065',
  chalk: '#eef7ea',
  chalkDim: '#b9d9bc',
  turfDark: '#2c7a45',

  // semantic
  danger: '#ff4d4d',
  dangerDark: '#b32d3a',
  reward: '#ffd23f',
  rewardDark: '#d9a821',
  interact: '#6ef3ff',
  heal: '#7dff8a',

  // ball
  core: '#ffef9e',
  coreMid: '#ffc94d',
  coreDark: '#e08a2c',

  // UI ink
  ink: '#0e1420',
  panel: '#1a2338',
  panelLight: '#263352',
  panelEdge: '#3b4f7a',
  textMain: '#f2f6ff',
  textDim: '#93a3c4',

  // generic sprite colors (overridden per team)
  skin: '#f2c9a0',
  skinDark: '#d9a678',
  boots: '#1c2430',
  white: '#ffffff',
} as const;

// crowd palette — muted dusk clothing hues, low saturation so the pitch stays focal
export const CROWD_COLORS = [
  '#4a5578', '#5c4a6e', '#6e5a4a', '#3c5a5c', '#5a6e4a', '#7a5a6e',
  '#4a6e6e', '#6e4a5a', '#565f82', '#8c7a5a', '#3f4d6e', '#6b5b8c',
];

export type PalKey = keyof typeof PAL;
