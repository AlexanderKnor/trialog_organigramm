/**
 * Firebase Cloud Functions
 * Server-side functions for Trialog Organigramm
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp();
const auth = getAuth();
const db = getFirestore();

/**
 * Logger wrapper for Cloud Functions
 * Uses Firebase Functions logger for proper Cloud Logging integration
 */
const Logger = {
  log: (...args) => logger.log(...args),
  info: (...args) => logger.info(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => logger.error(...args),
};

// Admin email list - used only for initial setup and migration
// DEPRECATED: Use Custom Claims instead (see setUserRole function)
const ADMIN_EMAILS = [
  'alexander-knor@outlook.de',
  'info@trialog-makler.de',
  'buchhaltung@trialog-makler.de',
  'liebetrau@trialog-makler.de',
  'lippa@trialog-makler.de',
];

/**
 * Helper: Check if user is admin via Custom Claims
 * This replaces hardcoded email checks
 */
function isUserAdmin(authToken) {
  return authToken.role === 'admin';
}

/**
 * Helper: Check if email is in admin list (for initial setup only)
 */
function isAdminEmail(email) {
  return ADMIN_EMAILS.some((adminEmail) =>
    email.toLowerCase().includes(adminEmail.toLowerCase())
  );
}

/**
 * Create Employee Account
 * Callable function to create employee accounts without disrupting admin session
 */
exports.createEmployeeAccount = onCall({
  cors: true, // Enable CORS for all origins (Firebase Hosting + localhost)
}, async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to create accounts');
  }

  // Verify the caller is an admin via Custom Claims OR email fallback
  // Email fallback allows migration before Custom Claims are set
  if (!isUserAdmin(request.auth.token) && !isAdminEmail(request.auth.token.email)) {
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

    // Set Custom Claims for role (employee by default)
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'employee',
    });

    // Create user document in Firestore with employee role
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      displayName: displayName || email.split('@')[0],
      role: 'employee', // Always employee for organigramm-created accounts
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid, // Track who created this account
    });

    Logger.log(`✓ Employee account created: ${email} (uid: ${userRecord.uid})`);

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: `Account erfolgreich erstellt für ${email}`,
    };
  } catch (error) {
    Logger.error('Error creating employee account:', error);

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
exports.deleteEmployeeAccount = onCall({
  cors: true, // Enable CORS for all origins (Firebase Hosting + localhost)
}, async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify the caller is an admin via Custom Claims OR email fallback
  // Email fallback allows migration before Custom Claims are set
  if (!isUserAdmin(request.auth.token) && !isAdminEmail(request.auth.token.email)) {
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
        Logger.log(`ℹ️ No Auth account found for ${email} - skipping`);
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

    // CRITICAL: Revoke all refresh tokens BEFORE deleting
    // This forces the user to be logged out on all devices
    await auth.revokeRefreshTokens(userRecord.uid);
    Logger.log(`✓ Refresh tokens revoked for: ${email}`);

    // Delete the user from Firebase Auth
    await auth.deleteUser(userRecord.uid);

    // Delete the user document from Firestore
    await db.collection('users').doc(userRecord.uid).delete();

    Logger.log(`✓ Employee account deleted: ${email} (uid: ${userRecord.uid})`);

    return {
      success: true,
      uid: userRecord.uid,
      email: email,
      message: `Account erfolgreich gelöscht für ${email}`,
    };
  } catch (error) {
    Logger.error('Error deleting employee account:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'Fehler beim Löschen des Accounts: ' + error.message);
  }
});

/**
 * Set User Role (Admin Only)
 * Manually set a user's role using Custom Claims
 */
exports.setUserRole = onCall({
  cors: true, // Enable CORS for all origins (Firebase Hosting + localhost)
}, async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify the caller is an admin via Custom Claims OR email fallback
  // Email fallback allows migration before Custom Claims are set
  if (!isUserAdmin(request.auth.token) && !isAdminEmail(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only admins can set user roles');
  }

  const { email, role } = request.data;

  if (!email || !role) {
    throw new HttpsError('invalid-argument', 'Email and role are required');
  }

  if (role !== 'admin' && role !== 'employee') {
    throw new HttpsError('invalid-argument', 'Role must be "admin" or "employee"');
  }

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);

    // Set Custom Claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: role,
    });

    // Update Firestore document
    await db.collection('users').doc(userRecord.uid).update({
      role: role,
      roleUpdatedAt: FieldValue.serverTimestamp(),
      roleUpdatedBy: request.auth.uid,
    });

    Logger.log(`✓ Role updated for ${email}: ${role}`);

    return {
      success: true,
      uid: userRecord.uid,
      email: email,
      role: role,
      message: `Rolle erfolgreich auf "${role}" gesetzt für ${email}`,
    };
  } catch (error) {
    Logger.error('Error setting user role:', error);

    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Benutzer nicht gefunden');
    }

    throw new HttpsError('internal', 'Fehler beim Setzen der Rolle: ' + error.message);
  }
});

