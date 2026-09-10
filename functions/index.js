const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const ALLOWED_ORIGINS = new Set([
  'https://gevabaram.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
]);

function setCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Code');
}

function validHexColor(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

function validateSectors(sectors) {
  if (!sectors || typeof sectors !== 'object' || Array.isArray(sectors)) return false;
  const keys = Object.keys(sectors);
  if (!keys.length || keys.some(k => !['A', 'B', 'C', 'D'].includes(k))) return false;

  for (const key of keys) {
    const s = sectors[key];
    if (!s || typeof s !== 'object') return false;
    if (typeof s.l !== 'string' || s.l.length > 4) return false;
    if (typeof s.n !== 'string' || s.n.length > 80) return false;
    if (!validHexColor(s.c)) return false;
    if (!Array.isArray(s.p) || s.p.length > 100) return false;
    if (!Array.isArray(s.x) || s.x.length < 3 || s.x.length > 5000) return false;
    for (const pt of s.x) {
      if (!Array.isArray(pt) || pt.length !== 2) return false;
      const [lat, lng] = pt;
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      if (lat < 31 || lat > 34 || lng < 34 || lng > 36.5) return false;
    }
  }
  return true;
}

exports.publishPolygons = functions
  .runWith({ secrets: ['EDITOR_CODE'] })
  .https.onRequest(async (req, res) => {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const origin = req.get('origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
    }

    const suppliedCode = req.get('x-admin-code') || '';
    if (!process.env.EDITOR_CODE || suppliedCode !== process.env.EDITOR_CODE) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const sectors = req.body && req.body.sectors;
    if (!validateSectors(sectors)) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    const version = Date.now();
    await db.collection('maps').doc('nazareth').set({
      sectors,
      version,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ ok: true, version });
  });
