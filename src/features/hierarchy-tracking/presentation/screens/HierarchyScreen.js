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
import { AddEmployeeWizard } from '../../../user-profile/presentation/components/AddEmployeeWizard.js';
import { Logger } from './../../../../core/utils/logger.js';

export class HierarchyScreen {
  #element;
  #container;
  #hierarchyService;
  #revenueService;
  #profileService;
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
  #pendingUpdateResolvers = [];
  #closeUserMenuHandler = null;

  constructor(container, hierarchyService, revenueService = null, profileService = null) {
    this.#container = typeof container === 'string' ? getElement(container) : container;
    this.#hierarchyService = hierarchyService;
    this.#revenueService = revenueService;
    this.#profileService = profileService;
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
      onDelete: (nodeId, skipConfirmation) => this.#handleNodeDelete(nodeId, skipConfirmation),
      onAddChild: (parentId) => this.#handleAddNode(parentId),
      profileService: this.#profileService,
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
    const isAdmin = authService.isAdmin();
    const displayName = user?.displayName || userEmail.split('@')[0];

    // Admin-only catalog button (gear/settings icon)
    let catalogButton = null;
    if (isAdmin) {
      catalogButton = createElement('button', {
        className: 'btn-catalog',
        title: 'Katalog',
        onclick: () => window.navigateToCatalog(),
      });
      catalogButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    // User menu with dropdown
    const userMenu = createElement('div', { className: 'user-menu' }, [
      createElement('button', {
        className: 'user-menu-trigger',
        onclick: (e) => this.#toggleUserMenu(e),
      }, [
        createElement('span', { className: 'user-avatar' }, [displayName.charAt(0).toUpperCase()]),
        createElement('span', { className: 'user-name' }, [displayName]),
        isAdmin ? createElement('span', { className: 'user-badge' }, ['Admin']) : null,
        createElement('span', { className: 'user-menu-arrow' }),
      ].filter(Boolean)),
      createElement('div', { className: 'user-menu-dropdown' }, [
        createElement('button', {
          className: 'user-menu-item',
          onclick: () => this.#showChangePasswordDialog(),
        }, ['Passwort ändern']),
        createElement('div', { className: 'user-menu-divider' }),
        createElement('button', {
          className: 'user-menu-item user-menu-logout',
          onclick: () => this.#handleLogout(),
        }, ['Abmelden']),
      ]),
    ]);

    return createElement('header', { className: 'app-header' }, [
      createElement('div', { className: 'header-date' }),
      createElement('div', { className: 'header-logo' }, [
        createElement('span', { className: 'logo-text' }, ['Trialog']),
        createElement('span', { className: 'logo-divider' }, ['·']),
        createElement('span', { className: 'logo-subtext' }, ['Organigramm']),
      ]),
      createElement('div', { className: 'header-actions' }, [
        catalogButton,
        userMenu,
      ].filter(Boolean)),
    ]);
  }

  #toggleUserMenu(e) {
    e.stopPropagation();
    const menu = this.#element.querySelector('.user-menu');
    const isOpen = menu.classList.contains('open');

    if (isOpen) {
      menu.classList.remove('open');
      document.removeEventListener('click', this.#closeUserMenuHandler);
    } else {
      menu.classList.add('open');
      // Close menu when clicking outside
      this.#closeUserMenuHandler = () => {
        menu.classList.remove('open');
        document.removeEventListener('click', this.#closeUserMenuHandler);
      };
      setTimeout(() => document.addEventListener('click', this.#closeUserMenuHandler), 0);
    }
  }

  #showChangePasswordDialog() {
    // Close user menu
    const menu = this.#element.querySelector('.user-menu');
    menu.classList.remove('open');

    // Create and show password change dialog
    const overlay = createElement('div', { className: 'dialog-overlay' }, [
      createElement('div', { className: 'change-password-dialog' }, [
        createElement('div', { className: 'dialog-header' }, [
          createElement('h2', { className: 'dialog-title' }, ['Passwort ändern']),
          createElement('button', {
            className: 'dialog-close',
            onclick: () => overlay.remove(),
          }, ['×']),
        ]),
        createElement('form', {
          className: 'change-password-form',
          onsubmit: async (e) => {
            e.preventDefault();
            await this.#handlePasswordChange(e.target, overlay);
          },
        }, [
          createElement('p', { className: 'dialog-description' }, [
            'Geben Sie Ihr aktuelles Passwort und das neue Passwort ein.',
          ]),
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label' }, ['Aktuelles Passwort']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              name: 'currentPassword',
              required: true,
              autocomplete: 'current-password',
            }),
          ]),
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label' }, ['Neues Passwort']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              name: 'newPassword',
              required: true,
              autocomplete: 'new-password',
            }),
            createElement('small', { className: 'form-hint' }, [
              'Mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl, Sonderzeichen',
            ]),
          ]),
          createElement('div', { className: 'form-group' }, [
            createElement('label', { className: 'form-label' }, ['Neues Passwort bestätigen']),
            createElement('input', {
              className: 'form-input',
              type: 'password',
              name: 'confirmPassword',
              required: true,
              autocomplete: 'new-password',
            }),
          ]),
          createElement('div', { className: 'form-error', style: 'display: none;' }),
          createElement('div', { className: 'form-success', style: 'display: none;' }),
          createElement('div', { className: 'dialog-actions' }, [
            createElement('button', {
              className: 'btn btn-ghost',
              type: 'button',
              onclick: () => overlay.remove(),
            }, ['Abbrechen']),
            createElement('button', {
              className: 'btn btn-primary',
              type: 'submit',
            }, ['Passwort ändern']),
          ]),
        ]),
      ]),
    ]);

    document.body.appendChild(overlay);

    // Focus first input
    setTimeout(() => overlay.querySelector('input')?.focus(), 100);
  }

  async #handlePasswordChange(form, overlay) {
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = form.querySelector('.form-error');
    const successDiv = form.querySelector('.form-success');

    // Clear messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    // Validate
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Die neuen Passwörter stimmen nicht überein.';
      errorDiv.style.display = 'block';
      return;
    }

    const validation = this.#validatePasswordStrength(newPassword);
    if (!validation.valid) {
      errorDiv.innerHTML = validation.error;
      errorDiv.style.display = 'block';
      return;
    }

    if (currentPassword === newPassword) {
      errorDiv.textContent = 'Das neue Passwort muss sich vom aktuellen unterscheiden.';
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird geändert...';

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        successDiv.textContent = 'Passwort erfolgreich geändert!';
        successDiv.style.display = 'block';
        form.reset();

        // Close dialog after success
        setTimeout(() => overlay.remove(), 1500);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Passwort ändern';
      }
    } catch (error) {
      errorDiv.textContent = 'Ein Fehler ist aufgetreten.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Passwort ändern';
    }
  }

  #validatePasswordStrength(password) {
    const errors = [];
    if (password.length < 8) errors.push('• Mindestens 8 Zeichen');
    if (!/[A-Z]/.test(password)) errors.push('• Mindestens 1 Großbuchstabe');
    if (!/[a-z]/.test(password)) errors.push('• Mindestens 1 Kleinbuchstabe');
    if (!/[0-9]/.test(password)) errors.push('• Mindestens 1 Zahl');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('• Mindestens 1 Sonderzeichen');

    if (errors.length > 0) {
      return { valid: false, error: `Anforderungen:\n${errors.join('\n')}` };
    }
    return { valid: true };
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
      Logger.error('Failed to save node:', error);
      this.#state.setError(error.message);
    }
  }

