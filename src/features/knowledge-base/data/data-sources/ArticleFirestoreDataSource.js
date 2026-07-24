/**
 * Data Source: ArticleFirestoreDataSource
 * Persistence of knowledge base articles in Firestore.
 *
 * One-shot reads, no listeners — same trade-off as the knowledge board: content
 * that changes weekly does not justify holding a collection listener for every
 * employee's whole session. Sorting happens client-side so the small collection
 * needs no composite indexes.
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class ArticleFirestoreDataSource {
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
        collection(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_ARTICLES)
      );

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(`Failed to load knowledge articles: ${error.message}`);
    }
  }

  async findById(articleId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const snapshot = await getDoc(
        doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_ARTICLES, articleId)
      );

      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw new StorageError(`Failed to load article ${articleId}: ${error.message}`);
    }
  }

  async save(data) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      // updatedAt stays the entity's ISO string so it round-trips through
      // fromJSON; the server clock lands in a separate audit-only field.
      await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_ARTICLES, data.id), {
        ...data,
        userId,
        serverUpdatedAt: serverTimestamp(),
      });

      return data;
    } catch (error) {
      throw new StorageError(`Failed to save article: ${error.message}`);
    }
  }

  async delete(articleId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_ARTICLES, articleId));
    } catch (error) {
      throw new StorageError(`Failed to delete article ${articleId}: ${error.message}`);
    }
  }
}
