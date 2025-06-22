const admin = require('firebase-admin');

// Initialize with your service account or default credentials
admin.initializeApp();

const db = admin.firestore();

async function setAdminClaimsForAllAdmins() {
  const snapshot = await db.collection('users').where('role', '==', 'admin').get();

  if (snapshot.empty) {
    console.log('No admin users found in Firestore.');
    return;
  }

  for (const doc of snapshot.docs) {
    const user = doc.data();
    const uid = user.uid || doc.id; // Use 'uid' field or document ID
    try {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      console.log(`Set admin claim for user: ${uid}`);
    } catch (error) {
      console.error(`Failed to set admin claim for user: ${uid}`, error);
    }
  }
}

setAdminClaimsForAllAdmins()
  .then(() => {
    console.log('Done setting admin claims.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  }); 