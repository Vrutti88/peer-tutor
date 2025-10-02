// index.js - Cloud Functions
const functions = require('firebase-functions');
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require('firebase-admin');
const { duplicateHash, computeLeadScore, haversineKm, toRad, overlapMinutes, jaccard } = require('./helpers');

admin.initializeApp();
const db = admin.firestore();

/**
 * onLeadCreated: compute duplicateHash, score, insert into leadQueue
 */
exports.onLeadCreated = functions.firestore
  .document('leads/{leadId}')
  .onCreate(async (snap, context) => {
    const lead = snap.data() || {};
    const id = context.params.leadId;
    const hash = duplicateHash(lead);

    const leadQ = await db.collection('leads').where('duplicateHash', '==', hash).get();
    const userQ = await db.collection('users').where('duplicateHash', '==', hash).get();

    let isDuplicate = false;
    leadQ.forEach(d => { if (d.id !== id) isDuplicate = true; });

    const score = computeLeadScore(lead);

    await snap.ref.update({
      duplicateHash: hash,
      duplicate: isDuplicate,
      score,
      stage: lead.stage || 'prospect',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('leadQueue').doc(id).set({
      leadRef: snap.ref,
      score,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return null;
  });

/**
 * assignTopLeads: callable for sales reps to claim leads (atomic)
 */
exports.assignTopLeads = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  if (!context.auth.token || !context.auth.token.sales) throw new functions.https.HttpsError('permission-denied', 'Sales access required');

  const salesUid = context.auth.uid;
  const limit = data.limit || 5;
  const snapshot = await db.collection('leadQueue').orderBy('score', 'desc').limit(limit).get();
  const assigned = [];

  for (const doc of snapshot.docs) {
    try {
      await db.runTransaction(async (t) => {
        const qDoc = await t.get(doc.ref);
        if (!qDoc.exists) return;
        const leadRef = qDoc.data().leadRef;
        const leadSnap = await t.get(leadRef);
        if (!leadSnap.exists) {
          t.delete(doc.ref);
          return;
        }
        const leadData = leadSnap.data();
        if (leadData.assignedTo) return;
        t.update(leadRef, { assignedTo: salesUid, stage: 'qualified', assignedAt: admin.firestore.FieldValue.serverTimestamp() });
        t.delete(doc.ref);
        assigned.push({ leadId: leadRef.id, name: leadData.name || '' });
      });
    } catch (err) {
      console.error('Transaction failed for doc', doc.id, err);
    }
  }
  return { assigned };
});

/**
 * convertLead: create user from lead and mark lead as customer
 */
exports.convertLead = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  if (!context.auth.token || !context.auth.token.sales) throw new functions.https.HttpsError('permission-denied', 'Sales access required');
  const leadId = data.leadId;
  if (!leadId) throw new functions.https.HttpsError('invalid-argument', 'leadId required');

  const leadRef = db.collection('leads').doc(leadId);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) throw new functions.https.HttpsError('not-found', 'Lead not found');
  const lead = leadSnap.data();

  const newUserRef = db.collection('users').doc();
  await newUserRef.set({
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    role: 'student',
    canTeach: lead.canTeach || [],
    wantsToLearn: lead.wantsToLearn || [],
    city: lead.city || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lifetimeValue: 0,
    duplicateHash: lead.duplicateHash || ''
  });

  await leadRef.update({ stage: 'customer', convertedAt: admin.firestore.FieldValue.serverTimestamp(), customerId: newUserRef.id });
  return { customerId: newUserRef.id };
});

/**
 * createOrder: atomic order creation with inventory decrement
 */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { customerId, items, channel } = data;
  if (!customerId || !items || items.length === 0) throw new functions.https.HttpsError('invalid-argument', 'customerId and items required');

  const orderRef = db.collection('orders').doc();
  const invRefs = items.map(it => db.collection('inventory').doc(it.sku));

  return db.runTransaction(async (t) => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const invRef = invRefs[i];
      const invSnap = await t.get(invRef);
      if (!invSnap.exists) throw new functions.https.HttpsError('not-found', `Inventory ${it.sku} not found`);
      const inv = invSnap.data();
      if ((inv.qtyAvailable || 0) < it.qty) throw new functions.https.HttpsError('failed-precondition', `Out of stock for ${it.sku}`);
      t.update(invRef, { qtyAvailable: (inv.qtyAvailable || 0) - it.qty });
      total += (inv.price || it.price || 0) * it.qty;
    }
    t.set(orderRef, {
      customerId, items, total, channel: channel || 'unknown', createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection('users').doc(customerId);
    const userSnap = await t.get(userRef);
    if (userSnap.exists) {
      const user = userSnap.data();
      const newLTV = (user.lifetimeValue || 0) + total;
      t.update(userRef, { lifetimeValue: newLTV });
    }
    return { orderId: orderRef.id, total };
  });
});

/**
 * computeNps (scheduled hourly)
 */
exports.computeNps = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
  const fb = db.collection('feedback');
  const snap = await fb.where('type', '==', 'nps').get();
  let total = 0, promoters = 0, detractors = 0;
  snap.forEach(doc => {
    const n = doc.data().nps || 0;
    total++;
    if (n >= 9) promoters++;
    else if (n <= 6) detractors++;
  });
  const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
  await db.doc('metrics/nps').set({ value: nps, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return null;
});

