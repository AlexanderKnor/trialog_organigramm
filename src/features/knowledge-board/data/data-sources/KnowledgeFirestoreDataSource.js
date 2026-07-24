/**
 * Data Source: KnowledgeFirestoreDataSource
 * Handles persistence of knowledge board data to Firebase Firestore
 *
 * One-shot reads only, deliberately unlike CatalogFirestoreDataSource: that one
 * subscribes to its whole collection, which is affordable behind an admin route
 * but not on the shared landing page, where every employee would hold the
 * listener for their entire session. The board reloads after each admin write,
 * which is all the freshness knowledge that changes weekly needs.
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class KnowledgeFirestoreDataSource {
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

  // ========================================
  // QUERY OPERATIONS
  // ========================================

  async findByEntityType(entityType, includeInactive = false) {
    try {
      const firestore = this.#getFirestore();
      const { collection, query, where, orderBy, getDocs } = await this.#importFirestoreHelpers();

      const sortField = entityType === 'knowledge_category' ? 'displayName' : 'title';

      let q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_BOARD),
        where('entityType', '==', entityType),
        orderBy(sortField, 'asc')
      );

      if (!includeInactive) {
        q = query(
          collection(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_BOARD),
          where('entityType', '==', entityType),
          where('status', '==', 'active'),
          orderBy(sortField, 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(`Failed to load ${entityType} entries: ${error.message}`);
    }
  }

  async findById(docId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_BOARD, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      return null;
    } catch (error) {
      throw new StorageError(`Failed to load document ${docId}: ${error.message}`);
    }
  }

  // ========================================
  // WRITE OPERATIONS
  // ========================================

  async save(data) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_BOARD, data.id);

      // updatedAt is stamped server-side and comes back as a Timestamp, not the
      // ISO string the entity wrote. Nothing reads it — freshness lives in the
      // separate lastReviewedAt field precisely to stay clear of this.
      await setDoc(docRef, {
        ...data,
        userId,
        updatedAt: serverTimestamp(),
      });

      return data;
    } catch (error) {
      throw new StorageError(`Failed to save document: ${error.message}`);
    }
  }

  async delete(docId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.KNOWLEDGE_BOARD, docId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new StorageError(`Failed to delete document ${docId}: ${error.message}`);
    }
  }
}
