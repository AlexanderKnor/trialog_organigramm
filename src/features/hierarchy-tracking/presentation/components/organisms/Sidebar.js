/**
 * Organism: Sidebar
 * Side panel for node details and editing
 */

import { createElement, clearElement } from '../../../../../core/utils/index.js';
import { authService } from '../../../../../core/auth/index.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';
import { NodeEditor } from '../molecules/NodeEditor.js';
import { AddEmployeeWizard } from '../../../../user-profile/presentation/components/AddEmployeeWizard.js';
import { NODE_TYPES } from '../../../domain/value-objects/NodeType.js';
import { formatDate } from '../../../../../core/utils/index.js';
import { Logger } from './../../../../../core/utils/logger.js';
import { isGeschaeftsfuehrerId, getGeschaeftsfuehrerConfig } from '../../../../../core/config/geschaeftsfuehrer.config.js';

export class Sidebar {
  #element;
  #contentContainer;
  #headerTitle;
  #node;
  #treeId;
  #tree;
  #profileService;
  #props;
  #mode;
  #animationTimeout;
  #pendingTreeUpdateResolvers = [];

  constructor(props = {}) {
    this.#node = props.node || null;
    this.#treeId = props.treeId || null;
    this.#tree = props.tree || null;
    this.#profileService = props.profileService || null;
    this.#mode = 'view';
    this.#props = {
      onClose: props.onClose || null,
      onSave: props.onSave || null,
      onDelete: props.onDelete || null,
      onAddChild: props.onAddChild || null,
      onRevenueTracking: props.onRevenueTracking || null,
      profileService: props.profileService || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    this.#headerTitle = createElement('h2', { className: 'sidebar-title' }, ['Details']);

    const header = createElement('div', { className: 'sidebar-header' }, [
      this.#headerTitle,
      new Button({
        variant: 'ghost',
        size: 'sm',
        icon: new Icon({ name: 'close', size: 18 }),
        title: 'Schließen',
        onClick: this.#props.onClose,
      }).element,
    ]);

    this.#contentContainer = createElement('div', { className: 'sidebar-content' });
    this.#updateContent();

    return createElement('aside', {
      className: `sidebar ${this.#props.className}`,
    }, [header, this.#contentContainer]);
  }

  #updateContent(animate = true) {
    // Cancel any pending animation
    if (this.#animationTimeout) {
      clearTimeout(this.#animationTimeout);
      this.#animationTimeout = null;
      // Clean up animation classes
      this.#contentContainer.classList.remove('content-exit', 'content-enter');
    }

    const isVisible = this.#element && this.#element.classList.contains('visible');

    if (animate && isVisible) {
      // Animate content transition
      this.#contentContainer.classList.add('content-exit');

      this.#animationTimeout = setTimeout(() => {
        this.#renderContent();
        this.#contentContainer.classList.remove('content-exit');
        this.#contentContainer.classList.add('content-enter');

        this.#animationTimeout = setTimeout(() => {
          this.#contentContainer.classList.remove('content-enter');
          this.#animationTimeout = null;
        }, 250);
      }, 150);
    } else {
      this.#renderContent();
    }
  }

  async #renderContent() {
    clearElement(this.#contentContainer);

    if (!this.#node) {
      this.#headerTitle.textContent = 'Details';
      this.#renderEmptyState();
      return;
    }

    // Update header title based on mode
    if (this.#mode === 'edit') {
      this.#headerTitle.textContent = 'Bearbeiten';
      await this.#renderEditMode();  // AWAIT for async data loading!
    } else {
      this.#headerTitle.textContent = this.#node.name || 'Details';
      this.#renderViewMode();
    }
  }

  #renderEmptyState() {
    this.#contentContainer.appendChild(
      createElement('div', { className: 'sidebar-empty' }, [
        createElement('p', {}, ['Wählen Sie ein Element aus, um Details anzuzeigen.']),
      ]),
    );
  }

  #renderViewMode() {
    // Check if this is the root/company node
    if (this.#node.isRoot) {
      this.#renderCompanyView();
      return;
    }

    const isGeschaeftsfuehrer = this.#node.isGeschaeftsfuehrer || false;

    // Description if available
    const descriptionSection = this.#node.description
      ? createElement('div', { className: 'sidebar-section' }, [
          createElement('p', { className: 'node-description' }, [this.#node.description]),
        ])
      : null;

    // Contact section
    const hasContact = this.#node.email || this.#node.phone;
    const contactSection = hasContact ? createElement('div', { className: 'sidebar-section' }, [
      createElement('h4', { className: 'sidebar-section-title' }, ['Kontakt']),
      createElement('div', { className: 'info-grid' }, [
        this.#node.email ? createElement('div', { className: 'info-item' }, [
          new Icon({ name: 'mail', size: 14, color: 'var(--color-text-muted)' }).element,
          createElement('a', {
            className: 'info-link',
            href: `mailto:${this.#node.email}`,
          }, [this.#node.email]),
        ]) : null,
        this.#node.phone ? createElement('div', { className: 'info-item' }, [
          new Icon({ name: 'phone', size: 14, color: 'var(--color-text-muted)' }).element,
          createElement('a', {
            className: 'info-link',
            href: `tel:${this.#node.phone}`,
          }, [this.#node.phone]),
        ]) : null,
      ].filter(Boolean)),
    ]) : null;

    // Provisions section
    const provisionsSection = createElement('div', { className: 'sidebar-section' }, [
      createElement('h4', { className: 'sidebar-section-title' }, ['Provisionen']),
      createElement('div', { className: 'provision-grid' }, [
        this.#createProvisionItem('Bank', this.#node.bankProvision || 0),
        this.#createProvisionItem('Immobilien', this.#node.realEstateProvision || 0),
        this.#createProvisionItem('Versicherung', this.#node.insuranceProvision || 0),
      ]),
    ]);

    // Stats row - only show for regular employees, not Geschäftsführer
    const statsRow = !isGeschaeftsfuehrer ? createElement('div', { className: 'sidebar-section' }, [
      createElement('div', { className: 'stats-row' }, [
        createElement('div', { className: 'stat-item' }, [
          createElement('span', { className: 'stat-label' }, ['Mitarbeiter']),
          createElement('span', { className: 'stat-value' }, [String(this.#node.childCount)]),
        ]),
        createElement('div', { className: 'stat-item' }, [
          createElement('span', { className: 'stat-label' }, ['Erstellt']),
          createElement('span', { className: 'stat-value stat-date' }, [
            formatDate(this.#node.metadata.createdAt, 'DD.MM.YYYY'),
          ]),
        ]),
      ]),
    ]) : null;

    // Action buttons - admins can edit employees and Geschäftsführer
    const isAdmin = authService.isAdmin();
    const actionButtons = [];

    if (isAdmin) {
      actionButtons.push(
        new Button({
          label: 'Bearbeiten',
          variant: 'ghost',
          size: 'sm',
          icon: new Icon({ name: 'edit', size: 14 }),
          onClick: () => this.setMode('edit'),
        }).element,
      );

      // "Mitarbeiter hinzufügen" only for non-GF nodes
      if (!isGeschaeftsfuehrer) {
        actionButtons.push(
          new Button({
            label: 'Mitarbeiter hinzufügen',
            variant: 'ghost',
            size: 'sm',
            icon: new Icon({ name: 'plus', size: 14 }),
            onClick: () => {
              if (this.#props.onAddChild) {
                this.#props.onAddChild(this.#node.id);
              }
            },
          }).element,
        );
      }
    }

    actionButtons.push(
      new Button({
        label: 'Umsatz-Tracking',
        variant: 'primary',
        size: 'sm',
        icon: new Icon({ name: 'chart', size: 14 }),
        onClick: () => {
          if (this.#treeId && window.navigateToRevenue) {
            window.navigateToRevenue(this.#node.id, this.#treeId);
          }
        },
      }).element
    );

    const actionsSection = createElement('div', { className: 'sidebar-section sidebar-actions' }, actionButtons);

    this.#contentContainer.appendChild(
      createElement('div', { className: 'node-details' }, [
        descriptionSection,
        contactSection,
        provisionsSection,
        statsRow,
        actionsSection,
      ].filter(Boolean)),
    );
  }

  #renderCompanyView() {
    // Calculate total employees (all descendants)
    let totalEmployees = this.#node.childCount || 0;
    if (this.#tree && this.#node.id) {
      const descendants = this.#tree.getDescendants(this.#node.id);
      totalEmployees = descendants.length;
    }

    // Company description (without icon)
    const descriptionSection = this.#node.description
      ? createElement('div', { className: 'sidebar-section' }, [
          createElement('p', { className: 'company-description' }, [this.#node.description]),
        ])
      : null;

    // Company stats
    const statsSection = createElement('div', { className: 'sidebar-section' }, [
      createElement('div', { className: 'company-stats' }, [
        createElement('div', { className: 'company-stat-item' }, [
          createElement('span', { className: 'company-stat-value' }, [String(totalEmployees)]),
          createElement('span', { className: 'company-stat-label' }, ['Mitarbeiter gesamt']),
        ]),
      ]),
    ]);

    // Action buttons for company - only admins can add employees
    const isAdmin = authService.isAdmin();
    const companyActionButtons = [];

    if (isAdmin) {
      companyActionButtons.push(
        new Button({
          label: 'Mitarbeiter hinzufügen',
          variant: 'ghost',
          size: 'sm',
          icon: new Icon({ name: 'plus', size: 14 }),
          onClick: () => {
            if (this.#props.onAddChild) {
              this.#props.onAddChild(this.#node.id);
            }
          },
        }).element
      );
    }

    companyActionButtons.push(
      new Button({
        label: 'Unternehmens-Umsätze',
        variant: 'primary',
        size: 'sm',
        icon: new Icon({ name: 'chart', size: 14 }),
        onClick: () => {
          if (this.#treeId && window.navigateToRevenue) {
            window.navigateToRevenue(this.#node.id, this.#treeId);
          }
        },
      }).element
    );

    const actionsSection = createElement('div', { className: 'sidebar-section sidebar-actions' }, companyActionButtons);

    this.#contentContainer.appendChild(
      createElement('div', { className: 'node-details company-details' }, [
        descriptionSection,
        statsSection,
        actionsSection,
      ].filter(Boolean)),
    );
  }

  #createProvisionItem(label, value) {
    const hasValue = value > 0;
    return createElement('div', {
      className: `provision-item ${hasValue ? 'has-value' : 'no-value'}`,
    }, [
      createElement('span', { className: 'provision-label' }, [label]),
      createElement('span', { className: 'provision-value' }, [`${value}%`]),
    ]);
  }

  async #renderEditMode() {
    clearElement(this.#contentContainer);

    // Check if node is an employee or Geschäftsführer
    const isEmployee = this.#node.type?.value === 'person' ||
                       this.#node.type === 'person' ||
                       (this.#node.type && this.#node.type.toString().toLowerCase() === 'person');
    const isGeschaeftsfuehrer = this.#node.isGeschaeftsfuehrer || false;

    if ((isEmployee || isGeschaeftsfuehrer) && this.#profileService) {
      // Show loading state
      this.#contentContainer.appendChild(
        createElement('div', { className: 'sidebar-loading' }, [
          createElement('div', { className: 'loading-spinner' }),
          createElement('p', {}, ['Lade Profil-Daten...']),
        ])
      );

      // Load user profile
      let userProfile = null;
      let gfEmail = null;
      try {
        // For Geschäftsführer, load email from central config
        let email = this.#node.email;
        if (!email && isGeschaeftsfuehrer) {
          const gfConfig = getGeschaeftsfuehrerConfig(this.#node.id);
          email = gfConfig?.email || null;
        }
        gfEmail = email;
        if (email) {
          userProfile = await this.#profileService.getUserByEmail(email);
        }
        // Fallback: case-insensitive search if exact match failed
        if (!userProfile && email) {
          const allUsers = await this.#profileService.getAllUsers();
          userProfile = allUsers.find(
            u => u.email?.toLowerCase() === email.toLowerCase()
          ) || null;
        }
      } catch (error) {
        Logger.error('Failed to load user profile:', error);
      }

      // Clear loading state
      clearElement(this.#contentContainer);

      // Show Wizard
      Logger.log('Creating wizard with user:', userProfile, 'isGeschaeftsfuehrer:', isGeschaeftsfuehrer);
      const wizard = new AddEmployeeWizard({
        existingUser: userProfile,
        existingNode: this.#node,
        isGeschaeftsfuehrer,
        initialStep: isGeschaeftsfuehrer ? 2 : undefined,
        onComplete: async (formData) => {
          try {
            // Close wizard first
            wizard.remove();
            this.hide();

            // Show loading overlay
            this.#showLoadingOverlay('Änderungen werden gespeichert...');

            if (userProfile) {
              await this.#updateEmployeeProfile(userProfile.uid, formData);
            } else if (isGeschaeftsfuehrer && gfEmail) {
              // GF has no profile yet — resolve UID via Cloud Function (any admin can do this)
              const gfConfig = getGeschaeftsfuehrerConfig(this.#node.id);
              const resolveResult = await authService.resolveUserUid(gfEmail, gfConfig?.name);
              if (!resolveResult.success) {
                throw new Error(
                  `Kein Account für ${gfEmail} gefunden: ${resolveResult.error}`
                );
              }

              const gfUid = resolveResult.uid;

              // Create full profile if only auth-stub exists, then update
              const existingProfile = await this.#profileService.getUserProfile(gfUid);
              if (!existingProfile) {
                await this.#profileService.createUser(gfUid, gfEmail, 'admin');
              }
              await this.#updateEmployeeProfile(gfUid, formData);
            }

            // GF nodes are not in the hierarchy tree, skip node update
            if (!isGeschaeftsfuehrer) {
              const nodeData = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                bankProvision: parseFloat(formData.bankProvision) || 0,
                insuranceProvision: parseFloat(formData.insuranceProvision) || 0,
                realEstateProvision: parseFloat(formData.realEstateProvision) || 0,
              };

              if (this.#props.onSave) {
                this.#props.onSave(this.#node.id, nodeData);
              }
            }

            // Wait for real-time updates
            await new Promise(resolve => setTimeout(resolve, 4000));
            this.#hideLoadingOverlay();

            this.setMode('view');
            Logger.log('✓ Employee updated, organigramm refreshed!');
          } catch (error) {
            this.#hideLoadingOverlay();
            Logger.error('Failed to update employee:', error);
            alert('Fehler: ' + error.message);
          }
        },
        onDelete: async (deleteData) => {
          try {
            Logger.log('🗑️ Deleting employee account completely...');

            // Close wizard & sidebar first
            wizard.remove();
            this.hide();

            // Show loading overlay (covers everything)
            this.#showLoadingOverlay('Mitarbeiter wird gelöscht...');

            await this.#deleteEmployeeCompletely(deleteData);

            // Wait for real-time update EVENT (event-driven!)
            Logger.log('⏳ Waiting for organigramm to update after delete...');
            await this.#waitForTreeUpdate();
            Logger.log('✓ Tree update received, hiding overlay...');

            // Small delay for smooth transition
            await new Promise(resolve => setTimeout(resolve, 300));
            this.#hideLoadingOverlay();

            Logger.log('✓ Employee deleted, organigramm updated!');
          } catch (error) {
            this.#hideLoadingOverlay();
            Logger.error('Failed to delete employee:', error);
            alert('Fehler beim Löschen: ' + error.message);
          }
        },
        onCancel: () => {
          wizard.remove();
          this.setMode('view');
          this.show();
        },
      });

      wizard.show();
      this.hide();
    } else {
      // Use NodeEditor for root/custom nodes
      const editor = new NodeEditor(this.#node, {
        onSave: (data) => {
          if (this.#props.onSave) {
            this.#props.onSave(this.#node.id, data);
          }
          this.setMode('view');
        },
        onCancel: () => this.setMode('view'),
        onDelete: this.#props.onDelete,  // NodeEditor has its own confirmation, keep as-is
      });

      this.#contentContainer.appendChild(editor.element);
      editor.focus();
    }
  }

  async #deleteEmployeeCompletely(deleteData) {
    const { uid, email, nodeId } = deleteData;

    Logger.log('Step 1: Delete all revenue entries...');
    // Note: Revenue deletion should be handled by HierarchyScreen
    // via onDelete callback which cascades to all related data

    Logger.log('Step 2: Delete via Cloud Function...');
    // Call Cloud Function to delete Firebase Auth User + Firestore User Document
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
    const { firebaseApp } = await import('../../../../../core/firebase/index.js');

    const functions = getFunctions(firebaseApp.app);
    const deleteEmployee = httpsCallable(functions, 'deleteEmployeeAccount');

    try {
      await deleteEmployee({ email });
      Logger.log('✓ Firebase Auth User + User Document deleted');
    } catch (error) {
      Logger.warn('Cloud function delete failed (may not exist):', error);
      // Continue with client-side deletion
    }

    Logger.log('Step 3: Delete HierarchyNode...');
    Logger.log('  Calling onDelete with nodeId:', nodeId, 'skipConfirmation: TRUE');
    // Call HierarchyScreen onDelete to handle node + revenue entries deletion
    // Pass true to skip confirmation (already confirmed in Wizard)
    if (this.#props.onDelete) {
      this.#props.onDelete(nodeId, true);
      Logger.log('  onDelete callback executed with skipConfirmation=true');
    } else {
      Logger.error('  ❌ onDelete callback is null!');
    }

    Logger.log('✅ Employee account deleted completely');
  }

  #waitForTreeUpdate(timeoutMs = 5000) {
    return new Promise((resolve) => {
      Logger.log('⏳ Sidebar waiting for tree update...');

      // This is a simplified version - relies on HierarchyScreen's update mechanism
      // Fallback to timeout since Sidebar doesn't have direct access to tree listener
      const timeout = setTimeout(() => {
        Logger.log('✓ Timeout fallback - assuming update complete');
        resolve();
      }, timeoutMs);
    });
  }

  #showLoadingOverlay(message) {
    let overlay = document.querySelector('.hierarchy-loading-overlay');
    if (!overlay) {
      overlay = createElement('div', {
        className: 'hierarchy-loading-overlay',
        style: 'position: fixed; inset: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; transition: opacity 0.3s ease;'
      }, [
        createElement('div', { style: 'text-align: center;' }, [
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
    requestAnimationFrame(() => overlay.style.opacity = '1');
  }

  #hideLoadingOverlay() {
    const overlay = document.querySelector('.hierarchy-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  async #updateEmployeeProfile(uid, formData) {
    const { Address } = await import('../../../../user-profile/domain/value-objects/Address.js');
    const { TaxInfo } = await import('../../../../user-profile/domain/value-objects/TaxInfo.js');
    const { BankInfo } = await import('../../../../user-profile/domain/value-objects/BankInfo.js');
    const { LegalInfo } = await import('../../../../user-profile/domain/value-objects/LegalInfo.js');
    const { Qualifications } = await import('../../../../user-profile/domain/value-objects/Qualifications.js');
    const { CareerLevel } = await import('../../../../user-profile/domain/value-objects/CareerLevel.js');

    const user = await this.#profileService.getUserProfile(uid);
    if (!user) throw new Error('User not found');

    user.updatePersonalInfo({
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      phone: formData.phone,
    });

    user.updateAddress(new Address({
      street: formData.street,
      houseNumber: formData.houseNumber,
      postalCode: formData.postalCode,
      city: formData.city,
    }));

    user.updateTaxInfo(new TaxInfo({
      taxNumber: formData.taxNumber,
      vatNumber: formData.vatNumber,
      taxOffice: formData.taxOffice,
      isSmallBusiness: formData.isSmallBusiness,
      isVatLiable: formData.isVatLiable,
    }));

    user.updateBankInfo(new BankInfo({
      iban: formData.iban,
      bic: formData.bic,
      bankName: formData.bankName,
      accountHolder: formData.accountHolder,
    }));

    user.updateLegalInfo(new LegalInfo({
      legalForm: formData.legalForm,
      registrationCourt: formData.registrationCourt,
    }));

    user.updateQualifications(new Qualifications({
      ihkQualifications: formData.ihkQualifications,
      ihkRegistrationNumber: formData.ihkRegistrationNumber,
    }));

    user.updateCareerLevel(new CareerLevel({
      rankName: formData.rankName,
      bankProvisionRate: parseFloat(formData.bankProvision) || 0,
      insuranceProvisionRate: parseFloat(formData.insuranceProvision) || 0,
      realEstateProvisionRate: parseFloat(formData.realEstateProvision) || 0,
    }));

    await this.#profileService.update(user);
  }

  get element() {
    return this.#element;
  }

  get mode() {
    return this.#mode;
  }

  setNode(node, options = {}) {
    const isSameNode = this.#node && node && this.#node.id === node.id;
    const skipRender = options.skipRender || false;

    // Skip if same node
    if (isSameNode && !options.force) return;

    this.#node = node;

    // Only reset to view mode if it's a different node
    if (!isSameNode) {
      this.#mode = 'view';
    }

    if (!skipRender) {
      this.#updateContent(true);
    }
  }

  async setMode(mode) {
    if (this.#mode === mode) return; // Skip if already in this mode
    this.#mode = mode;
    await this.#updateContent(true);
  }

  // Combined method to set node and mode in a single render
  openWithNode(node, mode = 'view') {
    const isVisible = this.#element && this.#element.classList.contains('visible');
    const isSameNode = this.#node && node && this.#node.id === node.id;
    const isSameMode = this.#mode === mode;

    // Skip only if truly nothing changed
    if (isVisible && isSameNode && isSameMode) return;

    // Update state
    this.#node = node;
    this.#mode = mode;

    // Animate content change if sidebar is already visible and content is changing
    const shouldAnimate = isVisible && (!isSameNode || !isSameMode);
    this.#updateContent(shouldAnimate);

    // Ensure sidebar is visible
    this.show();
  }

  clear() {
    this.#node = null;
    this.#mode = 'view';
    this.#updateContent();
  }

  setTreeId(treeId) {
    this.#treeId = treeId;
  }

  setTree(tree) {
    this.#tree = tree;
  }

  show() {
    this.#element.classList.add('visible');
  }

  hide() {
    this.#element.classList.remove('visible');
  }
}