async #handleNodeDelete(nodeId, skipConfirmation = false) {
    Logger.log('🗑️ #handleNodeDelete called - skipConfirmation:', skipConfirmation);

    const tree = this.#state.currentTree;
    if (!tree || !tree.hasNode(nodeId)) {
      Logger.warn('⚠ Node not found in local tree');
      return;
    }

    const node = tree.getNode(nodeId);
    const hasEmail = node.email && node.email.trim() !== '';

    try {
      // Delete node from tree (service now checks backend existence)
      await this.#hierarchyService.removeNode(this.#currentTreeId, nodeId);

      // If employee had email, delete ALL associated data
      if (hasEmail) {
        Logger.log(`🗑️ Deleting all data for employee: ${node.email}`);

        // 1. Delete revenue entries
        if (this.#revenueService) {
          try {
            await this.#deleteEmployeeRevenueEntries(nodeId);
            Logger.log('✓ Revenue entries deleted');
          } catch (error) {
            Logger.warn('⚠ Failed to delete revenue entries:', error);
          }
        }

        // 2. Delete tracking events for this node
        try {
          await this.#deleteEmployeeTrackingEvents(nodeId);
          Logger.log('✓ Tracking events deleted');
        } catch (error) {
          Logger.warn('⚠ Failed to delete tracking events:', error);
        }

        // 3. Delete Firebase Auth account via Cloud Function
        try {
          const result = await authService.deleteEmployeeAccount(node.email);
          if (result.success) {
            Logger.log(`✓ Firebase Auth account deleted: ${node.email}`);
          } else {
            Logger.warn(`⚠ Auth deletion warning: ${result.message || result.error}`);
          }
        } catch (error) {
          Logger.warn('⚠ Failed to delete Auth account:', error);
          // Continue even if Auth deletion fails
        }
      }

      this.#state.deselectNode();

      // Real-time listener will handle UI update
      Logger.log('✓ Employee deleted successfully');
    } catch (error) {
      Logger.error('Failed to delete node:', error);
      this.#state.setError(error.message);

      // Show error with reload option
      const shouldReload = window.confirm(
        `Fehler beim Löschen: ${error.message}\n\nMöchten Sie die Seite neu laden, um den aktuellen Stand vom Server zu holen?`
      );
      if (shouldReload) {
        window.location.reload();
      }
    }
  }

