/**
 * Data Source: CatalogFirestoreDataSource
 * Handles persistence of catalog data to Firebase Firestore
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';
import { Logger } from './../../../../core/utils/logger.js';

export class CatalogFirestoreDataSource {
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

      // Determine sort field based on entity type
      const sortField = entityType === 'category' ? 'displayName' : 'name';

      let q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
        where('entityType', '==', entityType),
        orderBy(sortField, 'asc')
      );

      if (!includeInactive) {
        q = query(
          collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
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

  async findByEntityTypeAndCategory(entityType, categoryType, includeInactive = false) {
    try {
      const firestore = this.#getFirestore();
      const { collection, query, where, orderBy, getDocs } = await this.#importFirestoreHelpers();

      // Products and providers use 'name' field for sorting
      const sortField = 'name';

      let q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
        where('entityType', '==', entityType),
        where('categoryType', '==', categoryType),
        orderBy(sortField, 'asc')
      );

      if (!includeInactive) {
        q = query(
          collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
          where('entityType', '==', entityType),
          where('categoryType', '==', categoryType),
          where('status', '==', 'active'),
          orderBy(sortField, 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(
        `Failed to load ${entityType} entries for category ${categoryType}: ${error.message}`
      );
    }
  }

  async findByEntityTypeAndProduct(entityType, productId, includeInactive = false) {
    try {
      const firestore = this.#getFirestore();
      const { collection, query, where, orderBy, getDocs } = await this.#importFirestoreHelpers();

      const sortField = 'name';

      let q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
        where('entityType', '==', entityType),
        where('productId', '==', productId),
        orderBy(sortField, 'asc')
      );

      if (!includeInactive) {
        q = query(
          collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG),
          where('entityType', '==', entityType),
          where('productId', '==', productId),
          where('status', '==', 'active'),
          orderBy(sortField, 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw new StorageError(
        `Failed to load ${entityType} entries for product ${productId}: ${error.message}`
      );
    }
  }

  async findById(docId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG, docId);
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

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG, data.id);

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

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG, docId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new StorageError(`Failed to delete document ${docId}: ${error.message}`);
    }
  }

  async batchSave(dataArray) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, writeBatch, serverTimestamp } = await this.#importFirestoreHelpers();

      // Firestore batch limit is 500 operations
      const BATCH_SIZE = 500;
      const batches = [];

      for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
        const chunk = dataArray.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(firestore);

        chunk.forEach((data) => {
          const docRef = doc(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG, data.id);
          batch.set(docRef, {
            ...data,
            userId,
            updatedAt: serverTimestamp(),
          });
        });

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      Logger.log(`✓ Batch saved ${dataArray.length} documents`);

      return dataArray;
    } catch (error) {
      throw new StorageError(`Failed to batch save documents: ${error.message}`);
    }
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  async subscribe(callback) {
    try {
      const firestore = this.#getFirestore();
      const { collection, onSnapshot } = await this.#importFirestoreHelpers();

      const colRef = collection(firestore, FIRESTORE_COLLECTIONS.PRODUCT_CATALOG);

      let isFirstSnapshot = true;

      return onSnapshot(
        colRef,
        (snapshot) => {
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            Logger.log('✓ Catalog real-time listener initialized');
            return;
          }

          Logger.log(`🔄 Catalog updated (${snapshot.size} documents)`);
          callback(snapshot);
        },
        (error) => {
          Logger.error('Catalog real-time listener error:', error);
        }
      );
    } catch (error) {
      throw new StorageError(`Failed to setup real-time listener: ${error.message}`);
    }
  }
}
