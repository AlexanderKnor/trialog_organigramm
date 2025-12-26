/**
 * Repository Implementation: FirebaseRevenueRepository
 * Implements IRevenueRepository using Firebase Firestore
 */

import { IRevenueRepository } from '../../domain/repositories/IRevenueRepository.js';
import { RevenueEntry } from '../../domain/entities/RevenueEntry.js';

export class FirebaseRevenueRepository extends IRevenueRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findByEmployeeId(employeeId) {
    const data = await this.#dataSource.findByEmployeeId(employeeId);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async findById(entryId) {
    const data = await this.#dataSource.findById(entryId);
    return data ? RevenueEntry.fromJSON(data) : null;
  }

  async findAll() {
    const data = await this.#dataSource.findAll();
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async save(entry) {
    const data = entry.toJSON();
    await this.#dataSource.save(data);
    return entry;
  }

  async update(entry) {
    const data = entry.toJSON();
    await this.#dataSource.update(data);
    return entry;
  }

  async delete(entryId) {
    await this.#dataSource.delete(entryId);
  }

  async search(query) {
    const data = await this.#dataSource.search(query);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async findByTipProviderId(tipProviderId) {
    const data = await this.#dataSource.findByTipProviderId(tipProviderId);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async getNextCustomerNumber(employeeId) {
    const maxNumber = await this.#dataSource.getMaxCustomerNumber(employeeId);
    return maxNumber + 1;
  }

  /**
   * Subscribe to real-time updates for all revenue entries
   * Returns unsubscribe function
   */
  subscribeToRevenue(callback) {
    const subscribeFunc = async () => {
      const { firebaseApp } = await import('../../../../core/firebase/index.js');
      const { collection, onSnapshot } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      const { FIRESTORE_COLLECTIONS } = await import('../../../../core/config/firebase.config.js');

      const firestore = firebaseApp.firestore;
      const colRef = collection(firestore, FIRESTORE_COLLECTIONS.REVENUE_ENTRIES);

      let isFirstSnapshot = true;

      return onSnapshot(colRef, (snapshot) => {
        // Skip the first snapshot (initial data already loaded)
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          console.log('✓ Revenue listener initialized (skipping initial snapshot)');
          return;
        }

        const entries = snapshot.docs.map(doc => RevenueEntry.fromJSON(doc.data()));
        console.log(`🔄 Real-time update: ${entries.length} revenue entries (remote change)`);
        callback(entries);
      }, (error) => {
        console.error('Revenue real-time listener error:', error);
      });
    };

    return subscribeFunc();
  }
}
