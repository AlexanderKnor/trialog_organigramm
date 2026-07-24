/**
 * Data Source: VideoFirestoreDataSource
 * Persistence of learning videos in Firestore. One-shot reads, client-side
 * sorting — same trade-offs as the knowledge base articles.
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class VideoFirestoreDataSource {
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

  async findAll() {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      const snapshot = await getDocs(
        collection(firestore, FIRESTORE_COLLECTIONS.LEARNING_VIDEOS)
      );

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(`Failed to load learning videos: ${error.message}`);
    }
  }

  async findById(videoId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const snapshot = await getDoc(
        doc(firestore, FIRESTORE_COLLECTIONS.LEARNING_VIDEOS, videoId)
      );

      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw new StorageError(`Failed to load video ${videoId}: ${error.message}`);
    }
  }

  async save(data) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.LEARNING_VIDEOS, data.id), {
        ...data,
        userId,
        serverUpdatedAt: serverTimestamp(),
      });

      return data;
    } catch (error) {
      throw new StorageError(`Failed to save video: ${error.message}`);
    }
  }

  async delete(videoId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.LEARNING_VIDEOS, videoId));
    } catch (error) {
      throw new StorageError(`Failed to delete video ${videoId}: ${error.message}`);
    }
  }
}
