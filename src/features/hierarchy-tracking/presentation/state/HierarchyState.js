/**
 * State Management: HierarchyState
 * Central state container for hierarchy visualization
 */

export class HierarchyState {
  #listeners;
  #state;

  constructor() {
    this.#listeners = new Set();
    this.#state = {
      currentTree: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      expandedNodeIds: new Set(),
      searchQuery: '',
      filteredNodeIds: null,
      viewMode: 'tree',
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
      isLoading: false,
      error: null,
      isDragging: false,
      draggedNodeId: null,
      dropTargetId: null,
    };
  }

  get state() {
    return { ...this.#state };
  }

  get currentTree() {
    return this.#state.currentTree;
  }

  get selectedNodeId() {
    return this.#state.selectedNodeId;
  }

  get isLoading() {
    return this.#state.isLoading;
  }

  get error() {
    return this.#state.error;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((listener) => listener(this.#state));
  }

  #update(updates) {
    this.#state = { ...this.#state, ...updates };
    this.#notify();
  }

  setCurrentTree(tree) {
    const expandedNodeIds = new Set();
    if (tree) {
      tree.traverse((node) => {
        if (node.isExpanded) {
          expandedNodeIds.add(node.id);
        }
      });
    }

    this.#update({
      currentTree: tree,
      expandedNodeIds,
      selectedNodeId: null,
      searchQuery: '',
      filteredNodeIds: null,
      error: null,
    });
  }

  selectNode(nodeId) {
    this.#update({ selectedNodeId: nodeId });
  }

  deselectNode() {
    this.#update({ selectedNodeId: null });
  }

  hoverNode(nodeId) {
    this.#update({ hoveredNodeId: nodeId });
  }

  unhoverNode() {
    this.#update({ hoveredNodeId: null });
  }

  expandNode(nodeId) {
    const expandedNodeIds = new Set(this.#state.expandedNodeIds);
    expandedNodeIds.add(nodeId);
    this.#update({ expandedNodeIds });
  }

  collapseNode(nodeId) {
    const expandedNodeIds = new Set(this.#state.expandedNodeIds);
    expandedNodeIds.delete(nodeId);
    this.#update({ expandedNodeIds });
  }

  toggleNodeExpansion(nodeId) {
    if (this.#state.expandedNodeIds.has(nodeId)) {
      this.collapseNode(nodeId);
    } else {
      this.expandNode(nodeId);
    }
  }

  expandAll() {
    const expandedNodeIds = new Set();
    if (this.#state.currentTree) {
      this.#state.currentTree.traverse((node) => {
        expandedNodeIds.add(node.id);
      });
    }
    this.#update({ expandedNodeIds });
  }

  collapseAll() {
    this.#update({ expandedNodeIds: new Set() });
  }

  setSearchQuery(query) {
    let filteredNodeIds = null;

    if (query && query.trim() && this.#state.currentTree) {
      const lowerQuery = query.toLowerCase();
      filteredNodeIds = new Set();

      this.#state.currentTree.traverse((node) => {
        if (
          node.name.toLowerCase().includes(lowerQuery) ||
          node.description.toLowerCase().includes(lowerQuery)
        ) {
          filteredNodeIds.add(node.id);
          const ancestors = this.#state.currentTree.getAncestors(node.id);
          ancestors.forEach((a) => filteredNodeIds.add(a.id));
        }
      });
    }

    this.#update({ searchQuery: query, filteredNodeIds });
  }

  clearSearch() {
    this.#update({ searchQuery: '', filteredNodeIds: null });
  }

  setViewMode(mode) {
    if (['tree', 'list', 'chart'].includes(mode)) {
      this.#update({ viewMode: mode });
    }
  }

  setZoom(level) {
    const clampedLevel = Math.max(0.25, Math.min(2, level));
    this.#update({ zoomLevel: clampedLevel });
  }

  zoomIn() {
    this.setZoom(this.#state.zoomLevel + 0.1);
  }

  zoomOut() {
    this.setZoom(this.#state.zoomLevel - 0.1);
  }

  resetZoom() {
    this.#update({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
  }

  setPanOffset(x, y) {
    this.#update({ panOffset: { x, y } });
  }

  setLoading(isLoading) {
    this.#update({ isLoading });
  }

  setError(error) {
    this.#update({ error, isLoading: false });
  }

  clearError() {
    this.#update({ error: null });
  }

  startDrag(nodeId) {
    this.#update({ isDragging: true, draggedNodeId: nodeId });
  }

  setDropTarget(nodeId) {
    this.#update({ dropTargetId: nodeId });
  }

  endDrag() {
    this.#update({ isDragging: false, draggedNodeId: null, dropTargetId: null });
  }

  isNodeExpanded(nodeId) {
    return this.#state.expandedNodeIds.has(nodeId);
  }

  isNodeVisible(nodeId) {
    if (!this.#state.filteredNodeIds) {
      return true;
    }
    return this.#state.filteredNodeIds.has(nodeId);
  }

  reset() {
    this.#state = {
      currentTree: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      expandedNodeIds: new Set(),
      searchQuery: '',
      filteredNodeIds: null,
      viewMode: 'tree',
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
      isLoading: false,
      error: null,
      isDragging: false,
      draggedNodeId: null,
      dropTargetId: null,
    };
    this.#notify();
  }
}
