// helpers.js
const crypto = require('crypto');

exports.duplicateHash = ({ email='', phone='', name='' }) => {
  const e = (email||'').trim().toLowerCase();
  const p = (phone||'').replace(/\D/g,'');
  const n = (name||'').trim().toLowerCase();
  const norm = `${e}|${p}|${n}`;
  return crypto.createHash('sha256').update(norm).digest('hex');
};

exports.computeLeadScore = (lead = {}) => {
  const numSubjects = Array.isArray(lead.interestedSubjects) ? lead.interestedSubjects.length : (lead.interestedSubjects ? 1 : 0);
  const fitScore = Math.min(1, numSubjects / 3);
  const intent = lead.intent || {};
  const intentScore = intent.requestedDemo ? 1 : (intent.clickedPricing ? 0.8 : 0.4);
  const recencyScore = 1.0;
  const score = 0.5 * fitScore + 0.3 * intentScore + 0.2 * recencyScore;
  return Number(score.toFixed(3));
};

// Geospatial & helpers
exports.toRad = (x) => x * Math.PI / 180;
exports.haversineKm = (aLat, aLng, bLat, bLng) => {
  if (aLat == null || bLat == null) return null;
  const R = 6371;
  const dLat = exports.toRad(bLat - aLat);
  const dLon = exports.toRad(bLng - aLng);
  const a = Math.sin(dLat/2)**2 + Math.cos(exports.toRad(aLat))*Math.cos(exports.toRad(bLat)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

exports.overlapMinutes = (aSlots, bSlots) => {
  if (!Array.isArray(aSlots) || !Array.isArray(bSlots)) return 0;
  let overlap = 0;
  for (const a of aSlots) {
    for (const b of bSlots) {
      if (a.day !== b.day) continue;
      const start = Math.max(a.startMin, b.startMin);
      const end = Math.min(a.endMin, b.endMin);
      if (end > start) overlap += (end - start);
    }
  }
  return overlap;
};

exports.jaccard = (a, b) => {
  const sa = new Set(a || []);
  const sb = new Set(b || []);
  const inter = [...sa].filter(x => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
};