async #deleteEmployeeRevenueEntries(employeeId) {
    try {
      const entries = await this.#revenueService.getEntriesByEmployee(employeeId);

      for (const entry of entries) {
        await this.#revenueService.deleteEntry(entry.id);
      }

      Logger.log(`✓ Deleted ${entries.length} revenue entries for employee ${employeeId}`);
    } catch (error) {
      Logger.error('Failed to delete revenue entries:', error);
      throw error;
    }
  }

  async #deleteEmployeeTrackingEvents(nodeId) {
    try {
      // Import Firestore functions
      const { collection, query, where, getDocs, deleteDoc, doc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      const { firebaseApp } = await import('../../../../core/firebase/index.js');

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

      Logger.log(`✓ Deleted ${deletePromises.length} tracking events for node ${nodeId}`);
    } catch (error) {
      Logger.error('Failed to delete tracking events:', error);
      throw error;
    }
  }

  async #handleNodeMove(nodeId, targetId) {
    if (nodeId === targetId) return;

    try {
      await this.#hierarchyService.moveNode(this.#currentTreeId, nodeId, targetId);
      await this.#refreshTree();
    } catch (error) {
      Logger.error('Failed to move node:', error);
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
    const isAddingEmployee = parentId !== null;

    // Use Wizard for employees, NodeEditor for root/custom nodes
    if (isAddingEmployee) {
      this.#showEmployeeWizard(parentId);
    } else {
      this.#showRootNodeDialog();
    }
  }

  #showEmployeeWizard(parentId) {
    const wizard = new AddEmployeeWizard({
      onComplete: async (formData) => {
        try {
          // Close wizard first
          wizard.remove();

          // Show fullscreen loading (covers organigramm)
          this.#showLoadingOverlay('Mitarbeiter wird angelegt...');

          // Create employee
          await this.#createEmployeeWithProfile(formData, parentId);

          // Wait for real-time update EVENT (event-driven, not timeout!)
          Logger.log('⏳ Waiting for organigramm to update...');
          await this.#waitForNextTreeUpdate();
          Logger.log('✓ Tree update received, hiding overlay...');

          // Small delay for smooth transition
          await new Promise(resolve => setTimeout(resolve, 300));

          // Hide overlay smoothly
          this.#hideLoadingOverlay();

          Logger.log('✓ Employee created, organigramm updated!');
        } catch (error) {
          this.#hideLoadingOverlay();
          Logger.error('Failed to create employee:', error);

          // Show error with reload option
          const shouldReload = window.confirm(
            `Fehler beim Anlegen: ${error.message}\n\nMöchten Sie die Seite neu laden, um den aktuellen Stand vom Server zu holen?`
          );
          if (shouldReload) {
            window.location.reload();
          }
        }
      },
      onCancel: () => wizard.remove(),
    });

    wizard.show();
  }

  async #validateEmployeeData(formData) {
    // Import Value Objects for validation
    const { Address } = await import('../../../user-profile/domain/value-objects/Address.js');
    const { TaxInfo } = await import('../../../user-profile/domain/value-objects/TaxInfo.js');
    const { BankInfo } = await import('../../../user-profile/domain/value-objects/BankInfo.js');

    // Validate by creating Value Objects (throws ValidationError if invalid)
    new Address({
      street: formData.street,
      houseNumber: formData.houseNumber,
      postalCode: formData.postalCode,
      city: formData.city,
    });

    new TaxInfo({
      taxNumber: formData.taxNumber,
      vatNumber: formData.vatNumber,
      taxOffice: formData.taxOffice,
      isSmallBusiness: formData.isSmallBusiness,
      isVatLiable: formData.isVatLiable,
    });

    new BankInfo({
      iban: formData.iban,
      bic: formData.bic,
      bankName: formData.bankName,
      accountHolder: formData.accountHolder,
    });

    // All validations passed!
    return true;
  }

  #waitForNextTreeUpdate(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      Logger.log('⏳ Waiting for next tree update event...');

      // Add to pending resolvers
      this.#pendingUpdateResolvers.push(resolve);

      // Safety timeout (fallback if update never comes)
      const timeout = setTimeout(() => {
        Logger.warn('⚠️ Tree update timeout - forcing resolve after', timeoutMs, 'ms');
        const index = this.#pendingUpdateResolvers.indexOf(resolve);
        if (index > -1) {
          this.#pendingUpdateResolvers.splice(index, 1);
        }
        resolve();
      }, timeoutMs);

      // Clean up timeout when resolved
      const originalResolve = this.#pendingUpdateResolvers[this.#pendingUpdateResolvers.length - 1];
      this.#pendingUpdateResolvers[this.#pendingUpdateResolvers.length - 1] = () => {
        clearTimeout(timeout);
        originalResolve();
      };
    });
  }

  #showLoadingOverlay(message = 'Laden...') {
    let overlay = document.querySelector('.hierarchy-loading-overlay');
    if (!overlay) {
      overlay = createElement('div', {
        className: 'hierarchy-loading-overlay',
        style: 'position: fixed; inset: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; transition: opacity 0.3s ease;'
      }, [
        createElement('div', {
          style: 'text-align: center;'
        }, [
          createElement('div', {
            className: 'loading-spinner',
            style: 'width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;'
          }),
          createElement('p', {
            style: 'font-size: 1.125rem; font-weight: 500; color: var(--color-primary);'
          }, [message]),
        ])
      ]);
      document.body.appendChild(overlay);
    }

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  }

  #hideLoadingOverlay() {
    const overlay = document.querySelector('.hierarchy-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  async #createEmployeeWithProfile(formData, parentId) {
    Logger.log('🚀 Creating employee with complete profile...');

    // Step 0: VALIDATE ALL DATA FIRST (before creating anything!)
    try {
      Logger.log('🔍 Pre-validation: Checking all data before creation...');
      await this.#validateEmployeeData(formData);
      Logger.log('✓ All data valid, proceeding with creation');
    } catch (validationError) {
      Logger.error('❌ Validation failed:', validationError.message);
      throw new Error(`Validierung fehlgeschlagen: ${validationError.message}`);
    }

    // Step 1: Create Firebase Auth User via Cloud Function (Admin stays logged in!)
    try {
      const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
      const { firebaseApp } = await import('../../../../core/firebase/index.js');

      const functions = getFunctions(firebaseApp.app);
      const createEmployee = httpsCallable(functions, 'createEmployeeAccount');

      const result = await createEmployee({
        email: formData.email,
        password: formData.password,
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      const employeeUid = result.data.uid;
      Logger.log('✓ Firebase Auth user created via Cloud Function:', employeeUid);
      Logger.log('✓ Admin stays logged in! ✅');

    // Step 2: Import User Profile entities
    const { User } = await import('../../../user-profile/domain/entities/User.js');
    const { Address } = await import('../../../user-profile/domain/value-objects/Address.js');
    const { TaxInfo } = await import('../../../user-profile/domain/value-objects/TaxInfo.js');
    const { BankInfo } = await import('../../../user-profile/domain/value-objects/BankInfo.js');
    const { LegalInfo } = await import('../../../user-profile/domain/value-objects/LegalInfo.js');
    const { Qualifications } = await import('../../../user-profile/domain/value-objects/Qualifications.js');
    const { CareerLevel } = await import('../../../user-profile/domain/value-objects/CareerLevel.js');

    // Step 3: Create User Entity with Profile
    const userEntity = User.create(employeeUid, formData.email, 'employee');

    // Update with all profile data
    userEntity.updatePersonalInfo({
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      phone: formData.phone,
    });

    userEntity.updateAddress(new Address({
      street: formData.street,
      houseNumber: formData.houseNumber,
      postalCode: formData.postalCode,
      city: formData.city,
    }));

    userEntity.updateTaxInfo(new TaxInfo({
      taxNumber: formData.taxNumber,
      vatNumber: formData.vatNumber,
      taxOffice: formData.taxOffice,
      isSmallBusiness: formData.isSmallBusiness,
      isVatLiable: formData.isVatLiable,
    }));

    userEntity.updateBankInfo(new BankInfo({
      iban: formData.iban,
      bic: formData.bic,
      bankName: formData.bankName,
      accountHolder: formData.accountHolder,
    }));

    userEntity.updateLegalInfo(new LegalInfo({
      legalForm: formData.legalForm,
      registrationCourt: formData.registrationCourt,
    }));

    userEntity.updateQualifications(new Qualifications({
      ihkQualifications: formData.ihkQualifications,
      ihkRegistrationNumber: formData.ihkRegistrationNumber,
    }));

    userEntity.updateCareerLevel(new CareerLevel({
      rankName: formData.rankName,
      bankProvisionRate: parseFloat(formData.bankProvision) || 0,
      insuranceProvisionRate: parseFloat(formData.insuranceProvision) || 0,
      realEstateProvisionRate: parseFloat(formData.realEstateProvision) || 0,
    }));

    // Step 4: Save User Profile to Firestore
    Logger.log('💾 Saving complete user profile...');
    Logger.log('  Profile data:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      address: formData.street,
      taxNumber: formData.taxNumber,
      iban: formData.iban,
    });

    await this.#profileService.save(userEntity);
    Logger.log('✓ User profile saved to Firestore');

    // Verify save
    const savedUser = await this.#profileService.getUserProfile(employeeUid);
    Logger.log('✓ Verification - Saved user:', {
      firstName: savedUser?.firstName,
      lastName: savedUser?.lastName,
      hasAddress: !!savedUser?.address,
    });

    // Step 5: Create HierarchyNode
    const nodeData = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      bankProvision: parseFloat(formData.bankProvision) || 0,
      insuranceProvision: parseFloat(formData.insuranceProvision) || 0,
      realEstateProvision: parseFloat(formData.realEstateProvision) || 0,
      type: NODE_TYPES.PERSON,
    };

    const node = await this.#hierarchyService.addNode(this.#currentTreeId, nodeData, parentId);
    Logger.log('✓ HierarchyNode created');

    // Step 6: Link User to Node
    await this.#profileService.linkToHierarchyNode(userEntity.uid, node.id);
    Logger.log('✓ User linked to HierarchyNode');

      Logger.log('✅ Employee created successfully with complete profile!');
      Logger.log('✓ Admin remains logged in!');

    } catch (error) {
      Logger.error('❌ Failed to create employee:', error);

      // Check if it's a Firebase Auth error
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Diese E-Mail-Adresse wird bereits verwendet');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Passwort ist zu schwach (mindestens 6 Zeichen)');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('E-Mail-Adresse ungültig');
      }

      throw error;
    }
  }

  #showRootNodeDialog() {
    const dialog = createElement('div', { className: 'dialog-overlay' });

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
          Logger.log('✓ Node added - waiting for real-time update');
        } catch (error) {
          Logger.error('Failed to add node:', error);

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
      Logger.error('Export failed:', error);
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
        Logger.error('Import failed:', error);
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
                Logger.log('🔄 Real-time tree update received');
                this.#handleTreeUpdate(updatedTree);
              }
            }
          );
          Logger.log('✓ Real-time listener active for tree:', this.#currentTreeId);
        } catch (error) {
          Logger.warn('⚠ Failed to set up real-time listener:', error);
          // Continue without real-time sync
        }
      }

      // Set up real-time listener for revenue entries
      if (this.#revenueService) {
        try {
          this.#unsubscribeRevenueListener = await this.#revenueService.subscribeToRevenueUpdates(
            async () => {
              Logger.log('🔄 Real-time revenue update received');
              await this.#reloadRevenueData();
            }
          );
          Logger.log('✓ Real-time revenue listener active');
        } catch (error) {
          Logger.warn('⚠ Failed to set up revenue listener:', error);
        }
      }

      // For employees: filter tree to show only their subtree
      if (authService.isEmployee()) {
        const linkedNodeId = authService.getLinkedNodeId();
        Logger.log(`🔍 Employee filter check: linkedNodeId = ${linkedNodeId}`);

        if (linkedNodeId) {
          Logger.log(`  Tree has ${tree.getAllNodes().length} nodes`);
          Logger.log(`  Tree has node ${linkedNodeId}? ${tree.hasNode(linkedNodeId)}`);

          if (tree.hasNode(linkedNodeId)) {
            // Create a filtered view showing only the employee's subtree
            tree = this.#createEmployeeSubtree(tree, linkedNodeId);
            Logger.log(`✓ Filtered tree for employee (starting from: ${linkedNodeId})`);
          } else {
            // 🔒 CRITICAL SECURITY: Employee's node was deleted - force logout
            Logger.error('🔒 SECURITY: Employee node deleted from tree - forcing logout');
            await authService.logout();
            return; // Stop execution, auth state change will trigger login screen
          }
        } else {
          // 🔒 CRITICAL SECURITY: Employee has no linked node - force logout
          Logger.error('🔒 SECURITY: Employee has no linked node - forcing logout');
          await authService.logout();
          return; // Stop execution, auth state change will trigger login screen
        }
      } else if (!authService.isAdmin()) {
        // 🔒 CRITICAL SECURITY: User is neither admin nor employee - force logout
        Logger.error('🔒 SECURITY: Invalid user role - forcing logout');
        await authService.logout();
        return;
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
      Logger.error('Failed to refresh tree:', error);
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
        Logger.warn(`⚠ Email already exists in node: ${existingNode.name}`);
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

    Logger.log(`✓ Employee subtree created (root: ${employeeNodeId})`);
    return fullTree;
  }

