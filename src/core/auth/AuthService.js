/**
 * Authentication Service
 * Handles user authentication, session management, and role-based access
 */

import { firebaseApp } from '../firebase/FirebaseApp.js';
import { FIRESTORE_COLLECTIONS } from '../config/firebase.config.js';

// Admin emails - these users have full access
const ADMIN_EMAILS = [
  'marcel.liebetrau@trialog.de',
  'marcel@trialog.de',
  'daniel.lippa@trialog.de',
  'daniel@trialog.de',
  'alexander-knor@outlook.de',
  // Add more admin emails as needed
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
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    this.signInWithEmailAndPassword = signInWithEmailAndPassword;
    this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
    this.signOut = signOut;

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

    console.log('✓ AuthService initialized');
  }

  async #handleAuthStateChange(user) {
    try {
      // Determine user role
      const role = this.#determineUserRole(user.email);

      // Update or create user document
      await this.#updateUserDocument(user, role);

      // For employees, try to link to HierarchyNode
      let linkedNodeId = null;
      if (role === USER_ROLES.EMPLOYEE) {
        linkedNodeId = await this.#findLinkedNode(user.email);
      }

      this.#currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role,
      };

      this.#userRole = role;
      this.#linkedNodeId = linkedNodeId;

      console.log(`✓ User authenticated: ${user.email} (${role})`);
      if (linkedNodeId) {
        console.log(`✓ Linked to node: ${linkedNodeId}`);
      }

      // Notify listeners
      this.#notifyAuthStateChange({
        ...this.#currentUser,
        linkedNodeId,
      });
    } catch (error) {
      console.error('Error handling auth state change:', error);
    }
  }

  #determineUserRole(email) {
    const normalizedEmail = email.toLowerCase();
    return ADMIN_EMAILS.some((adminEmail) =>
      normalizedEmail.includes(adminEmail.toLowerCase())
    )
      ? USER_ROLES.ADMIN
      : USER_ROLES.EMPLOYEE;
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
        console.log('✓ User document created');
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
        console.log('✓ User document updated');
      }
    } catch (error) {
      console.error('Failed to update user document:', error);
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

      // User document will be created by auth state change handler
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

      console.log(`✓ Employee account created via Cloud Function: ${email}`);

      return {
        success: true,
        uid: result.data.uid,
        message: result.data.message,
      };
    } catch (error) {
      console.error('Failed to create employee account:', error);

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
