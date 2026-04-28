/**
 * Repository Implementation: FirebaseRevenueRepository
 * Implements IRevenueRepository using Firebase Firestore
 */

import { IRevenueRepository } from '../../domain/repositories/IRevenueRepository.js';
import { RevenueEntry } from '../../domain/entities/RevenueEntry.js';
import { Logger } from './../../../../core/utils/logger.js';

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

  async batchUpdateStatus(updates) {
    await this.#dataSource.batchUpdateStatus(updates);
  }

  async batchAddBilledRecipient(entryIds, field, recipientId) {
    await this.#dataSource.batchAddBilledRecipient(entryIds, field, recipientId);
  }

  async batchRemoveBilledRecipient(entryIds, field, recipientId) {
    await this.#dataSource.batchRemoveBilledRecipient(entryIds, field, recipientId);
  }

  async findByExtraordinaryGfId(gfId) {
    const data = await this.#dataSource.findByExtraordinaryGfId(gfId);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async getNextCustomerNumber(employeeId) {
    const maxNumber = await this.#dataSource.getMaxCustomerNumber(employeeId);
    return maxNumber + 1;
  }

  /**
   * Subscribe to real-time updates for revenue entries.
   * Uses docChanges() to extract only affected IDs instead of mapping the entire collection.
   * Callback receives { affectedEmployeeIds: Set, affectedTipProviderIds: Set, changeCount: number }
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
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          Logger.log('✓ Revenue listener initialized (skipping initial snapshot)');
          return;
        }

        const changes = snapshot.docChanges();
        if (changes.length === 0) return;

        // Extract affected IDs from changed docs only — no full collection mapping
        const affectedEmployeeIds = new Set();
        const affectedTipProviderIds = new Set();

        for (const change of changes) {
          const data = change.doc.data();
          if (data.employeeId) affectedEmployeeIds.add(data.employeeId);
          if (Array.isArray(data.tipProviders)) {
            for (const tp of data.tipProviders) {
              if (tp.id) affectedTipProviderIds.add(tp.id);
            }
          }
        }

        Logger.log(`🔄 Revenue change: ${changes.length} doc(s), employees: [${[...affectedEmployeeIds].join(', ')}]`);
        callback({ affectedEmployeeIds, affectedTipProviderIds, changeCount: changes.length });
      }, (error) => {
        Logger.error('Revenue real-time listener error:', error);
      });
    };

    return subscribeFunc();
  }
}
