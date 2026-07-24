/**
 * Data Source: TopicFirestoreDataSource
 * Persistence of one area's topic catalog in Firestore, parameterized by
 * collection name so both portal areas reuse it against their own collection.
 *
 * The catalog is always written as a whole (a handful of small documents), so
 * replaceAll uses a single write batch: saves and deletes land atomically and
 * a half-updated chip row cannot exist.
 */

import { firebaseApp } from '../../../core/firebase/index.js';
import { authService } from '../../../core/auth/index.js';
import { StorageError } from '../../../core/errors/index.js';

export class TopicFirestoreDataSource {
  #collectionName;
  #firestore = null;

  constructor(collectionName) {
    this.#collectionName = collectionName;
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

  async findAll() {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      const snapshot = await getDocs(collection(firestore, this.#collectionName));

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(`Failed to load topics (${this.#collectionName}): ${error.message}`);
    }
  }

  async replaceAll(topicsData, removedIds) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, writeBatch, serverTimestamp } = await this.#importFirestoreHelpers();

      const batch = writeBatch(firestore);

      topicsData.forEach((data) => {
        batch.set(doc(firestore, this.#collectionName, data.id), {
          ...data,
          userId,
          serverUpdatedAt: serverTimestamp(),
        });
      });

      removedIds.forEach((id) => {
        batch.delete(doc(firestore, this.#collectionName, id));
      });

      await batch.commit();
    } catch (error) {
      throw new StorageError(`Failed to save topics (${this.#collectionName}): ${error.message}`);
    }
  }
}
