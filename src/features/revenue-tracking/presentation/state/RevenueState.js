/**
 * State: RevenueState
 * Manages the state for revenue tracking
 */

export class RevenueState {
  #entries = [];
  #hierarchicalEntries = [];
  #companyEntries = [];
  #tipProviderEntries = [];
  #extraordinaryEntries = [];
  #selectedEmployeeId = null;
  #searchQuery = '';
  #isLoading = false;
  #error = null;
  #listeners = new Set();
  #batchDepth = 0;
  #pendingNotify = false;

  constructor() {
    this.#entries = [];
    this.#hierarchicalEntries = [];
    this.#companyEntries = [];
    this.#tipProviderEntries = [];
    this.#extraordinaryEntries = [];
  }

  get entries() {
    return [...this.#entries];
  }

  get hierarchicalEntries() {
    return [...this.#hierarchicalEntries];
  }

  get companyEntries() {
    return [...this.#companyEntries];
  }

  get tipProviderEntries() {
    return [...this.#tipProviderEntries];
  }

  get extraordinaryEntries() {
    return [...this.#extraordinaryEntries];
  }

  get selectedEmployeeId() {
    return this.#selectedEmployeeId;
  }

  get searchQuery() {
    return this.#searchQuery;
  }

  get isLoading() {
    return this.#isLoading;
  }

  get error() {
    return this.#error;
  }

  get filteredEntries() {
    if (!this.#searchQuery) {
      return this.#entries;
    }

    const query = this.#searchQuery.toLowerCase();
    return this.#entries.filter(
      (entry) =>
        entry.customerName.toLowerCase().includes(query) ||
        entry.contractNumber.toLowerCase().includes(query),
    );
  }

  get totalRevenue() {
    return this.#entries.reduce(
      (sum, entry) => sum + entry.provisionAmount,
      0,
    );
  }

  get totalHierarchicalProvision() {
    return this.#hierarchicalEntries.reduce(
      (sum, entry) => sum + entry.managerProvisionAmount,
      0,
    );
  }

  get totalCompanyProvision() {
    return this.#companyEntries.reduce(
      (sum, entry) => sum + entry.companyProvisionAmount,
      0,
    );
  }

  setSelectedEmployee(employeeId) {
    this.#selectedEmployeeId = employeeId;
    this.#notify();
  }

  setEntries(entries) {
    this.#entries = entries;
    this.#notify();
  }

  setHierarchicalEntries(entries) {
    this.#hierarchicalEntries = entries;
    this.#notify();
  }

  setCompanyEntries(entries) {
    this.#companyEntries = entries;
    this.#notify();
  }

  setTipProviderEntries(entries) {
    this.#tipProviderEntries = entries;
    this.#notify();
  }

  setExtraordinaryEntries(entries) {
    this.#extraordinaryEntries = entries;
    this.#notify();
  }

  setSearchQuery(query) {
    this.#searchQuery = query;
    this.#notify();
  }

  clearSearch() {
    this.#searchQuery = '';
    this.#notify();
  }

  setLoading(isLoading) {
    this.#isLoading = isLoading;
    this.#notify();
  }

  setError(error) {
    this.#error = error;
    this.#notify();
  }

  clearError() {
    this.#error = null;
    this.#notify();
  }

  addEntry(entry) {
    this.#entries = [...this.#entries, entry];
    this.#notify();
  }

  updateEntry(updatedEntry) {
    this.#entries = this.#entries.map((entry) =>
      entry.id === updatedEntry.id ? updatedEntry : entry,
    );
    this.#notify();
  }

  /**
   * Update an entry without triggering a re-render.
   * Used when the DOM was already updated in-place (e.g., row-level status change).
   */
  updateEntrySilent(updatedEntry) {
    this.#entries = this.#entries.map((entry) =>
      entry.id === updatedEntry.id ? updatedEntry : entry,
    );
  }

  removeEntry(entryId) {
    this.#entries = this.#entries.filter((entry) => entry.id !== entryId);
    this.#notify();
  }

  /**
   * Batch multiple state updates into a single notification.
   * Prevents 6-8 re-renders during #loadData() — collapses to exactly 1.
   */
  beginBatch() {
    this.#batchDepth++;
  }

  endBatch() {
    this.#batchDepth--;
    if (this.#batchDepth === 0 && this.#pendingNotify) {
      this.#pendingNotify = false;
      this.#notify();
    }
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get totalTipProviderProvision() {
    return this.#tipProviderEntries.reduce(
      (sum, entry) => sum + (entry.tipProviderProvisionAmount || 0),
      0,
    );
  }

  #notify() {
    if (this.#batchDepth > 0) {
      this.#pendingNotify = true;
      return;
    }

    const state = {
      entries: this.#entries,
      hierarchicalEntries: this.#hierarchicalEntries,
      companyEntries: this.#companyEntries,
      tipProviderEntries: this.#tipProviderEntries,
      extraordinaryEntries: this.#extraordinaryEntries,
      selectedEmployeeId: this.#selectedEmployeeId,
      searchQuery: this.#searchQuery,
      isLoading: this.#isLoading,
      error: this.#error,
    };

    this.#listeners.forEach((listener) => listener(state));
  }

  getState() {
    return {
      entries: this.#entries,
      hierarchicalEntries: this.#hierarchicalEntries,
      companyEntries: this.#companyEntries,
      tipProviderEntries: this.#tipProviderEntries,
      extraordinaryEntries: this.#extraordinaryEntries,
      selectedEmployeeId: this.#selectedEmployeeId,
      searchQuery: this.#searchQuery,
      isLoading: this.#isLoading,
      error: this.#error,
    };
  }
}
