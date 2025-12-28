/**
 * Data Source: FirestoreDataSource
 * Handles persistence to Firebase Firestore for hierarchy data
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { Logger } from './../../../../core/utils/logger.js';

export class FirestoreDataSource {
  #firestore = null;

  constructor() {
    // Firestore will be accessed via firebaseApp singleton
  }

  #getFirestore() {
    if (!this.#firestore) {
      this.#firestore = firebaseApp.firestore;
    }
    return this.#firestore;
  }

  #getCurrentUserId() {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  async #importFirestoreHelpers() {
    return await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  }

  async save(key, data) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES, key.replace('hierarchy_tree_', ''));

      await setDoc(docRef, {
        ...data,
        ownerId: userId,
        updatedAt: serverTimestamp(),
      });

      Logger.log(`✓ Saved to Firestore: ${key}`);
      return true;
    } catch (error) {
      Logger.error('Firestore save error:', error);
      throw error;
    }
  }

  async load(key) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES, key.replace('hierarchy_tree_', ''));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        Logger.log(`✓ Loaded from Firestore: ${key}`);
        return docSnap.data();
      }

      return null;
    } catch (error) {
      Logger.error('Firestore load error:', error);
      return null;
    }
  }

  async remove(key) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES, key.replace('hierarchy_tree_', ''));
      await deleteDoc(docRef);

      Logger.log(`✓ Removed from Firestore: ${key}`);
      return true;
    } catch (error) {
      Logger.error('Firestore remove error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES, key.replace('hierarchy_tree_', ''));
      const docSnap = await getDoc(docRef);

      return docSnap.exists();
    } catch (error) {
      Logger.error('Firestore exists error:', error);
      return false;
    }
  }

  async getAllKeys() {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      // Get ALL trees (employees can read admin trees for node linking)
      // Filtering happens in the app layer based on role
      const querySnapshot = await getDocs(
        collection(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES)
      );

      const keys = querySnapshot.docs.map((doc) => `hierarchy_tree_${doc.id}`);

      Logger.log(`✓ Found ${keys.length} trees in Firestore`);
      return keys;
    } catch (error) {
      Logger.error('Firestore getAllKeys error:', error);
      return [];
    }
  }

  async clear() {
    try {
      const keys = await this.getAllKeys();
      const deletePromises = keys.map((key) => this.remove(key));
      await Promise.all(deletePromises);

      Logger.log(`✓ Cleared ${keys.length} trees from Firestore`);
    } catch (error) {
      Logger.error('Firestore clear error:', error);
    }
  }

  // Not implemented for Firestore (browser storage specific)
  getStorageSize() {
    return 0;
  }
}
