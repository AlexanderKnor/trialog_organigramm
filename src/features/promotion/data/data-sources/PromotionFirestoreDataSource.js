/**
 * Data Source: PromotionFirestoreDataSource
 * Persistence of campaigns and promo resources in Firestore (two collections,
 * one data source — the feature always loads both together). One-shot reads,
 * client-side sorting, same trade-offs as the other portal content.
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class PromotionFirestoreDataSource {
  #firestore = null;

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

  async findAll(collectionName) {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      const snapshot = await getDocs(collection(firestore, collectionName));
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(`Failed to load ${collectionName}: ${error.message}`);
    }
  }

  async findById(collectionName, docId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const snapshot = await getDoc(doc(firestore, collectionName, docId));
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw new StorageError(`Failed to load ${collectionName}/${docId}: ${error.message}`);
    }
  }

  async save(collectionName, data) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      await setDoc(doc(firestore, collectionName, data.id), {
        ...data,
        userId,
        serverUpdatedAt: serverTimestamp(),
      });

      return data;
    } catch (error) {
      throw new StorageError(`Failed to save to ${collectionName}: ${error.message}`);
    }
  }

  async delete(collectionName, docId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      await deleteDoc(doc(firestore, collectionName, docId));
    } catch (error) {
      throw new StorageError(`Failed to delete ${collectionName}/${docId}: ${error.message}`);
    }
  }

  get campaignsCollection() {
    return FIRESTORE_COLLECTIONS.PROMO_CAMPAIGNS;
  }

  get resourcesCollection() {
    return FIRESTORE_COLLECTIONS.PROMO_RESOURCES;
  }
}