/**
 * computeRfmClv (scheduled daily)
 */
exports.computeRfmClv = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const ordersSnap = await db.collection('orders').get();
  const customerMap = new Map();
  const now = Date.now();

  ordersSnap.forEach(doc => {
    const o = doc.data();
    const cid = o.customerId;
    if (!customerMap.has(cid)) customerMap.set(cid, { total: 0, count: 0, lastOrderTs: 0 });
    const entry = customerMap.get(cid);
    entry.total += o.total || 0;
    entry.count += 1;
    const ts = o.createdAt ? o.createdAt.toMillis() : now;
    if (ts > entry.lastOrderTs) entry.lastOrderTs = ts;
    customerMap.set(cid, entry);
  });

  const rfmList = [];
  customerMap.forEach((v, k) => {
    const recencyDays = Math.round((now - v.lastOrderTs) / (1000 * 60 * 60 * 24));
    const frequency = v.count;
    const monetary = v.total;
    const clv = (frequency === 0) ? 0 : (monetary / frequency) * frequency * 1.2;
    rfmList.push({ customerId: k, recencyDays, frequency, monetary, clv });
  });

  const totalCustomers = rfmList.length;
  const totalCLV = rfmList.reduce((s, r) => s + (r.clv || 0), 0);
  await db.doc('metrics/clv').set({ avgClv: totalCustomers ? (totalCLV / totalCustomers) : 0, computedAt: admin.firestore.FieldValue.serverTimestamp() });

  await db.doc('metrics/rfm').set({ snapshot: rfmList.slice(0, 50), updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  return null;
});

/**
 * lowStockAlert (hourly)
 */
exports.lowStockAlert = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
  const low = [];
  const invSnap = await db.collection('inventory').where('qtyAvailable', '<', 10).get();
  invSnap.forEach(d => low.push({ sku: d.id, ...d.data() }));
  await db.doc('metrics/lowStock').set({ items: low, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return null;
});

/**
 * computeReferralReach (callable) - BFS
 */
exports.computeReferralReach = functions.https.onCall(async (data) => {
  const referrerId = data.referrerId;
  const maxDepth = data.maxDepth || 3;
  if (!referrerId) throw new functions.https.HttpsError('invalid-argument', 'referrerId required');

  const visited = new Set([referrerId]);
  const queue = [{ id: referrerId, depth: 0 }];
  let reach = 0;

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    const snaps = await db.collection('referrals').where('referrerId', '==', id).get();
    snaps.forEach(s => {
      const child = s.data().refereeId;
      if (!child) return;
      if (!visited.has(child)) {
        visited.add(child);
        reach++;
        queue.push({ id: child, depth: depth + 1 });
      }
    });
  }

  return { reach, nodes: visited.size };
});

/**
 * findPeerMatches (callable)
 * - Main matching algorithm (reciprocal)
 */
exports.findPeerMatches = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const uid = context.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found');
  const user = userSnap.data();
  const wantSubjects = user.wantsToLearn || [];
  const candidateMap = new Map();

  for (const subj of wantSubjects) {
    const qSnap = await db.collection('users').where('canTeach', 'array-contains', subj).get();
    qSnap.forEach(d => { if (d.id !== uid) candidateMap.set(d.id, d.data()); });
  }

  const matches = [];
  for (const [cid, cdata] of candidateMap.entries()) {
    const reciprocalSubjects = (cdata.wantsToLearn || []).filter(s => (user.canTeach || []).includes(s));
    if (reciprocalSubjects.length === 0) continue;

    const subjReciprocityCount = Math.min(
      (wantSubjects.filter(s => (cdata.canTeach || []).includes(s)).length || 0),
      reciprocalSubjects.length
    );
    const subjectScore = subjReciprocityCount / Math.max(1, wantSubjects.length);

    const desiredMinutes = data.desiredMinutes || 120;
    const availabilityOverlap = overlapMinutes(user.availability, cdata.availability);
    const availabilityScore = Math.min(1, availabilityOverlap / desiredMinutes);

    const maxKm = data.maxKm || 30;
    let locationScore = 0.5;
    if (user.location && cdata.location) {
      const d = (typeof haversineKm === 'function') ? haversineKm(user.location.lat, user.location.lng, cdata.location.lat, cdata.location.lng) : null;
      if (d !== null) locationScore = Math.max(0, 1 - (d / maxKm));
    }

    const ratingScore = (((user.rating || 4) + (cdata.rating || 4)) / 10);
    const styleScore = jaccard(user.learningStyles || [], cdata.learningStyles || []);

    const score = 0.45 * subjectScore + 0.2 * availabilityScore + 0.15 * locationScore + 0.1 * ratingScore + 0.1 * styleScore;

    matches.push({
      candidateId: cid,
      score: Number(score.toFixed(4)),
      subjectScore, availabilityScore, locationScore, ratingScore, styleScore
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return { matches: matches.slice(0, (data.limit || 20)) };
});