/**
 * Migrate All Users to Custom Claims
 * One-time migration to set Custom Claims for all existing users
 */
exports.migrateUsersToCustomClaims = onCall({
  cors: true, // Enable CORS for all origins (Firebase Hosting + localhost)
}, async (request) => {
  // Verify the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify the caller is an admin via Custom Claims OR email fallback
  // Email fallback is ESSENTIAL here - migration sets Custom Claims for the first time!
  if (!isUserAdmin(request.auth.token) && !isAdminEmail(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only admins can run migration');
  }

  try {
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    // List all users
    const listUsersResult = await auth.listUsers();

    for (const user of listUsersResult.users) {
      try {
        // Determine role based on email
        const role = isAdminEmail(user.email) ? 'admin' : 'employee';

        // Set Custom Claims
        await auth.setCustomUserClaims(user.uid, {
          role: role,
        });

        // Update or create Firestore document
        await db.collection('users').doc(user.uid).set(
          {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            role: role,
            migratedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        updatedCount++;
        results.push({
          email: user.email,
          role: role,
          status: 'success',
        });

        Logger.log(`✓ Migrated: ${user.email} → ${role}`);
      } catch (error) {
        errorCount++;
        results.push({
          email: user.email,
          status: 'error',
          error: error.message,
        });
        Logger.error(`✗ Failed to migrate ${user.email}:`, error);
      }
    }

    Logger.log(`Migration complete: ${updatedCount} users updated, ${errorCount} errors`);

    return {
      success: true,
      totalUsers: listUsersResult.users.length,
      updatedCount: updatedCount,
      errorCount: errorCount,
      results: results,
      message: `Migration abgeschlossen: ${updatedCount} Benutzer aktualisiert, ${errorCount} Fehler`,
    };
  } catch (error) {
    Logger.error('Error during migration:', error);
    throw new HttpsError('internal', 'Fehler bei der Migration: ' + error.message);
  }
});

/**
 * Resolve User UID by Email
 * Returns the Firebase Auth UID for a given email and ensures Firestore document exists.
 * Used by admins to configure profiles for users who haven't completed onboarding.
 */
exports.resolveUserUid = onCall({
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (!isUserAdmin(request.auth.token) && !isAdminEmail(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only admins can resolve user UIDs');
  }

  const { email } = request.data;

  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  const { displayName } = request.data;

  try {
    let userRecord;

    // Try to find existing Auth account
    try {
      userRecord = await auth.getUserByEmail(email);
      Logger.log(`✓ Found existing Auth account for ${email}: ${userRecord.uid}`);
    } catch (lookupError) {
      if (lookupError.code !== 'auth/user-not-found') {
        throw lookupError;
      }

      // Account doesn't exist — create it with a temporary password
      const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).slice(2, 8)}`;
      const role = isAdminEmail(email) ? 'admin' : 'employee';

      userRecord = await auth.createUser({
        email: email,
        password: tempPassword,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });

      await auth.setCustomUserClaims(userRecord.uid, { role });

      Logger.log(`✓ Created new Auth account for ${email}: ${userRecord.uid} (${role})`);
      Logger.log(`⚠️ Temporary password set — user must reset via password reset flow`);
    }

    // Ensure Firestore user document exists
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
      const role = isAdminEmail(email) ? 'admin' : 'employee';
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || email.split('@')[0],
        role,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      });
      Logger.log(`✓ Created Firestore document for ${email}`);
    }

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
    };
  } catch (error) {
    Logger.error('Error resolving user UID:', error);
    throw new HttpsError('internal', 'Fehler beim Auflösen: ' + error.message);
  }
});
