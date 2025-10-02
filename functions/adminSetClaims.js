// Run locally: node adminSetClaims.js <uid> [sales|admin]
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // download and place here
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = process.argv[2];
const claim = process.argv[3] || 'sales';
if (!uid) { console.error('Usage: node adminSetClaims.js <uid> [sales|admin]'); process.exit(1); }
const claims = {}; claims[claim] = true;
admin.auth().setCustomUserClaims(uid, claims).then(() => {
  console.log(`Set ${claim} claim for ${uid}`);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
