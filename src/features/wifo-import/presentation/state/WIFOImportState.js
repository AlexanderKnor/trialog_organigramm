/**
 * State: WIFOImportState
 * Manages the state for WIFO import feature
 */

export class WIFOImportState {
  #state;
  #subscribers;

  constructor() {
    this.#state = {
      currentBatch: null,
      recentBatches: [],
      isLoading: false,
      isUploading: false,
      isValidating: false,
      isImporting: false,
      uploadProgress: 0,
      validationProgress: 0,
      importProgress: 0,
      progressMessage: '',
      error: null,
      selectedRecordIds: new Set(),
      filterStatus: 'all', // all, valid, invalid, warning
      searchQuery: '',
    };
    this.#subscribers = [];
  }

  // State getters
  get currentBatch() {
    return this.#state.currentBatch;
  }

  get recentBatches() {
    return this.#state.recentBatches;
  }

  get isLoading() {
    return this.#state.isLoading;
  }

  get isUploading() {
    return this.#state.isUploading;
  }

  get isValidating() {
    return this.#state.isValidating;
  }

  get isImporting() {
    return this.#state.isImporting;
  }

  get uploadProgress() {
    return this.#state.uploadProgress;
  }

  get validationProgress() {
    return this.#state.validationProgress;
  }

  get importProgress() {
    return this.#state.importProgress;
  }

  get progressMessage() {
    return this.#state.progressMessage;
  }

  get error() {
    return this.#state.error;
  }

  get selectedRecordIds() {
    return this.#state.selectedRecordIds;
  }

  get filterStatus() {
    return this.#state.filterStatus;
  }

  get searchQuery() {
    return this.#state.searchQuery;
  }

  get isProcessing() {
    return this.#state.isUploading || this.#state.isValidating || this.#state.isImporting;
  }

  // Filtered records based on current filter
  get filteredRecords() {
    const batch = this.#state.currentBatch;
    if (!batch) return [];

    let records = batch.records;

    // Apply status filter
    switch (this.#state.filterStatus) {
      case 'valid':
        records = records.filter((r) => r.validationStatus.isValid);
        break;
      case 'invalid':
        records = records.filter((r) => r.validationStatus.isInvalid);
        break;
      case 'warning':
        records = records.filter((r) => r.validationStatus.hasWarning);
        break;
      case 'importable':
        records = records.filter((r) => r.canImport);
        break;
    }

    // Apply search query
    if (this.#state.searchQuery) {
      const query = this.#state.searchQuery.toLowerCase();
      records = records.filter((r) => {
        const searchFields = [
          r.vermittlerName,
          r.kundeNachname,
          r.kundeVorname,
          r.vertrag,
          r.gesellschaft,
        ];
        return searchFields.some((f) => f?.toLowerCase().includes(query));
      });
    }

    return records;
  }

  // State setters with notification
  setCurrentBatch(batch) {
    this.#state.currentBatch = batch;
    this.#notify();
  }

  setRecentBatches(batches) {
    this.#state.recentBatches = batches;
    this.#notify();
  }

  setLoading(isLoading) {
    this.#state.isLoading = isLoading;
    this.#notify();
  }

  setUploading(isUploading, progress = 0, message = '') {
    this.#state.isUploading = isUploading;
    this.#state.uploadProgress = progress;
    this.#state.progressMessage = message;
    this.#notify();
  }

  setValidating(isValidating, progress = 0, message = '') {
    this.#state.isValidating = isValidating;
    this.#state.validationProgress = progress;
    this.#state.progressMessage = message;
    this.#notify();
  }

  setImporting(isImporting, progress = 0, message = '') {
    this.#state.isImporting = isImporting;
    this.#state.importProgress = progress;
    this.#state.progressMessage = message;
    this.#notify();
  }

  setError(error) {
    this.#state.error = error;
    this.#notify();
  }

  clearError() {
    this.#state.error = null;
    this.#notify();
  }

  setFilterStatus(status) {
    this.#state.filterStatus = status;
    this.#notify();
  }

  setSearchQuery(query) {
    this.#state.searchQuery = query;
    this.#notify();
  }

  toggleRecordSelection(recordId) {
    if (this.#state.selectedRecordIds.has(recordId)) {
      this.#state.selectedRecordIds.delete(recordId);
    } else {
      this.#state.selectedRecordIds.add(recordId);
    }
    this.#notify();
  }

  selectAllRecords() {
    const batch = this.#state.currentBatch;
    if (!batch) return;

    for (const record of batch.records) {
      if (record.canImport) {
        this.#state.selectedRecordIds.add(record.id);
      }
    }
    this.#notify();
  }

  deselectAllRecords() {
    this.#state.selectedRecordIds.clear();
    this.#notify();
  }

  reset() {
    this.#state.currentBatch = null;
    this.#state.isLoading = false;
    this.#state.isUploading = false;
    this.#state.isValidating = false;
    this.#state.isImporting = false;
    this.#state.uploadProgress = 0;
    this.#state.validationProgress = 0;
    this.#state.importProgress = 0;
    this.#state.progressMessage = '';
    this.#state.error = null;
    this.#state.selectedRecordIds.clear();
    this.#state.filterStatus = 'all';
    this.#state.searchQuery = '';
    this.#notify();
  }

  // Subscription
  subscribe(callback) {
    this.#subscribers.push(callback);
    return () => {
      const index = this.#subscribers.indexOf(callback);
      if (index > -1) {
        this.#subscribers.splice(index, 1);
      }
    };
  }

  #notify() {
    for (const callback of this.#subscribers) {
      callback(this.#state);
    }
  }
}
