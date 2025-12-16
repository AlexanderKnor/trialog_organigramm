/**
 * Screen: HierarchyScreen
 * Main screen for hierarchy visualization and management
 */

import { createElement, clearElement, getElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { APP_CONFIG } from '../../../../core/config/app.config.js';
import { HierarchyState } from '../state/HierarchyState.js';
import { OrganigrammView } from '../components/organisms/OrganigrammView.js';
import { Sidebar } from '../components/organisms/Sidebar.js';
import { NodeEditor } from '../components/molecules/NodeEditor.js';
import { HierarchyNode } from '../../domain/entities/HierarchyNode.js';
import { NODE_TYPES } from '../../domain/value-objects/NodeType.js';

export class HierarchyScreen {
  #element;
  #container;
  #hierarchyService;
  #revenueService;
  #state;
  #orgView;
  #sidebar;
  #unsubscribe;
  #unsubscribeTreeListener;
  #unsubscribeRevenueListener;
  #currentTreeId;

  constructor(container, hierarchyService, revenueService = null) {
    this.#container = typeof container === 'string' ? getElement(container) : container;
    this.#hierarchyService = hierarchyService;
    this.#revenueService = revenueService;
    this.#state = new HierarchyState();
    this.#currentTreeId = null;

    this.#element = this.#render();
    this.#setupSubscriptions();
  }

  #render() {
    const header = this.#createHeader();

    this.#orgView = new OrganigrammView({
      tree: null,
      state: this.#state,
      onNodeSelect: (nodeId) => this.#handleNodeSelect(nodeId),
      onAddChild: (parentId) => this.#handleAddNode(parentId),
    });

    this.#sidebar = new Sidebar({
      onClose: () => this.#state.deselectNode(),
      onSave: (nodeId, data) => this.#handleNodeSave(nodeId, data),
      onDelete: (nodeId) => this.#handleNodeDelete(nodeId),
      onAddChild: (parentId) => this.#handleAddNode(parentId),
    });

    const mainContent = createElement('div', { className: 'main-content' }, [
      createElement('div', { className: 'tree-wrapper' }, [this.#orgView.element]),
      this.#sidebar.element,
    ]);

    return createElement('div', { className: 'hierarchy-screen' }, [
      header,
      mainContent,
    ]);
  }

  #createHeader() {
    const user = authService.getCurrentUser();
    const userEmail = user?.email || 'User';
    const userRole = user?.role || '';

    return createElement('header', { className: 'app-header' }, [
      createElement('div', { className: 'header-date' }),
      createElement('div', { className: 'header-logo' }, [
        createElement('span', { className: 'logo-text' }, ['Trialog']),
        createElement('span', { className: 'logo-divider' }, ['·']),
        createElement('span', { className: 'logo-subtext' }, ['Organigramm']),
      ]),
      createElement('nav', { className: 'header-nav' }, [
        createElement('span', { className: 'user-email' }, [
          userEmail,
          userRole === 'admin'
            ? createElement('span', { className: 'user-badge' }, ['Admin'])
            : null,
        ].filter(Boolean)),
        createElement('button', {
          className: 'btn-logout',
          onclick: () => this.#handleLogout(),
          title: 'Abmelden',
        }, ['Abmelden']),
      ]),
    ]);
  }

  async #handleLogout() {
    const confirmed = window.confirm('Möchten Sie sich wirklich abmelden?');
    if (confirmed) {
      await authService.logout();
      // Auth state change will trigger redirect to login
    }
  }

  #setupSubscriptions() {
    this.#unsubscribe = this.#state.subscribe((state) => {
      this.#handleStateChange(state);
    });
  }

  #handleStateChange(state) {
    // Handle sidebar visibility based on selection
    if (state.selectedNodeId) {
      // Check both tree and Geschäftsführer nodes
      if (this.#orgView.hasNode(state.selectedNodeId)) {
        const node = this.#orgView.getNode(state.selectedNodeId);
        // Always open sidebar for selected node (in view mode)
        // This also handles switching from edit mode when clicking another card
        this.#sidebar.openWithNode(node, 'view');
      }
    } else {
      this.#sidebar.hide();
      // Clear visual selection when deselected
      this.#orgView.updateNodeSelection(null);
    }
  }

  async #handleNodeSelect(nodeId) {
    this.#state.selectNode(nodeId);
    this.#orgView.updateNodeSelection(nodeId);
  }

  async #handleNodeEdit(nodeId) {
    const tree = this.#state.currentTree;
    if (!tree || !tree.hasNode(nodeId)) return;

    const node = tree.getNode(nodeId);

    // Update state and visual selection
    this.#state.selectNode(nodeId);
    this.#orgView.updateNodeSelection(nodeId);

    // Open sidebar directly in edit mode (single render)
    this.#sidebar.openWithNode(node, 'edit');
  }

  async #handleNodeSave(nodeId, data) {
    try {
      await this.#hierarchyService.updateNode(this.#currentTreeId, nodeId, data);
      await this.#refreshTree();
    } catch (error) {
      console.error('Failed to save node:', error);
      this.#state.setError(error.message);
    }
  }

  async #handleNodeDelete(nodeId) {
    const confirmed = window.confirm('Möchten Sie dieses Element wirklich löschen?');
    if (!confirmed) return;

    try {
      await this.#hierarchyService.removeNode(this.#currentTreeId, nodeId);
      this.#state.deselectNode();
      await this.#refreshTree();
    } catch (error) {
      console.error('Failed to delete node:', error);
      this.#state.setError(error.message);
    }
  }

  async #handleNodeMove(nodeId, targetId) {
    if (nodeId === targetId) return;

    try {
      await this.#hierarchyService.moveNode(this.#currentTreeId, nodeId, targetId);
      await this.#refreshTree();
    } catch (error) {
      console.error('Failed to move node:', error);
      this.#state.setError(error.message);
    }
  }

  async #handleAddNode(parentId = null) {
    const tree = this.#state.currentTree;

    if (!tree && !parentId) {
      await this.#createNewTree();
      return;
    }

    const targetParentId = parentId || this.#state.selectedNodeId || tree?.rootId;

    if (!targetParentId) {
      this.#showNewNodeDialog(null);
      return;
    }

    this.#showNewNodeDialog(targetParentId);
  }

  #showNewNodeDialog(parentId) {
    const dialog = createElement('div', { className: 'dialog-overlay' });
    const isAddingEmployee = parentId !== null;
    const dialogTitle = isAddingEmployee ? 'Mitarbeiter hinzufügen' : 'Organisation erstellen';

    const editor = new NodeEditor(null, {
      onSave: async (data) => {
        try {
          if (!this.#currentTreeId) {
            const tree = await this.#hierarchyService.createTree(
              'Trialog Strukturplan',
              'Organisationsstruktur der Trialog Maklergruppe GmbH',
            );
            this.#currentTreeId = tree.id;

            await this.#hierarchyService.addNode(
              this.#currentTreeId,
              { ...data, type: NODE_TYPES.ROOT },
              null,
            );
          } else {
            // Default to PERSON type when adding employees
            const nodeData = {
              ...data,
              type: isAddingEmployee ? NODE_TYPES.PERSON : data.type,
            };
            await this.#hierarchyService.addNode(this.#currentTreeId, nodeData, parentId);
          }

          dialog.remove();
          await this.#refreshTree();
        } catch (error) {
          console.error('Failed to add node:', error);
        }
      },
      onCancel: () => dialog.remove(),
    });

    const dialogContent = createElement('div', { className: 'dialog-content' }, [
      createElement('h2', { className: 'dialog-title' }, [dialogTitle]),
      editor.element,
    ]);

    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    editor.focus();
  }

  async #createNewTree() {
    this.#showNewNodeDialog(null);
  }

  async #handleExport() {
    const tree = this.#state.currentTree;
    if (!tree) return;

    try {
      const json = await this.#hierarchyService.exportTree(tree);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `strukturplan-${tree.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  async #handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const content = await file.text();
        const tree = await this.#hierarchyService.importTree(content);
        this.#currentTreeId = tree.id;
        await this.#refreshTree();
      } catch (error) {
        console.error('Import failed:', error);
        this.#state.setError('Import fehlgeschlagen: ' + error.message);
      }
    };

    input.click();
  }

  async #refreshTree() {
    if (!this.#currentTreeId) return;

    // Unsubscribe from previous tree listener if exists
    if (this.#unsubscribeTreeListener) {
      this.#unsubscribeTreeListener();
      this.#unsubscribeTreeListener = null;
    }

    try {
      let tree = await this.#hierarchyService.getTree(this.#currentTreeId);

      // Set up real-time listener for this tree
      try {
        this.#unsubscribeTreeListener = await this.#hierarchyService.subscribeToTreeUpdates(
          this.#currentTreeId,
          (updatedTree) => {
            if (updatedTree) {
              console.log('🔄 Real-time tree update received');
              this.#handleTreeUpdate(updatedTree);
            }
          }
        );
        console.log('✓ Real-time listener active for tree:', this.#currentTreeId);
      } catch (error) {
        console.warn('⚠ Failed to set up real-time listener:', error);
        // Continue without real-time sync
      }

      // Set up real-time listener for revenue entries
      if (this.#revenueService) {
        try {
          this.#unsubscribeRevenueListener = await this.#revenueService.subscribeToRevenueUpdates(
            async () => {
              console.log('🔄 Real-time revenue update received');
              await this.#reloadRevenueData();
            }
          );
          console.log('✓ Real-time revenue listener active');
        } catch (error) {
          console.warn('⚠ Failed to set up revenue listener:', error);
        }
      }

      // For employees: filter tree to show only their subtree
      if (authService.isEmployee()) {
        const linkedNodeId = authService.getLinkedNodeId();
        console.log(`🔍 Employee filter check: linkedNodeId = ${linkedNodeId}`);

        if (linkedNodeId) {
          console.log(`  Tree has ${tree.getAllNodes().length} nodes`);
          console.log(`  Tree has node ${linkedNodeId}? ${tree.hasNode(linkedNodeId)}`);

          if (tree.hasNode(linkedNodeId)) {
            // Create a filtered view showing only the employee's subtree
            tree = this.#createEmployeeSubtree(tree, linkedNodeId);
            console.log(`✓ Filtered tree for employee (starting from: ${linkedNodeId})`);
          } else {
            console.warn(`⚠ Employee linked node ${linkedNodeId} not in this tree`);
            tree = null;
          }
        } else {
          console.warn('⚠ Employee has no linked node - showing empty tree');
          // Show empty tree if no link
          tree = null;
        }
      }

      this.#state.setCurrentTree(tree);

      // Fetch revenue data for all employees (current month)
      let revenueDataMap = new Map();
      if (this.#revenueService && tree) {
        const now = new Date();
        revenueDataMap = await this.#revenueService.getRevenueDataForTree(
          this.#currentTreeId,
          now.getMonth(),
          now.getFullYear(),
        );
      }

      this.#orgView.setState(this.#state);
      this.#orgView.setRevenueDataMap(revenueDataMap);
      this.#orgView.setTree(tree); // setTree already renders, no need for refresh()
      this.#sidebar.setTreeId(this.#currentTreeId);
      this.#sidebar.setTree(tree);
    } catch (error) {
      console.error('Failed to refresh tree:', error);
    }
  }

  #createEmployeeSubtree(fullTree, employeeNodeId) {
    // For employees: show tree starting from their node
    // We'll pass the filtered root to OrganigrammView via a custom property

    // Mark which node should be treated as root for rendering
    fullTree._employeeRootNodeId = employeeNodeId;
    fullTree._isEmployeeView = true;

    console.log(`✓ Employee subtree created (root: ${employeeNodeId})`);
    return fullTree;
  }

  async #handleTreeUpdate(updatedTree) {
    try {
      // Filter for employees if needed
      if (authService.isEmployee()) {
        const linkedNodeId = authService.getLinkedNodeId();
        if (linkedNodeId && updatedTree.hasNode(linkedNodeId)) {
          updatedTree = this.#createEmployeeSubtree(updatedTree, linkedNodeId);
        }
      }

      this.#state.setCurrentTree(updatedTree);

      // Reload revenue data
      await this.#reloadRevenueData();

      // Update UI
      this.#orgView.setState(this.#state);
      this.#orgView.setTree(updatedTree);
      this.#sidebar.setTree(updatedTree);

      console.log('✓ UI updated with real-time tree changes');
    } catch (error) {
      console.error('Failed to handle tree update:', error);
    }
  }

  async #reloadRevenueData() {
    try {
      let revenueDataMap = new Map();
      if (this.#revenueService && this.#currentTreeId) {
        const now = new Date();
        revenueDataMap = await this.#revenueService.getRevenueDataForTree(
          this.#currentTreeId,
          now.getMonth(),
          now.getFullYear(),
        );
      }

      // Update organigramm with new revenue data
      this.#orgView.setRevenueDataMap(revenueDataMap);

      console.log('✓ Revenue data updated');
    } catch (error) {
      console.error('Failed to reload revenue data:', error);
    }
  }

  #showLoadingState() {
    // Show loading spinner in the tree wrapper
    const treeWrapper = this.#element.querySelector('.tree-wrapper');
    if (treeWrapper) {
      treeWrapper.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem;">
          <div class="loading-spinner"></div>
          <p style="color: #64748b; font-size: 0.9375rem;">Organigramm wird geladen...</p>
        </div>
      `;
    }
  }

  async mount() {
    clearElement(this.#container);
    this.#container.appendChild(this.#element);

    try {
      // Single Tree Policy: Check if any tree exists
      const allTrees = await this.#hierarchyService.getAllTrees();

      if (allTrees.length > 0) {
        // Load the existing tree (should only be one)
        this.#currentTreeId = allTrees[0].id;
        console.log(`✓ Loading THE organization tree: ${this.#currentTreeId}`);

        if (allTrees.length > 1) {
          console.warn(`⚠ ${allTrees.length} trees found - should only be 1!`);
        }

        await this.#refreshTree();
      } else {
        // Create THE organization tree
        console.log('✓ No tree exists - creating THE organization tree');
        await this.#initializeTrialogStructure();
      }
    } catch (error) {
      console.error('Failed to load tree:', error);
      // Fallback: try to initialize
      try {
        await this.#initializeTrialogStructure();
      } catch (initError) {
        console.error('Failed to initialize tree:', initError);
      }
    }
  }

  async #initializeTrialogStructure() {
    try {
      const tree = await this.#hierarchyService.createTree(
        'Trialog Strukturplan',
        'Organisationsstruktur der Trialog Maklergruppe GmbH',
      );
      this.#currentTreeId = tree.id;

      // Create Trialog as root node
      await this.#hierarchyService.addNode(
        this.#currentTreeId,
        {
          name: 'Trialog Maklergruppe GmbH',
          description: 'Hauptorganisation',
          type: NODE_TYPES.ROOT,
        },
        null,
      );

      await this.#refreshTree();
    } catch (error) {
      console.error('Failed to initialize Trialog structure:', error);
    }
  }

  unmount() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
    }
    if (this.#unsubscribeTreeListener) {
      this.#unsubscribeTreeListener();
      console.log('✓ Real-time tree listener unsubscribed');
    }
    if (this.#unsubscribeRevenueListener) {
      this.#unsubscribeRevenueListener();
      console.log('✓ Real-time revenue listener unsubscribed');
    }
    clearElement(this.#container);
  }

  get state() {
    return this.#state;
  }
}
