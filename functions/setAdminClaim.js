const admin = require('firebase-admin');
admin.initializeApp();

const uid = 'tvsiyji9DJP7R2R8J3LzgcH9zQp2'; // Your admin UID

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Admin claim set for user:', uid);
    process.exit();
  })
  .catch(error => {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }); 