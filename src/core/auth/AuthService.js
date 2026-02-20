/**
 * Authentication Service
 * Handles user authentication, session management, and role-based access
 */

import { firebaseApp } from '../firebase/FirebaseApp.js';
import { FIRESTORE_COLLECTIONS } from '../config/firebase.config.js';
import { Logger } from '../utils/logger.js';

// DEPRECATED: Admin emails - only used as fallback during migration
// TODO: Remove after all users have been migrated to Custom Claims
// Use Cloud Function `migrateUsersToCustomClaims` to migrate
const ADMIN_EMAILS = [
  'alexander-knor@outlook.de',
  'info@trialog-makler.de',
  'buchhaltung@trialog-makler.de',
  'liebetrau@trialog-makler.de',
  'lippa@trialog-makler.de',
];

export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
};

export class AuthService {
  #auth = null;
  #firestore = null;
  #currentUser = null;
  #userRole = null;
  #linkedNodeId = null;
  #authStateListeners = [];

  async initialize() {
    this.#auth = firebaseApp.auth;
    this.#firestore = firebaseApp.firestore;

    // Dynamic imports for Firebase Auth
    const {
      onAuthStateChanged,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      sendPasswordResetEmail,
      updatePassword,
      reauthenticateWithCredential,
      EmailAuthProvider,
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    this.signInWithEmailAndPassword = signInWithEmailAndPassword;
    this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
    this.signOut = signOut;
    this.sendPasswordResetEmail = sendPasswordResetEmail;
    this.updatePassword = updatePassword;
    this.reauthenticateWithCredential = reauthenticateWithCredential;
    this.EmailAuthProvider = EmailAuthProvider;

    // Dynamic imports for Firestore
    const {
      doc,
      getDoc,
      setDoc,
      serverTimestamp,
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    this.firestoreHelpers = {
      doc,
      getDoc,
      setDoc,
      serverTimestamp,
    };

    // Listen to auth state changes
    onAuthStateChanged(this.#auth, async (user) => {
      if (user) {
        await this.#handleAuthStateChange(user);
      } else {
        this.#currentUser = null;
        this.#userRole = null;
        this.#linkedNodeId = null;
        this.#notifyAuthStateChange(null);
      }
    });

    Logger.log('✓ AuthService initialized');
  }

  async #handleAuthStateChange(user) {
    try {
      // SECURITY: Verify user document exists in Firestore
      // This catches deleted users who still have valid tokens
      const userDocExists = await this.#verifyUserDocument(user.uid);
      if (!userDocExists) {
        Logger.warn('⚠️ SECURITY: User document not found - forcing logout');
        await this.signOut(this.#auth);
        return;
      }

      // Determine user role from Custom Claims (priority) or fallback
      const role = await this.#determineUserRole(user);

      // Update or create user document
      await this.#updateUserDocument(user, role);

      // For employees, try to link to HierarchyNode
      let linkedNodeId = null;
      if (role === USER_ROLES.EMPLOYEE) {
        linkedNodeId = await this.#findLinkedNode(user.email);
      }

      // SECURITY: Validate role is valid
      if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.EMPLOYEE) {
        Logger.error('🔒 SECURITY: Invalid user role detected - forcing logout');
        await this.signOut(this.#auth);
        return;
      }

      this.#currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role,
      };

      this.#userRole = role;
      this.#linkedNodeId = linkedNodeId;

      Logger.log(`✓ User authenticated: ${user.email} (${role})`);
      if (linkedNodeId) {
        Logger.log(`✓ Linked to node: ${linkedNodeId}`);
      }

      // Notify listeners
      this.#notifyAuthStateChange({
        ...this.#currentUser,
        linkedNodeId,
      });
    } catch (error) {
      Logger.error('Error handling auth state change:', error);
    }
  }

  async #verifyUserDocument(uid) {
    try {
      const { doc, getDoc } = this.firestoreHelpers;
      const userRef = doc(this.#firestore, FIRESTORE_COLLECTIONS.USERS, uid);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      Logger.error('Error verifying user document:', error);
      return false; // Fail closed - if we can't verify, assume not exists
    }
  }

  async #determineUserRole(user) {
    // PRIORITY 1: Check Custom Claims (set by Cloud Functions)
    const token = await user.getIdTokenResult();
    if (token.claims.role) {
      Logger.log(`✓ Role from Custom Claims: ${token.claims.role}`);
      return token.claims.role;
    }

    // PRIORITY 2: Check Firestore document (for existing users)
    try {
      const { doc, getDoc } = this.firestoreHelpers;
      const userRef = doc(this.#firestore, FIRESTORE_COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().role) {
        Logger.log(`✓ Role from Firestore: ${userDoc.data().role}`);
        return userDoc.data().role;
      }
    } catch (error) {
      Logger.warn('Could not fetch role from Firestore:', error);
    }

    // PRIORITY 3: Fallback to email check (for migration/new users)
    const normalizedEmail = user.email.toLowerCase();
    const role = ADMIN_EMAILS.some((adminEmail) =>
      normalizedEmail.includes(adminEmail.toLowerCase())
    )
      ? USER_ROLES.ADMIN
      : USER_ROLES.EMPLOYEE;

    Logger.warn(`⚠️ Using fallback role determination for ${user.email}: ${role}`);
    Logger.warn('⚠️ Please run migration to set Custom Claims for all users');

    return role;
  }

  async #findLinkedNode(userEmail) {
    // This will search for a HierarchyNode with matching email
    // For now, returns null - will be implemented when we integrate with HierarchyService
    // TODO: Search hierarchy trees for node with matching email
    return null;
  }

  async #updateUserDocument(user, role) {
    try {
      const { doc, getDoc, setDoc, serverTimestamp } = this.firestoreHelpers;
      const userRef = doc(this.#firestore, FIRESTORE_COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        Logger.log('✓ User document created');
      } else {
        // Update last login and role (in case it changed)
        await setDoc(
          userRef,
          {
            role,
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
        Logger.log('✓ User document updated');
      }
    } catch (error) {
      Logger.error('Failed to update user document:', error);
    }
  }

  async login(email, password) {
    try {
      const userCredential = await this.signInWithEmailAndPassword(
        this.#auth,
        email,
        password
      );

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.#getErrorMessage(error.code),
      };
    }
  }

  async register(email, password, displayName = null) {
    try {
      const userCredential = await this.createUserWithEmailAndPassword(
        this.#auth,
        email,
        password
      );

      const user = userCredential.user;

      // Determine role for new user (check if admin email)
      const normalizedEmail = email.toLowerCase();
      const role = ADMIN_EMAILS.some((adminEmail) =>
        normalizedEmail.includes(adminEmail.toLowerCase())
      )
        ? USER_ROLES.ADMIN
        : USER_ROLES.EMPLOYEE;

      // Create user document IMMEDIATELY after registration
      // This is critical because #handleAuthStateChange will check for document existence
      const { doc, setDoc, serverTimestamp } = this.firestoreHelpers;
      const userRef = doc(this.#firestore, FIRESTORE_COLLECTIONS.USERS, user.uid);

      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        role,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      Logger.log(`✓ User document created during registration: ${email} (${role})`);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          role,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.#getErrorMessage(error.code),
      };
    }
  }

  async createEmployeeAccount(email, displayName, password) {
    try {
      // Verify admin is logged in
      if (!this.isAdmin()) {
        throw new Error('Only admins can create employee accounts');
      }

      // Call Cloud Function to create account (preserves admin session)
      const { getFunctions, httpsCallable } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js'
      );

      const functions = getFunctions(firebaseApp.app);
      const createEmployee = httpsCallable(functions, 'createEmployeeAccount');

      const result = await createEmployee({
        email,
        displayName,
        password,
      });

      Logger.log(`✓ Employee account created via Cloud Function: ${email}`);

      return {
        success: true,
        uid: result.data.uid,
        message: result.data.message,
      };
    } catch (error) {
      Logger.error('Failed to create employee account:', error);

      let errorMessage = 'Ein Fehler ist aufgetreten';
      if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message;
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Keine Berechtigung';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

async deleteEmployeeAccount(email) {
    try {
      // Verify admin is logged in
      if (!this.isAdmin()) {
        throw new Error('Only admins can delete employee accounts');
      }

      // Call Cloud Function to delete account
      const { getFunctions, httpsCallable } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js'
      );

      const functions = getFunctions(firebaseApp.app);
      const deleteEmployee = httpsCallable(functions, 'deleteEmployeeAccount');

      const result = await deleteEmployee({ email });

      Logger.log(`✓ Employee account deleted via Cloud Function: ${email}`);

      return {
        success: true,
        message: result.data.message,
      };
    } catch (error) {
      Logger.error('Failed to delete employee account:', error);

      let errorMessage = 'Fehler beim Löschen des Accounts';
      if (error.code === 'functions/permission-denied') {
        errorMessage = 'Keine Berechtigung zum Löschen';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async resolveUserUid(email, displayName = null) {
    try {
      if (!this.isAdmin()) {
        throw new Error('Only admins can resolve user UIDs');
      }

      const { getFunctions, httpsCallable } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js'
      );

      const functions = getFunctions(firebaseApp.app);
      const resolve = httpsCallable(functions, 'resolveUserUid');
      const result = await resolve({ email, displayName });

      Logger.log(`✓ Resolved UID for ${email}: ${result.data.uid}`);
      return { success: true, uid: result.data.uid };
    } catch (error) {
      Logger.error(`Failed to resolve UID for ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await this.signOut(this.#auth);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send password reset email to user
   * @param {string} email - User's email address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async requestPasswordReset(email) {
    try {
      await this.sendPasswordResetEmail(this.#auth, email);
      Logger.log(`✓ Password reset email sent to: ${email}`);
      return { success: true };
    } catch (error) {
      Logger.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: this.#getErrorMessage(error.code),
      };
    }
  }

  /**
   * Change password for currently logged in user
   * Requires re-authentication with current password for security
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const user = this.#auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: 'Kein Benutzer angemeldet.',
        };
      }

      // Re-authenticate user before changing password (Firebase security requirement)
      const credential = this.EmailAuthProvider.credential(user.email, currentPassword);
      await this.reauthenticateWithCredential(user, credential);

      // Update password
      await this.updatePassword(user, newPassword);

      Logger.log(`✓ Password changed successfully for: ${user.email}`);
      return { success: true };
    } catch (error) {
      Logger.error('Failed to change password:', error);
      return {
        success: false,
        error: this.#getPasswordChangeErrorMessage(error.code),
      };
    }
  }

  #getPasswordChangeErrorMessage(errorCode) {
    const errorMessages = {
      'auth/wrong-password': 'Das aktuelle Passwort ist falsch.',
      'auth/invalid-credential': 'Das aktuelle Passwort ist falsch.',
      'auth/weak-password': 'Das neue Passwort ist zu schwach. Mindestens 6 Zeichen erforderlich.',
      'auth/requires-recent-login': 'Bitte melden Sie sich erneut an und versuchen Sie es noch einmal.',
      'auth/too-many-requests': 'Zu viele fehlgeschlagene Versuche. Bitte warten Sie einen Moment.',
    };

    return errorMessages[errorCode] || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }

  isAuthenticated() {
    return this.#currentUser !== null;
  }

  getCurrentUser() {
    return this.#currentUser;
  }

  getUserRole() {
    return this.#userRole;
  }

  isAdmin() {
    return this.#userRole === USER_ROLES.ADMIN;
  }

  isEmployee() {
    return this.#userRole === USER_ROLES.EMPLOYEE;
  }

  getLinkedNodeId() {
    return this.#linkedNodeId;
  }

  setLinkedNodeId(nodeId) {
    this.#linkedNodeId = nodeId;
    // Don't notify listeners - this is just a property update, not a full auth state change
    // Prevents infinite loop when linking employee to node
  }

  /**
   * SECURITY: Verify current user still exists in Firestore
   * Call this before showing sensitive screens (admin views, hierarchy, revenue)
   * Returns true if user is valid, false if deleted (will auto-logout)
   */
  async verifyCurrentUser() {
    if (!this.#currentUser) {
      return false;
    }

    const exists = await this.#verifyUserDocument(this.#currentUser.uid);
    if (!exists) {
      Logger.error('🔒 SECURITY VIOLATION: Current user document deleted - forcing logout');
      await this.logout();
      return false;
    }

    return true;
  }

  onAuthStateChange(callback) {
    this.#authStateListeners.push(callback);

    // Immediately call with current state if authenticated
    if (this.#currentUser) {
      callback({
        ...this.#currentUser,
        linkedNodeId: this.#linkedNodeId,
      });
    }

    // Return unsubscribe function
    return () => {
      const index = this.#authStateListeners.indexOf(callback);
      if (index > -1) {
        this.#authStateListeners.splice(index, 1);
      }
    };
  }

  #notifyAuthStateChange(user) {
    this.#authStateListeners.forEach((callback) => callback(user));
  }

  #getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Kein Benutzer mit dieser E-Mail gefunden.',
      'auth/wrong-password': 'Falsches Passwort.',
      'auth/email-already-in-use': 'E-Mail-Adresse wird bereits verwendet.',
      'auth/weak-password': 'Passwort muss mindestens 6 Zeichen lang sein.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
      'auth/network-request-failed':
        'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
      'auth/too-many-requests':
        'Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es später erneut.',
      'auth/user-disabled': 'Dieser Account wurde deaktiviert.',
      'auth/invalid-credential': 'Ungültige Anmeldedaten.',
    };

    return errorMessages[errorCode] || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }
}

// Singleton instance
export const authService = new AuthService();
