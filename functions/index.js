/**
 * Firebase Cloud Functions
 * Server-side functions for Trialog Organigramm
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp();
const auth = getAuth();
const db = getFirestore();

// Admin email list (must match client-side list)
const ADMIN_EMAILS = [
  'alexander-knor@outlook.de',
  'info@trialog-makler.de',
  'buchhaltung@trialog-makler.de',
  'liebetrau@trialog-makler.de',
  'lippa@trialog-makler.de',
];

/**
 * Create Employee Account
 * Callable function to create employee accounts without disrupting admin session
 */
exports.createEmployeeAccount = onCall(async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to create accounts');
  }

  // Verify the caller is an admin
  const callerEmail = request.auth.token.email;
  const isAdmin = ADMIN_EMAILS.some((adminEmail) =>
    callerEmail.toLowerCase().includes(adminEmail.toLowerCase())
  );

  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Only admins can create employee accounts');
  }

  // Extract parameters
  const { email, displayName, password } = request.data;

  if (!email || !password) {
    throw new HttpsError('invalid-argument', 'Email and password are required');
  }

  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  try {
    // Create the user with Admin SDK (does NOT affect current session!)
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
    });

    // Create user document in Firestore with employee role
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      displayName: displayName || email.split('@')[0],
      role: 'employee', // Always employee for organigramm-created accounts
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid, // Track who created this account
    });

    console.log(`✓ Employee account created: ${email} (uid: ${userRecord.uid})`);

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: `Account erfolgreich erstellt für ${email}`,
    };
  } catch (error) {
    console.error('Error creating employee account:', error);

    // Map Firebase Admin errors to user-friendly messages
    let errorMessage = 'Ein Fehler ist aufgetreten';

    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'E-Mail-Adresse wird bereits verwendet';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Ungültige E-Mail-Adresse';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Passwort ist zu schwach';
    }

    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Delete Employee Account
 * Callable function to delete employee accounts (admin only)
 */
exports.deleteEmployeeAccount = onCall(async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify the caller is an admin
  const callerEmail = request.auth.token.email;
  const isAdmin = ADMIN_EMAILS.some((adminEmail) =>
    callerEmail.toLowerCase().includes(adminEmail.toLowerCase())
  );

  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Only admins can delete accounts');
  }

  const { email } = request.data;

  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Get user by email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`ℹ️ No Auth account found for ${email} - skipping`);
        return {
          success: true,
          message: 'Kein Auth-Account gefunden (bereits gelöscht oder nie erstellt)',
        };
      }
      throw error;
    }

    // Check if the user is an admin (prevent admin deletion)
    const userDoc = await db.collection('users').doc(userRecord.uid).get();

    if (userDoc.exists && userDoc.data().role === 'admin') {
      throw new HttpsError('permission-denied', 'Cannot delete admin accounts');
    }

    // Delete the user from Firebase Auth
    await auth.deleteUser(userRecord.uid);

    // Delete the user document from Firestore
    await db.collection('users').doc(userRecord.uid).delete();

    console.log(`✓ Employee account deleted: ${email} (uid: ${userRecord.uid})`);

    return {
      success: true,
      uid: userRecord.uid,
      email: email,
      message: `Account erfolgreich gelöscht für ${email}`,
    };
  } catch (error) {
    console.error('Error deleting employee account:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'Fehler beim Löschen des Accounts: ' + error.message);
  }
});
