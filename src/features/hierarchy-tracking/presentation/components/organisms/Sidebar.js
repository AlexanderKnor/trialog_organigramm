/**
 * Organism: Sidebar
 * Side panel for node details and editing
 */

import { createElement, clearElement } from '../../../../../core/utils/index.js';
import { authService } from '../../../../../core/auth/index.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';
import { NodeEditor } from '../molecules/NodeEditor.js';
import { formatDate } from '../../../../../core/utils/index.js';

export class Sidebar {
  #element;
  #contentContainer;
  #headerTitle;
  #node;
  #treeId;
  #tree;
  #props;
  #mode;
  #animationTimeout;

  constructor(props = {}) {
    this.#node = props.node || null;
    this.#treeId = props.treeId || null;
    this.#tree = props.tree || null;
    this.#mode = 'view';
    this.#props = {
      onClose: props.onClose || null,
      onSave: props.onSave || null,
      onDelete: props.onDelete || null,
      onAddChild: props.onAddChild || null,
      onRevenueTracking: props.onRevenueTracking || null,
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

  #renderContent() {
    clearElement(this.#contentContainer);

    if (!this.#node) {
      this.#headerTitle.textContent = 'Details';
      this.#renderEmptyState();
      return;
    }

    // Update header title based on mode
    if (this.#mode === 'edit') {
      this.#headerTitle.textContent = 'Bearbeiten';
      this.#renderEditMode();
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

    // Action buttons - different for Geschäftsführer
    // Only admins can edit and add employees
    const isAdmin = authService.isAdmin();
    const actionButtons = [];

    if (!isGeschaeftsfuehrer && isAdmin) {
      actionButtons.push(
        new Button({
          label: 'Bearbeiten',
          variant: 'ghost',
          size: 'sm',
          icon: new Icon({ name: 'edit', size: 14 }),
          onClick: () => this.setMode('edit'),
        }).element,
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

  #renderEditMode() {
    const editor = new NodeEditor(this.#node, {
      onSave: (data) => {
        if (this.#props.onSave) {
          this.#props.onSave(this.#node.id, data);
        }
        this.setMode('view');
      },
      onCancel: () => this.setMode('view'),
      onDelete: this.#props.onDelete,
    });

    this.#contentContainer.appendChild(editor.element);
    editor.focus();
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

  setMode(mode) {
    if (this.#mode === mode) return; // Skip if already in this mode
    this.#mode = mode;
    this.#updateContent(true);
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
