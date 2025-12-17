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
  #updateTimeout;
  #isUpdating;
  #zoomLevel;
  #zoomControls;
  #keyboardHandler;

  constructor(container, hierarchyService, revenueService = null) {
    this.#container = typeof container === 'string' ? getElement(container) : container;
    this.#hierarchyService = hierarchyService;
    this.#revenueService = revenueService;
    this.#state = new HierarchyState();
    this.#currentTreeId = null;
    this.#updateTimeout = null;
    this.#isUpdating = false;
    this.#zoomLevel = 1.0;

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

    // Zoom controls
    this.#zoomControls = this.#createZoomControls();

    return createElement('div', { className: 'hierarchy-screen' }, [
      header,
      mainContent,
      this.#zoomControls,
    ]);
  }

  #createZoomControls() {
    const zoomLevelDisplay = createElement('div', { className: 'zoom-level' }, [
      createElement('span', { className: 'zoom-level-value' }, ['100%']),
    ]);

    const zoomInBtn = createElement('button', {
      className: 'zoom-btn zoom-in-btn',
      title: 'Vergrößern (Strg +)',
      onclick: () => this.#handleZoomIn(),
    }, ['+']);

    const zoomOutBtn = createElement('button', {
      className: 'zoom-btn zoom-out-btn',
      title: 'Verkleinern (Strg -)',
      onclick: () => this.#handleZoomOut(),
    }, ['-']);

    const zoomResetBtn = createElement('button', {
      className: 'zoom-reset',
      title: 'Zurücksetzen (Strg 0)',
      onclick: () => this.#handleZoomReset(),
    }, ['Reset']);

    const buttonsContainer = createElement('div', { className: 'zoom-controls-container' }, [
      zoomInBtn,
      zoomOutBtn,
    ]);

    return createElement('div', { className: 'zoom-controls' }, [
      buttonsContainer,
      zoomLevelDisplay,
      zoomResetBtn,
    ]);
  }

  #handleZoomIn() {
    this.#setZoom(Math.min(this.#zoomLevel + 0.1, 2.0));
  }

  #handleZoomOut() {
    this.#setZoom(Math.max(this.#zoomLevel - 0.1, 0.5));
  }

  #handleZoomReset() {
    this.#setZoom(1.0);
  }

  #setZoom(newZoom) {
    this.#zoomLevel = Math.round(newZoom * 10) / 10;

    // Apply zoom to organigramm container
    const container = this.#element.querySelector('.organigramm-container');
    if (container) {
      container.style.transform = `scale(${this.#zoomLevel})`;
      container.style.transformOrigin = 'top center';
    }

    // Update zoom level display
    const zoomDisplay = this.#zoomControls.querySelector('.zoom-level-value');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.#zoomLevel * 100)}%`;
    }

    // Add pulse animation to buttons
    const activeBtn = this.#zoomControls.querySelector('.zoom-btn:hover');
    if (activeBtn) {
      activeBtn.classList.add('zoom-active');
      setTimeout(() => activeBtn.classList.remove('zoom-active'), 300);
    }

    // Update button disabled states
    const zoomInBtn = this.#zoomControls.querySelector('.zoom-in-btn');
    const zoomOutBtn = this.#zoomControls.querySelector('.zoom-out-btn');
    if (zoomInBtn) zoomInBtn.disabled = this.#zoomLevel >= 2.0;
    if (zoomOutBtn) zoomOutBtn.disabled = this.#zoomLevel <= 0.5;
  }

  #createHeader() {
    const user = authService.getCurrentUser();
    const userEmail = user?.email || 'User';
    const userRole = user?.role || '';
    const isAdmin = authService.isAdmin();

    // Admin-only catalog button (inside nav)
    const catalogButton = isAdmin
      ? createElement('button', {
          className: 'btn-catalog',
          onclick: () => window.navigateToCatalog(),
        }, ['⚙️'])
      : null;

    return createElement('header', { className: 'app-header' }, [
      createElement('div', { className: 'header-date' }),
      createElement('div', { className: 'header-logo' }, [
        createElement('span', { className: 'logo-text' }, ['Trialog']),
        createElement('span', { className: 'logo-divider' }, ['·']),
        createElement('span', { className: 'logo-subtext' }, ['Organigramm']),
      ]),
      createElement('nav', { className: 'header-nav' }, [
        catalogButton,
        createElement('span', { className: 'user-email' }, [
          userEmail,
          userRole === 'admin'
            ? createElement('span', { className: 'user-badge' }, ['Admin'])
            : null,
        ].filter(Boolean)),
        createElement('button', {
          className: 'btn-logout',
          onclick: () => this.#handleLogout(),
        }, ['Abmelden']),
      ].filter(Boolean)),
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
    const tree = this.#state.currentTree;
    if (!tree || !tree.hasNode(nodeId)) return;

    const node = tree.getNode(nodeId);
    const hasEmail = node.email && node.email.trim() !== '';

    // Enhanced confirmation with data deletion warning
    const confirmMessage = hasEmail
      ? `⚠️ WARNUNG: Vollständige Datenlöschung\n\nSie sind dabei, "${node.name}" zu löschen.\n\nDies wird ALLE Daten permanent löschen:\n✓ Mitarbeiter-Profil\n✓ Firebase Auth Account (${node.email})\n✓ Alle Umsatz-Einträge\n✓ Alle Tracking-Events\n\nDieser Vorgang kann NICHT rückgängig gemacht werden!\n\nMöchten Sie wirklich fortfahren?`
      : `Möchten Sie "${node.name}" wirklich löschen?\n\nHinweis: Untergeordnete Elemente werden eine Ebene nach oben verschoben.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      // Delete node from tree
      await this.#hierarchyService.removeNode(this.#currentTreeId, nodeId);

      // If employee had email, delete ALL associated data
      if (hasEmail) {
        console.log(`🗑️ Deleting all data for employee: ${node.email}`);

        // 1. Delete revenue entries
        if (this.#revenueService) {
          try {
            await this.#deleteEmployeeRevenueEntries(nodeId);
            console.log('✓ Revenue entries deleted');
          } catch (error) {
            console.warn('⚠ Failed to delete revenue entries:', error);
          }
        }

        // 2. Delete tracking events for this node
        try {
          await this.#deleteEmployeeTrackingEvents(nodeId);
          console.log('✓ Tracking events deleted');
        } catch (error) {
          console.warn('⚠ Failed to delete tracking events:', error);
        }

        // 3. Delete Firebase Auth account via Cloud Function
        try {
          const result = await authService.deleteEmployeeAccount(node.email);
          if (result.success) {
            console.log(`✓ Firebase Auth account deleted: ${node.email}`);
          } else {
            console.warn(`⚠ Auth deletion warning: ${result.message || result.error}`);
          }
        } catch (error) {
          console.warn('⚠ Failed to delete Auth account:', error);
          // Continue even if Auth deletion fails
        }
      }

      this.#state.deselectNode();

      // Real-time listener will handle UI update
      console.log('✓ Employee deleted successfully');
    } catch (error) {
      console.error('Failed to delete node:', error);
      this.#state.setError(error.message);
      alert('Fehler beim Löschen: ' + error.message);
    }
  }

async #deleteEmployeeRevenueEntries(employeeId) {
    try {
      const entries = await this.#revenueService.getEntriesByEmployee(employeeId);

      for (const entry of entries) {
        await this.#revenueService.deleteEntry(entry.id);
      }

      console.log(`✓ Deleted ${entries.length} revenue entries for employee ${employeeId}`);
    } catch (error) {
      console.error('Failed to delete revenue entries:', error);
      throw error;
    }
  }

  async #deleteEmployeeTrackingEvents(nodeId) {
    try {
      // Import Firestore functions
      const { collection, query, where, getDocs, deleteDoc, doc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );

      const firestore = firebaseApp.firestore;

      // Query tracking events for this node
      const eventsQuery = query(
        collection(firestore, 'tracking_events'),
        where('nodeId', '==', nodeId)
      );

      const snapshot = await getDocs(eventsQuery);

      // Delete all matching events
      const deletePromises = [];
      snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(firestore, 'tracking_events', docSnapshot.id)));
      });

      await Promise.all(deletePromises);

      console.log(`✓ Deleted ${deletePromises.length} tracking events for node ${nodeId}`);
    } catch (error) {
      console.error('Failed to delete tracking events:', error);
      throw error;
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
          // Create elegant loading overlay
          const loadingOverlay = createElement('div', {
            className: 'dialog-loading-overlay',
            style: 'position: absolute; inset: 0; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; border-radius: 24px; z-index: 1000; opacity: 0; transition: opacity 0.2s ease;'
          }, [
            createElement('div', {
              className: 'loading-spinner',
              style: 'width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite;'
            })
          ]);

          const dialogContent = dialog.querySelector('.dialog-content');
          if (dialogContent) {
            dialogContent.style.position = 'relative';
            dialogContent.appendChild(loadingOverlay);
            // Trigger fade-in
            requestAnimationFrame(() => {
              loadingOverlay.style.opacity = '1';
            });
          }

          if (!this.#currentTreeId) {
            const tree = await this.#hierarchyService.createTree(
              'Trialog Strukturplan',
              'Organisationsstruktur der Trialog Makler Gruppe GmbH',
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

            // Email duplicate check before adding
            if (nodeData.email && nodeData.email.trim() !== '') {
              const emailExists = await this.#checkEmailExists(nodeData.email);
              if (emailExists) {
                // Remove loading overlay
                const loadingOverlay = dialog.querySelector('.dialog-loading-overlay');
                if (loadingOverlay) {
                  loadingOverlay.remove();
                }

                alert(`Die E-Mail-Adresse "${nodeData.email}" wird bereits verwendet.\nBitte verwenden Sie eine andere E-Mail-Adresse.`);
                return;
              }
            }

            await this.#hierarchyService.addNode(this.#currentTreeId, nodeData, parentId);
          }

          // Smooth dialog close with fade-out
          dialog.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
          dialog.style.opacity = '0';
          dialog.style.transform = 'scale(0.95)';

          setTimeout(() => dialog.remove(), 250);

          // Real-time listener will automatically handle the update (no manual refresh needed!)
          console.log('✓ Node added - waiting for real-time update');
        } catch (error) {
          console.error('Failed to add node:', error);

          // Remove loading overlay
          const loadingOverlay = dialog.querySelector('.dialog-loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.remove();
          }

          alert('Fehler beim Speichern: ' + error.message);
        }
      },
      onCancel: () => {
        // Smooth cancel animation
        dialog.style.opacity = '0';
        dialog.style.transform = 'scale(0.95)';
        dialog.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        setTimeout(() => dialog.remove(), 200);
      },
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

async #refreshTree(forceResubscribe = false) {
    if (!this.#currentTreeId) return;

    // Only unsubscribe if forced or tree changed
    if (forceResubscribe && this.#unsubscribeTreeListener) {
      this.#unsubscribeTreeListener();
      this.#unsubscribeTreeListener = null;
    }

    try {
      let tree = await this.#hierarchyService.getTree(this.#currentTreeId);

      // Set up real-time listener ONLY if not already set up
      if (!this.#unsubscribeTreeListener) {
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

async #checkEmailExists(email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check in current tree
    const tree = this.#state.currentTree;
    if (tree) {
      const allNodes = tree.getAllNodes();
      const existingNode = allNodes.find(node =>
        node.email && node.email.toLowerCase().trim() === normalizedEmail
      );

      if (existingNode) {
        console.warn(`⚠ Email already exists in node: ${existingNode.name}`);
        return true;
      }
    }

    return false;
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
    // Debounce: Clear any pending update
    if (this.#updateTimeout) {
      clearTimeout(this.#updateTimeout);
    }

    // Prevent concurrent updates
    if (this.#isUpdating) {
      console.log('⏭ Skipping update (already updating)');
      return;
    }

    // Schedule debounced update
    this.#updateTimeout = setTimeout(async () => {
      this.#isUpdating = true;

      try {
        // Filter for employees if needed
        if (authService.isEmployee()) {
          const linkedNodeId = authService.getLinkedNodeId();
          if (linkedNodeId && updatedTree.hasNode(linkedNodeId)) {
            updatedTree = this.#createEmployeeSubtree(updatedTree, linkedNodeId);
          }
        }

        this.#state.setCurrentTree(updatedTree);

        // Reload revenue data (only if revenue service exists)
        if (this.#revenueService) {
          await this.#reloadRevenueData();
        }

        // Update UI with smooth transition
        this.#orgView.setState(this.#state);
        this.#orgView.setTree(updatedTree);
        this.#sidebar.setTree(updatedTree);

        console.log('✓ UI updated with real-time tree changes');
      } catch (error) {
        console.error('Failed to handle tree update:', error);
      } finally {
        this.#isUpdating = false;
      }
    }, 300);  // 300ms debounce delay for better batching
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

    // Setup keyboard shortcuts for zoom
    this.#setupZoomKeyboardShortcuts();

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

  #setupZoomKeyboardShortcuts() {
    this.#keyboardHandler = (e) => {
      // Strg/Cmd + Plus: Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        this.#handleZoomIn();
      }
      // Strg/Cmd + Minus: Zoom Out
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        this.#handleZoomOut();
      }
      // Strg/Cmd + 0: Reset Zoom
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        this.#handleZoomReset();
      }
    };

    document.addEventListener('keydown', this.#keyboardHandler);
  }

  async #initializeTrialogStructure() {
    try {
      const tree = await this.#hierarchyService.createTree(
        'Trialog Strukturplan',
        'Organisationsstruktur der Trialog Makler Gruppe GmbH',
      );
      this.#currentTreeId = tree.id;

      // Create Trialog as root node
      await this.#hierarchyService.addNode(
        this.#currentTreeId,
        {
          name: 'Trialog Makler Gruppe GmbH',
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
    if (this.#keyboardHandler) {
      document.removeEventListener('keydown', this.#keyboardHandler);
      console.log('✓ Zoom keyboard shortcuts removed');
    }
    clearElement(this.#container);
  }

  get state() {
    return this.#state;
  }
}