async #handleTreeUpdate(updatedTree) {
    // Resolve pending update promises (event-driven transitions!)
    if (this.#pendingUpdateResolvers && this.#pendingUpdateResolvers.length > 0) {
      Logger.log(`✓ Resolving ${this.#pendingUpdateResolvers.length} pending update promises`);
      this.#pendingUpdateResolvers.forEach(resolve => resolve());
      this.#pendingUpdateResolvers = [];
    }

    // Debounce: Clear any pending update
    if (this.#updateTimeout) {
      clearTimeout(this.#updateTimeout);
    }

    // Prevent concurrent updates
    if (this.#isUpdating) {
      Logger.log('⏭ Skipping update (already updating)');
      return;
    }

    // Schedule debounced update
    this.#updateTimeout = setTimeout(async () => {
      this.#isUpdating = true;

      try {
        // Filter for employees if needed
        if (authService.isEmployee()) {
          const linkedNodeId = authService.getLinkedNodeId();

          if (!linkedNodeId) {
            // 🔒 CRITICAL SECURITY: Employee has no linked node - force logout
            Logger.error('🔒 SECURITY: Employee has no linked node (real-time update) - forcing logout');
            await authService.logout();
            this.#isUpdating = false;
            return;
          }

          if (!updatedTree.hasNode(linkedNodeId)) {
            // 🔒 CRITICAL SECURITY: Employee's node was deleted - force logout
            Logger.error('🔒 SECURITY: Employee node deleted (real-time update) - forcing logout');
            await authService.logout();
            this.#isUpdating = false;
            return;
          }

          updatedTree = this.#createEmployeeSubtree(updatedTree, linkedNodeId);
        } else if (!authService.isAdmin()) {
          // 🔒 CRITICAL SECURITY: Invalid role - force logout
          Logger.error('🔒 SECURITY: Invalid user role (real-time update) - forcing logout');
          await authService.logout();
          this.#isUpdating = false;
          return;
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

        Logger.log('✓ UI updated with real-time tree changes');
      } catch (error) {
        Logger.error('Failed to handle tree update:', error);
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

      Logger.log('✓ Revenue data updated');
    } catch (error) {
      Logger.error('Failed to reload revenue data:', error);
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
        Logger.log(`✓ Loading THE organization tree: ${this.#currentTreeId}`);

        if (allTrees.length > 1) {
          Logger.warn(`⚠ ${allTrees.length} trees found - should only be 1!`);
        }

        await this.#refreshTree();
      } else {
        // Create THE organization tree
        Logger.log('✓ No tree exists - creating THE organization tree');
        await this.#initializeTrialogStructure();
      }
    } catch (error) {
      Logger.error('Failed to load tree:', error);
      // Fallback: try to initialize
      try {
        await this.#initializeTrialogStructure();
      } catch (initError) {
        Logger.error('Failed to initialize tree:', initError);
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
      Logger.error('Failed to initialize Trialog structure:', error);
    }
  }

  unmount() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
    }
    if (this.#unsubscribeTreeListener) {
      this.#unsubscribeTreeListener();
      Logger.log('✓ Real-time tree listener unsubscribed');
    }
    if (this.#unsubscribeRevenueListener) {
      this.#unsubscribeRevenueListener();
      Logger.log('✓ Real-time revenue listener unsubscribed');
    }
    if (this.#keyboardHandler) {
      document.removeEventListener('keydown', this.#keyboardHandler);
      Logger.log('✓ Zoom keyboard shortcuts removed');
    }
    clearElement(this.#container);
  }

  get state() {
    return this.#state;
  }
}
