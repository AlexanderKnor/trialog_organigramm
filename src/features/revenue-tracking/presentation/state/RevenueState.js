/**
 * State: RevenueState
 * Manages the state for revenue tracking
 */

export class RevenueState {
  #entries = [];
  #hierarchicalEntries = [];
  #companyEntries = [];
  #selectedEmployeeId = null;
  #searchQuery = '';
  #isLoading = false;
  #error = null;
  #listeners = new Set();

  constructor() {
    this.#entries = [];
    this.#hierarchicalEntries = [];
    this.#companyEntries = [];
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

  removeEntry(entryId) {
    this.#entries = this.#entries.filter((entry) => entry.id !== entryId);
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    const state = {
      entries: this.#entries,
      hierarchicalEntries: this.#hierarchicalEntries,
      companyEntries: this.#companyEntries,
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
      selectedEmployeeId: this.#selectedEmployeeId,
      searchQuery: this.#searchQuery,
      isLoading: this.#isLoading,
      error: this.#error,
    };
  }
}
