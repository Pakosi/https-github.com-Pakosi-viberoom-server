export const WS_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'ws://localhost:3000'
  : 'wss://viberoom-server-production.up.railway.app';

export const HOST_PREFIX = '__HOST__';
export const FLOOR_Y = 0;
export const BOUNDS = { minX: -21.2, maxX: 21.2, minZ: -14.0, maxZ: 14.0 };

export const CHARS = [
  { key: 'pax',    name: 'Pax',    hoodie: '#e8b96a', hair: 'fade',  skin: 0xf0c89c },
  { key: 'shahed', name: 'Shahed', hoodie: '#4d90c8', hair: 'normal', skin: 0xe8b888, bigNose: true },
  { key: 'arsham', name: 'Arsham', hoodie: 'barca',   hair: 'normal', skin: 0xe8b888 },
  { key: 'amir',   name: 'Amir',   hoodie: '#111111', hair: 'fade',   skin: 0xd8a078 },
  { key: 'arash',  name: 'Arash',  hoodie: '#c85a4a', hair: 'bald',   skin: 0xe8b888 },
  { key: 'custom', name: 'Custom', hoodie: '#a878c8', hair: 'normal', skin: 0xf0c89c },
];
