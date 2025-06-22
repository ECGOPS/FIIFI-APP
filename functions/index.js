const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// deleteUserByAdmin function removed as requested

exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  // Log the caller's claims for debugging
  console.log('Caller claims:', context.auth && context.auth.token);

  // Only allow admins to delete users
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete users.'
    );
  }

  const uid = data && typeof data === 'object' ? data.uid : undefined;
  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a UID.'
    );
  }

  try {
    // Delete from Auth
    await admin.auth().deleteUser(uid);
    // Delete from Firestore
    await admin.firestore().collection('users').doc(uid).delete();
    console.log(`Successfully deleted user and Firestore doc for UID: ${uid}`);
    return { success: true, message: `User ${uid} deleted from Auth and Firestore.` };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('unknown', error.message, error);
  }
}); 