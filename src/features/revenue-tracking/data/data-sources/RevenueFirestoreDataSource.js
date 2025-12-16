/**
 * Data Source: RevenueFirestoreDataSource
 * Handles persistence of revenue entries to Firebase Firestore
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { authService } from '../../../../core/auth/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class RevenueFirestoreDataSource {
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

  async findByEmployeeId(employeeId) {
    try {
      const firestore = this.#getFirestore();
      const { collection, query, where, getDocs } = await this.#importFirestoreHelpers();

      // Load all entries for this employee (admins can see all employees' entries)
      const q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES),
        where('employeeId', '==', employeeId)
      );

      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map((doc) => doc.data());

      console.log(`✓ Loaded ${entries.length} revenue entries for employee ${employeeId}`);
      return entries;
    } catch (error) {
      throw new StorageError(`Failed to load revenue entries: ${error.message}`);
    }
  }

  async findById(entryId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES, entryId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      return null;
    } catch (error) {
      throw new StorageError(`Failed to load revenue entry: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      // Admins see ALL entries, employees see only their own (filtered in repository layer)
      // Load all entries here for flexibility
      const querySnapshot = await getDocs(
        collection(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES)
      );

      const entries = querySnapshot.docs.map((doc) => doc.data());

      console.log(`✓ Loaded ${entries.length} total revenue entries (all users)`);
      return entries;
    } catch (error) {
      throw new StorageError(`Failed to load all revenue entries: ${error.message}`);
    }
  }

  async save(entryData) {
    try {
      const firestore = this.#getFirestore();
      const userId = this.#getCurrentUserId();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES, entryData.id);

      await setDoc(docRef, {
        ...entryData,
        userId, // Add user isolation
        updatedAt: serverTimestamp(),
      });

      console.log(`✓ Revenue entry saved: ${entryData.id}`);
      return entryData;
    } catch (error) {
      throw new StorageError(`Failed to save revenue entry: ${error.message}`);
    }
  }

  async update(entryData) {
    try {
      const firestore = this.#getFirestore();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES, entryData.id);

      await setDoc(docRef, {
        ...entryData,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log(`✓ Revenue entry updated: ${entryData.id}`);
      return entryData;
    } catch (error) {
      throw new StorageError(`Failed to update revenue entry: ${error.message}`);
    }
  }

  async delete(entryId) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES, entryId);
      await deleteDoc(docRef);

      console.log(`✓ Revenue entry deleted: ${entryId}`);
    } catch (error) {
      throw new StorageError(`Failed to delete revenue entry: ${error.message}`);
    }
  }

  async search(searchQuery) {
    try {
      // For now, load all and filter client-side
      // TODO: Implement Firestore full-text search or Algolia integration
      const allEntries = await this.findAll();

      if (!searchQuery || searchQuery.trim() === '') {
        return allEntries;
      }

      const query = searchQuery.toLowerCase();

      return allEntries.filter((entry) => {
        return (
          entry.customerName?.toLowerCase().includes(query) ||
          entry.customerNumber?.toString().includes(query) ||
          entry.contractNumber?.toLowerCase().includes(query) ||
          entry.productProvider?.name?.toLowerCase().includes(query)
        );
      });
    } catch (error) {
      throw new StorageError(`Failed to search revenue entries: ${error.message}`);
    }
  }

  async getMaxCustomerNumber(employeeId) {
    try {
      const entries = await this.findByEmployeeId(employeeId);

      if (entries.length === 0) {
        return 0;
      }

      const customerNumbers = entries.map((e) => e.customerNumber || 0);
      return Math.max(...customerNumbers);
    } catch (error) {
      throw new StorageError(`Failed to get max customer number: ${error.message}`);
    }
  }
}
