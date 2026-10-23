// server/unmappedTraits.js
// Tracks traits observed across Chog Genesis NFTs and generates unmapped traits reports

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve('.cache');
const UNMAPPED_FILE = path.join(CACHE_DIR, 'unmapped_traits.json');

// In-memory table: key = `${type}:::${value}` -> { type, value, count, firstSeen }
let unmappedTable = new Map();

if (fs.existsSync(UNMAPPED_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(UNMAPPED_FILE, 'utf8'));
    for (const item of raw) {
      unmappedTable.set(`${item.trait_type}:::${item.trait_value}`, item);
    }
  } catch (e) {}
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const list = Array.from(unmappedTable.values());
      fs.writeFileSync(UNMAPPED_FILE, JSON.stringify(list, null, 2));
    } catch (e) {}
  }, 2000);
}

export function recordUnmappedTrait(traitType, traitValue) {
  if (!traitType || !traitValue) return;
  const key = `${traitType}:::${traitValue}`;
  const existing = unmappedTable.get(key);
  if (existing) {
    existing.count++;
  } else {
    unmappedTable.set(key, {
      trait_type: traitType,
      trait_value: traitValue,
      count: 1,
      first_seen: new Date().toISOString(),
    });
  }
  scheduleSave();
}

export function getUnmappedTraitsReport() {
  const all = Array.from(unmappedTable.values());
  all.sort((a, b) => b.count - a.count);
  return {
    totalDistinct: all.length,
    traits: all,
  };
}
