/**
 * Screen: RevenueScreen
 * Main screen for revenue tracking
 */

import { createElement, clearElement, getElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { RevenueState } from '../state/RevenueState.js';
import { RevenueTable } from '../components/organisms/RevenueTable.js';
import { RevenueDashboard } from '../components/organisms/RevenueDashboard.js';
import { TopRankingsView } from '../components/organisms/TopRankingsView.js';
import { CancellationAnalysisView } from '../components/organisms/CancellationAnalysisView.js';
import { AddRevenueDialog } from '../components/molecules/AddRevenueDialog.js';
import { ProvisionCascade } from '../components/molecules/ProvisionCascade.js';
import { DateRangePicker } from '../components/molecules/DateRangePicker.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { SearchBar } from '../../../hierarchy-tracking/presentation/components/molecules/SearchBar.js';
import { REVENUE_STATUS_TYPES } from '../../domain/value-objects/RevenueStatus.js';
import { Logger } from './../../../../core/utils/logger.js';
import { createWIFOImportButton } from '../../../wifo-import/WIFOImportIntegration.js';
import { BillingExportDialog } from '../../../billing-export/presentation/index.js';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// Column configuration for company table sorting
const COMPANY_COLUMNS = [
  { key: 'expand', label: '', sortable: false, className: 'th-expand' },
  { key: 'employee', label: 'Mitarbeiter', sortable: true },
  { key: 'customer', label: 'Kunde', sortable: true },
  { key: 'category', label: 'Kategorie', sortable: true },
  { key: 'product', label: 'Produkt', sortable: true },
  { key: 'revenue', label: 'Umsatz', sortable: true },
  { key: 'companyProvision', label: 'Unternehmen', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export class RevenueScreen {
  #element;
  #container;
  #revenueService;
  #hierarchyService;
  #profileService;
  #state;
  #employee;
  #employeeId;
  #treeId;
  #revenueTable;
  #unsubscribe;
  #unsubscribeRevenueListener;
  #activeTab = 'own';
  #isCompanyView = false;
  #startDate;
  #endDate;
  #expandedEntries = new Set();
  #closingEntries = new Set();
  #companySortColumn = null;
  #companySortDirection = null; // 'asc', 'desc', or null
  #viewMode = 'table'; // 'table', 'dashboard', 'rankings', 'cancellation'
  #isAnimating = false;

  constructor(container, revenueService, hierarchyService, employeeId, treeId, profileService = null) {
    this.#container = typeof container === 'string' ? getElement(container) : container;
    this.#revenueService = revenueService;
    this.#hierarchyService = hierarchyService;
    this.#profileService = profileService;
    this.#employeeId = employeeId;
    this.#treeId = treeId;
    this.#state = new RevenueState();

    // Initialize to current month (first to last day)
    const now = new Date();
    this.#startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.#endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  async #init() {
    // Check if this is the root node (company view) or Geschäftsführer
    const tree = await this.#hierarchyService.getTree(this.#treeId);

    // Check both tree nodes and Geschäftsführer nodes
    if (tree && tree.hasNode(this.#employeeId)) {
      this.#employee = tree.getNode(this.#employeeId);
      this.#isCompanyView = this.#employee.isRoot;
      this.#activeTab = this.#isCompanyView ? 'company' : 'own';
    } else {
      // 🔒 SECURITY: If employee and node not found - force logout
      if (authService.isEmployee()) {
        Logger.error('🔒 SECURITY: Employee node not found in RevenueScreen - forcing logout');
        await authService.logout();
        window.location.hash = '';
        return;
      }

      // Might be a Geschäftsführer (admin only) - create a mock employee object
      // The actual data will come from the revenue service
      this.#employee = {
        id: this.#employeeId,
        name: this.#employeeId === 'marcel-liebetrau' ? 'Marcel Liebetrau' : 'Daniel Lippa',
        isGeschaeftsfuehrer: true,
        bankProvision: 90,
        insuranceProvision: 90,
        realEstateProvision: 90,
      };
      this.#isCompanyView = false;
      this.#activeTab = 'own';
    }

    this.#element = this.#render();
    this.#setupSubscriptions();
  }

  #render() {
    const header = this.#createHeader();
    const toolbar = this.#createToolbar();
    const tabs = this.#createTabs();
    const content = createElement('div', { className: 'revenue-content' });

    const elements = [header, toolbar];
    if (tabs) elements.push(tabs);
    elements.push(content);

    return createElement('div', { className: 'revenue-screen' }, elements);
  }

  #createHeader() {
    const title = this.#isCompanyView ? 'Unternehmens-Umsätze' : 'Umsatz-Tracking';
    const subtitle = this.#employee?.name || 'Laden...';
    const titleGroupClass = this.#isCompanyView
      ? 'header-title-group header-title-group--stacked'
      : 'header-title-group header-title-group--inline';

    const user = authService.getCurrentUser();
    const userEmail = user?.email || 'User';
    const userRole = user?.role || '';

return createElement('header', { className: 'revenue-header' }, [
      createElement('div', { className: 'header-left' }, [
// Back to Organigramm button
createElement('button', {
          className: 'btn-back-to-org',
          onclick: () => {
            window.location.hash = '';
          },
          'aria-label': 'Zurück zum Organigramm',
        }, [
createElement('svg', {
            width: '20',
            height: '20',
            viewBox: '0 0 20 20',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2.5',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            style: 'display: block;',
          }, [
            createElement('path', { d: 'M13 5L7 10L13 15' }),
          ]),
        ]),
        createElement('div', { className: titleGroupClass }, [
          createElement('h1', { className: 'header-title' }, [title]),
          createElement('span', { className: 'header-separator' }, ['·']),
          createElement('span', { className: 'header-employee-name' }, [subtitle]),
        ]),
      ]),
      createElement('nav', { className: 'header-nav' }),
    ]);
  }

  async #handleLogout() {
    const confirmed = window.confirm('Möchten Sie sich wirklich abmelden?');
    if (confirmed) {
      await authService.logout();
    }
  }

  #createToolbar() {
    // Date range picker
    const dateRangePicker = new DateRangePicker({
      startDate: this.#startDate,
      endDate: this.#endDate,
      onChange: (range) => this.#onDateRangeChange(range),
    });

    const rightGroup = [];

    // View toggle for both company and employee views
    const viewToggle = this.#createViewToggle();
    rightGroup.push(viewToggle);

    // Check if employee can edit (only their own data, not subordinates)
    const canEdit = this.#canEditRevenue();

    // WIFO Import button for company view (admins)
    if (this.#isCompanyView && canEdit) {
      const wifoImportBtn = createWIFOImportButton({
        revenueService: this.#revenueService,
        hierarchyService: this.#hierarchyService,
        onImportComplete: async () => {
          // Reload data after import
          await this.#loadData();
        },
        variant: 'secondary',
      });
      rightGroup.push(wifoImportBtn);
    }

    // Only show add button for non-company view AND if user can edit
    if (!this.#isCompanyView && canEdit) {
      const addBtn = new Button({
        label: 'Neuer Umsatz',
        variant: 'primary',
        icon: new Icon({ name: 'plus', size: 16 }),
        onClick: () => this.#showAddDialog(),
      });
      rightGroup.push(addBtn.element);
    }

    // Billing export button (for admins viewing any employee OR employee viewing own)
    if (!this.#isCompanyView && (authService.isAdmin() || this.#canEditRevenue())) {
      const exportBtn = new Button({
        label: 'Abrechnung',
        variant: 'secondary',
        icon: new Icon({ name: 'download', size: 16 }),
        onClick: () => this.#showBillingExportDialog(this.#employeeId, this.#employee?.name),
      });
      rightGroup.push(exportBtn.element);
    }

    return createElement('div', { className: 'revenue-toolbar' }, [
      createElement('div', { className: 'toolbar-group' }, [dateRangePicker.element]),
      createElement('div', { className: 'toolbar-group' }, rightGroup),
    ]);
  }

  #createViewToggle() {
    const buttons = [];

    // Table button (always visible)
    buttons.push(createElement('button', {
      className: `view-toggle-btn ${this.#viewMode === 'table' ? 'active' : ''}`,
      'data-view-mode': 'table',
      onclick: () => this.#setViewMode('table'),
    }, ['Tabelle']));

    // Dashboard button (always visible)
    buttons.push(createElement('button', {
      className: `view-toggle-btn ${this.#viewMode === 'dashboard' ? 'active' : ''}`,
      'data-view-mode': 'dashboard',
      onclick: () => this.#setViewMode('dashboard'),
    }, ['Dashboard']));

    // Rankings button (only for company view)
    if (this.#isCompanyView) {
      buttons.push(createElement('button', {
        className: `view-toggle-btn ${this.#viewMode === 'rankings' ? 'active' : ''}`,
        'data-view-mode': 'rankings',
        onclick: () => this.#setViewMode('rankings'),
      }, ['Rankings']));

      // Cancellation Analysis button (only for company view)
      buttons.push(createElement('button', {
        className: `view-toggle-btn ${this.#viewMode === 'cancellation' ? 'active' : ''}`,
        'data-view-mode': 'cancellation',
        onclick: () => this.#setViewMode('cancellation'),
      }, ['Qualität']));
    }

    return createElement('div', { className: 'view-toggle' }, buttons);
  }

  #updateViewToggleButtons() {
    const buttons = this.#element.querySelectorAll('.view-toggle-btn');
    buttons.forEach((btn) => {
      const btnMode = btn.getAttribute('data-view-mode');
      if (btnMode === this.#viewMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  #setViewMode(mode) {
    if (this.#viewMode !== mode && !this.#isAnimating) {
      this.#isAnimating = true;

      const content = this.#element.querySelector('.revenue-content');
      const currentView = content?.querySelector('.revenue-own, .revenue-team, .revenue-company, .revenue-tip-provider');

      // Update button states immediately
      this.#viewMode = mode;
      this.#updateViewToggleButtons();

      if (currentView) {
        // Determine animation type based on target view
        const useBlur = mode !== 'table';
        const exitClass = useBlur ? 'view-mode-exit-blur' : 'view-mode-exit';
        const enterClass = useBlur ? 'view-mode-enter-blur' : 'view-mode-enter';
        const exitDuration = useBlur ? 300 : 250;
        const enterDuration = useBlur ? 400 : 350;

        // Remove any old animation classes first
        currentView.classList.remove('view-mode-enter', 'view-mode-enter-blur', 'view-mode-exit', 'view-mode-exit-blur');

        // Add exit animation
        currentView.classList.add(exitClass);

        // Wait for exit animation to complete
        setTimeout(() => {
          clearElement(content);

          // Render new content
          let newContent;
          if (this.#activeTab === 'company') {
            newContent = this.#renderCompanyRevenues();
          } else if (this.#activeTab === 'own') {
            newContent = this.#renderOwnRevenues();
          } else if (this.#activeTab === 'team') {
            newContent = this.#renderTeamRevenues();
          } else if (this.#activeTab === 'tipProvider') {
            newContent = this.#renderTipProviderRevenues();
          }

          content.appendChild(newContent);

          // Wait for browser to complete layout before animating
          requestAnimationFrame(() => {
            // Trigger enter animation after layout is stable
            newContent.classList.add(enterClass);

            // Unlock after animation completes
            setTimeout(() => {
              this.#isAnimating = false;
            }, enterDuration);
          });
        }, exitDuration);
      } else {
        this.#rerender();
        this.#isAnimating = false;
      }
    }
  }

  #rerender() {
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
    this.#renderContent();
  }

  #onDateRangeChange(range) {
    this.#startDate = range.startDate;
    this.#endDate = range.endDate;

    // Animate content change
    const content = this.#element.querySelector('.revenue-content');
    const currentView = content?.firstElementChild;

    if (currentView && !this.#isAnimating) {
      this.#isAnimating = true;

      // Remove any old animation classes
      currentView.classList.remove('date-range-exit', 'date-range-enter');

      // Fade out current content
      currentView.classList.add('date-range-exit');

      setTimeout(() => {
        this.#renderContent();

        const newView = content?.firstElementChild;
        if (newView) {
          // Use requestAnimationFrame to ensure browser has painted before animating
          requestAnimationFrame(() => {
            newView.classList.add('date-range-enter');

            setTimeout(() => {
              this.#isAnimating = false;
            }, 400);
          });
        } else {
          this.#isAnimating = false;
        }
      }, 250);
    } else {
      this.#renderContent();
    }
  }

  #formatDateRangeDisplay() {
    if (!this.#startDate || !this.#endDate) {
      return 'Gesamter Zeitraum';
    }

    const formatDate = (date) => {
      const day = date.getDate();
      const month = MONTH_NAMES[date.getMonth()];
      const year = date.getFullYear();
      return `${day}. ${month} ${year}`;
    };

    return `${formatDate(this.#startDate)} — ${formatDate(this.#endDate)}`;
  }

  #filterEntriesByDateRange(entries) {
    if (!this.#startDate || !this.#endDate) {
      return entries;
    }

    return entries.filter((entry) => {
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return entryDate >= this.#startDate && entryDate <= this.#endDate;
    });
  }

  #filterHierarchicalEntriesByDateRange(entries) {
    if (!this.#startDate || !this.#endDate) {
      return entries;
    }

    return entries.filter((entry) => {
      const originalEntry = entry.originalEntry;
      const entryDate = new Date(originalEntry.entryDate || originalEntry.createdAt);
      return entryDate >= this.#startDate && entryDate <= this.#endDate;
    });
  }

  #createTabs() {
    if (this.#isCompanyView) {
      // Company view: no tabs needed (only one view)
      return null;
    }

    const isGeschaeftsfuehrer = this.#employee?.isGeschaeftsfuehrer || false;

    // Create tabs based on role
    const ownTab = createElement('button', {
      className: `revenue-tab ${this.#activeTab === 'own' ? 'active' : ''}`,
      onclick: () => this.#switchTab('own'),
    }, ['Eigene Umsätze']);

    const tipProviderTab = createElement('button', {
      className: `revenue-tab ${this.#activeTab === 'tipProvider' ? 'active' : ''}`,
      onclick: () => this.#switchTab('tipProvider'),
    }, ['Tippgeber-Umsätze']);

    // Geschäftsführer: only "Eigene" + "Tippgeber" tabs (no team)
    if (isGeschaeftsfuehrer) {
      return createElement('div', { className: 'revenue-tabs' }, [ownTab, tipProviderTab]);
    }

    // Regular employees: all three tabs
    const teamTab = createElement('button', {
      className: `revenue-tab ${this.#activeTab === 'team' ? 'active' : ''}`,
      onclick: () => this.#switchTab('team'),
    }, ['Team-Umsätze']);

    return createElement('div', { className: 'revenue-tabs' }, [ownTab, teamTab, tipProviderTab]);
  }

  #switchTab(tab) {
    if (this.#activeTab === tab || this.#isAnimating) return;

    this.#isAnimating = true;

    const content = this.#element.querySelector('.revenue-content');
    const currentView = content?.firstElementChild;

    // Update tab buttons immediately
    const tabs = this.#element.querySelectorAll('.revenue-tab');
    const isGeschaeftsfuehrer = this.#employee?.isGeschaeftsfuehrer || false;

    tabs.forEach((t, i) => {
      if (this.#isCompanyView) {
        t.classList.toggle('active', i === 0 && tab === 'company');
      } else if (isGeschaeftsfuehrer) {
        // Geschäftsführer: only 2 tabs (own, tipProvider)
        t.classList.toggle('active',
          (i === 0 && tab === 'own') ||
          (i === 1 && tab === 'tipProvider')
        );
      } else {
        // Regular employees: 3 tabs (own, team, tipProvider)
        t.classList.toggle('active',
          (i === 0 && tab === 'own') ||
          (i === 1 && tab === 'team') ||
          (i === 2 && tab === 'tipProvider')
        );
      }
    });

    // Animate out current content
    if (currentView) {
      // Remove any old animation classes first
      currentView.classList.remove('tab-exit', 'tab-exit-left', 'tab-exit-right', 'tab-enter', 'tab-enter-left', 'tab-enter-right', 'tab-enter-active');

      // Add exit animation (unified, no direction)
      currentView.classList.add('tab-exit');

      // Wait for exit animation to complete
      setTimeout(() => {
        this.#activeTab = tab;
        clearElement(content);

        // Render new content directly (same as view-mode)
        let newContent;
        if (this.#activeTab === 'own') {
          newContent = this.#renderOwnRevenues();
        } else if (this.#activeTab === 'team') {
          newContent = this.#renderTeamRevenues();
        } else if (this.#activeTab === 'tipProvider') {
          newContent = this.#renderTipProviderRevenues();
        }

        content.appendChild(newContent);

        // Wait for browser to complete layout before animating
        requestAnimationFrame(() => {
          // Add enter animation after layout is stable
          newContent.classList.add('tab-enter-active');

          // Unlock after animation completes
          setTimeout(() => {
            this.#isAnimating = false;
          }, 350);
        });
      }, 250);
    } else {
      this.#activeTab = tab;
      this.#renderContent();
      this.#isAnimating = false;
    }
  }


  #setupSubscriptions() {
    this.#unsubscribe = this.#state.subscribe(() => {
      // Don't re-render during animations to prevent flicker
      if (!this.#isAnimating) {
        this.#renderContent();
      }
    });
  }

  async #loadData() {
    this.#state.setLoading(true);

    try {
      const tree = await this.#hierarchyService.getTree(this.#treeId);
      if (tree && tree.hasNode(this.#employeeId)) {
        this.#employee = tree.getNode(this.#employeeId);
      }

      if (this.#isCompanyView) {
        // Load all company revenues
        const companyEntries = await this.#revenueService.getCompanyRevenues(
          this.#employeeId,
          this.#treeId,
        );
        this.#state.setCompanyEntries(companyEntries);
      } else {
        // Load employee's own revenues
        const entries = await this.#revenueService.getEntriesByEmployee(this.#employeeId);
        this.#state.setEntries(entries);

        // Load hierarchical revenues (from subordinates)
        const hierarchicalEntries = await this.#revenueService.getHierarchicalRevenues(
          this.#employeeId,
          this.#treeId,
        );
        this.#state.setHierarchicalEntries(hierarchicalEntries);

        // Load tip provider revenues (entries where this employee is tip provider)
        const tipProviderEntries = await this.#revenueService.getEntriesByTipProvider(this.#employeeId);
        this.#state.setTipProviderEntries(tipProviderEntries);
      }
    } catch (error) {
      Logger.error('Failed to load revenue data:', error);
      this.#state.setError(error.message);
    } finally {
      this.#state.setLoading(false);
    }
  }

  #updateEmployeeName() {
    const nameEl = this.#element.querySelector('.header-employee-name');
    if (nameEl && this.#employee) {
      nameEl.textContent = this.#employee.name;
    }
  }

  #renderContent() {
    const content = this.#element.querySelector('.revenue-content');
    clearElement(content);

    const state = this.#state.getState();

    if (state.isLoading) {
      content.appendChild(this.#renderLoading());
      return;
    }

    if (state.error) {
      content.appendChild(this.#renderError(state.error));
      return;
    }

    if (this.#activeTab === 'company') {
      content.appendChild(this.#renderCompanyRevenues());
    } else if (this.#activeTab === 'own') {
      content.appendChild(this.#renderOwnRevenues());
    } else if (this.#activeTab === 'team') {
      content.appendChild(this.#renderTeamRevenues());
    } else if (this.#activeTab === 'tipProvider') {
      content.appendChild(this.#renderTipProviderRevenues());
    }
  }

  #renderLoading() {
    return createElement('div', { className: 'revenue-loading' }, [
      createElement('div', { className: 'loading-spinner' }),
      createElement('p', {}, ['Laden...']),
    ]);
  }

  #renderError(error) {
    return createElement('div', { className: 'revenue-error' }, [
      createElement('p', {}, [`Fehler: ${error}`]),
      new Button({
        label: 'Erneut versuchen',
        variant: 'outline',
        onClick: () => this.#loadData(),
      }).element,
    ]);
  }

  #renderOwnRevenues() {
    const state = this.#state.getState();
    let entries = state.searchQuery ? this.#state.filteredEntries : state.entries;

    // Apply date range filter
    entries = this.#filterEntriesByDateRange(entries);

    // Dashboard view - show only own data
    if (this.#viewMode === 'dashboard') {
      const dashboard = new RevenueDashboard({
        entries: entries,
        employee: this.#employee,
        mode: 'own',
        startDate: this.#startDate,
        endDate: this.#endDate,
      });

      return createElement('div', { className: 'revenue-own' }, [
        dashboard.element,
      ]);
    }

    // Table view (default)
    // Filter out rejected and cancelled entries for calculations
    const activeEntries = entries.filter(
      (e) => e.status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             e.status?.type !== REVENUE_STATUS_TYPES.CANCELLED,
    );

    // Stats bar (exclude rejected entries from totals)
    const totalRevenue = activeEntries.reduce((sum, e) => sum + e.provisionAmount, 0);
    const totalProvision = this.#calculateTotalProvision(activeEntries);

    const statsBar = createElement('div', { className: 'revenue-stats-bar' }, [
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Einträge:']),
        createElement('span', { className: 'stat-value' }, [activeEntries.length.toString()]),
      ]),
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Umsatz:']),
        createElement('span', { className: 'stat-value' }, [`${totalRevenue.toFixed(2)} EUR`]),
      ]),
      createElement('div', { className: 'stat-item highlight' }, [
        createElement('span', { className: 'stat-label' }, ['Ihre Provision:']),
        createElement('span', { className: 'stat-value' }, [`${totalProvision.toFixed(2)} EUR`]),
      ]),
    ]);

    // Period header
    const periodHeader = createElement('div', { className: 'period-header' }, [
      createElement('h2', { className: 'period-title' }, [
        this.#formatDateRangeDisplay(),
      ]),
    ]);

    // Revenue table
    const canEdit = this.#canEditRevenue();

    this.#revenueTable = new RevenueTable({
      entries,
      employee: this.#employee,
      onEdit: canEdit ? (entry) => this.#handleEdit(entry) : null,
      onDelete: canEdit ? (entry) => this.#handleDelete(entry) : null,
      onStatusChange: canEdit ? (entryId, newStatus) => this.#handleStatusChange(entryId, newStatus) : null,
    });

    return createElement('div', { className: 'revenue-own' }, [
      periodHeader,
      statsBar,
      this.#revenueTable.element,
    ]);
  }

  #renderTeamRevenues() {
    const state = this.#state.getState();
    let entries = state.hierarchicalEntries;

    // Apply date range filter to team entries
    entries = this.#filterHierarchicalEntriesByDateRange(entries);

    // Dashboard view - show only team data
    if (this.#viewMode === 'dashboard') {
      const dashboard = new RevenueDashboard({
        entries: entries,
        employee: this.#employee,
        mode: 'team',
        startDate: this.#startDate,
        endDate: this.#endDate,
      });

      return createElement('div', { className: 'revenue-team' }, [
        dashboard.element,
      ]);
    }

    // Period header
    const periodHeader = createElement('div', { className: 'period-header' }, [
      createElement('h2', { className: 'period-title' }, [
        this.#formatDateRangeDisplay(),
      ]),
    ]);

    if (entries.length === 0) {
      return createElement('div', { className: 'revenue-team' }, [
        periodHeader,
        createElement('div', { className: 'revenue-empty-state' }, [
          createElement('h3', { className: 'empty-state-title' }, [
            'Keine Team-Umsätze in diesem Monat',
          ]),
          createElement('p', { className: 'empty-state-text' }, [
            'Umsätze von Mitarbeitern erscheinen hier',
          ]),
        ]),
      ]);
    }

    // Filter out rejected and cancelled entries for calculations
    const activeEntries = entries.filter(
      (e) => e.originalEntry?.status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             e.originalEntry?.status?.type !== REVENUE_STATUS_TYPES.CANCELLED,
    );

    const totalProvision = activeEntries.reduce((sum, e) => sum + e.managerProvisionAmount, 0);

    const statsBar = createElement('div', { className: 'revenue-stats-bar' }, [
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Team-Einträge:']),
        createElement('span', { className: 'stat-value' }, [activeEntries.length.toString()]),
      ]),
      createElement('div', { className: 'stat-item highlight' }, [
        createElement('span', { className: 'stat-label' }, ['Ihre Gesamt-Provision:']),
        createElement('span', { className: 'stat-value' }, [`${totalProvision.toFixed(2)} EUR`]),
      ]),
    ]);

    const tableRows = entries.map((entry) => this.#renderHierarchicalRow(entry));
    const table = createElement('table', { className: 'revenue-table hierarchical-table' }, [
      createElement('thead', {}, [
        createElement('tr', {}, [
          createElement('th', {}, ['Mitarbeiter']),
          createElement('th', {}, ['Kunde']),
          createElement('th', {}, ['Kategorie']),
          createElement('th', { className: 'text-right' }, ['Umsatz']),
          createElement('th', { className: 'text-right' }, ['MA-%']),
          createElement('th', { className: 'text-right' }, ['Ihre-%']),
          createElement('th', { className: 'text-right' }, ['Ihre Provision']),
        ]),
      ]),
      createElement('tbody', {}, tableRows),
    ]);

    return createElement('div', { className: 'revenue-team' }, [
      periodHeader,
      statsBar,
      createElement('div', { className: 'revenue-table-container' }, [table]),
    ]);
  }

  #renderTipProviderRevenues() {
    const state = this.#state.getState();
    let entries = state.tipProviderEntries;

    // Apply date range filter
    entries = this.#filterEntriesByDateRange(entries);

    // Dashboard view - show tip provider data
    if (this.#viewMode === 'dashboard') {
      const dashboard = new RevenueDashboard({
        entries: entries,
        employee: this.#employee,
        mode: 'tipProvider',
        startDate: this.#startDate,
        endDate: this.#endDate,
      });

      return createElement('div', { className: 'revenue-tip-provider' }, [
        dashboard.element,
      ]);
    }

    // Period header
    const periodHeader = createElement('div', { className: 'period-header' }, [
      createElement('h2', { className: 'period-title' }, [
        this.#formatDateRangeDisplay(),
      ]),
    ]);

    if (entries.length === 0) {
      return createElement('div', { className: 'revenue-tip-provider' }, [
        periodHeader,
        createElement('div', { className: 'revenue-empty-state' }, [
          createElement('h3', { className: 'empty-state-title' }, [
            'Keine Tippgeber-Umsätze in diesem Monat',
          ]),
          createElement('p', { className: 'empty-state-text' }, [
            'Umsätze bei denen Sie als Tippgeber beteiligt sind erscheinen hier',
          ]),
        ]),
      ]);
    }

    // Filter out rejected and cancelled entries for calculations
    const activeEntries = entries.filter(
      (e) => e.status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             e.status?.type !== REVENUE_STATUS_TYPES.CANCELLED,
    );

    const totalTipProviderProvision = activeEntries.reduce(
      (sum, entry) => sum + (entry.tipProviderProvisionAmount || 0),
      0
    );

    const statsBar = createElement('div', { className: 'revenue-stats-bar' }, [
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Tippgeber-Einträge:']),
        createElement('span', { className: 'stat-value' }, [activeEntries.length.toString()]),
      ]),
      createElement('div', { className: 'stat-item highlight' }, [
        createElement('span', { className: 'stat-label' }, ['Ihre Tippgeber-Provision:']),
        createElement('span', { className: 'stat-value' }, [`${totalTipProviderProvision.toFixed(2)} EUR`]),
      ]),
    ]);

    const tableRows = entries.map((entry) => this.#renderTipProviderRow(entry));
    const table = createElement('table', { className: 'revenue-table tip-provider-table' }, [
      createElement('thead', {}, [
        createElement('tr', {}, [
          createElement('th', {}, ['Datum']),
          createElement('th', {}, ['Mitarbeiter']),
          createElement('th', {}, ['Kunde']),
          createElement('th', {}, ['Kategorie']),
          createElement('th', {}, ['Produkt']),
          createElement('th', { className: 'text-right' }, ['Umsatz']),
          createElement('th', { className: 'text-right' }, ['Ihre %']),
          createElement('th', { className: 'text-right' }, ['Ihre Provision']),
          createElement('th', {}, ['Status']),
        ]),
      ]),
      createElement('tbody', {}, tableRows),
    ]);

    return createElement('div', { className: 'revenue-tip-provider' }, [
      periodHeader,
      statsBar,
      createElement('div', { className: 'revenue-table-container' }, [table]),
    ]);
  }

  #renderCompanyRevenues() {
    const state = this.#state.getState();
    let entries = state.companyEntries;

    // Apply date range filter to company entries
    entries = this.#filterHierarchicalEntriesByDateRange(entries);

    // Period header
    const periodHeader = createElement('div', { className: 'period-header' }, [
      createElement('h2', { className: 'period-title' }, [
        this.#formatDateRangeDisplay(),
      ]),
    ]);

    if (entries.length === 0) {
      return createElement('div', { className: 'revenue-company' }, [
        periodHeader,
        createElement('div', { className: 'revenue-empty-state' }, [
          createElement('h3', { className: 'empty-state-title' }, [
            'Keine Umsätze in diesem Monat',
          ]),
          createElement('p', { className: 'empty-state-text' }, [
            'Umsätze von allen Mitarbeitern erscheinen hier',
          ]),
        ]),
      ]);
    }

    // Dashboard view for company
    if (this.#viewMode === 'dashboard') {
      const dashboard = new RevenueDashboard({
        entries: entries,
        employee: this.#employee,
        mode: 'company',
        startDate: this.#startDate,
        endDate: this.#endDate,
      });

      return createElement('div', { className: 'revenue-company' }, [
        periodHeader,
        dashboard.element,
      ]);
    }

    // Rankings view for company
    if (this.#viewMode === 'rankings') {
      const rankings = new TopRankingsView({
        entries: entries,
        employee: this.#employee,
      });

      return createElement('div', { className: 'revenue-company' }, [
        periodHeader,
        rankings.element,
      ]);
    }

    // Cancellation Analysis view for company
    if (this.#viewMode === 'cancellation') {
      const cancellation = new CancellationAnalysisView({
        entries: entries,
        employee: this.#employee,
      });

      return createElement('div', { className: 'revenue-company' }, [
        periodHeader,
        cancellation.element,
      ]);
    }

    // Apply sorting
    const sortedEntries = this.#applySortingToCompanyEntries(entries);

    // Filter out rejected and cancelled entries for calculations
    const activeEntries = sortedEntries.filter(
      (e) => e.originalEntry?.status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             e.originalEntry?.status?.type !== REVENUE_STATUS_TYPES.CANCELLED,
    );

    const totalRevenue = activeEntries.reduce((sum, e) => sum + e.originalEntry.provisionAmount, 0);
    const totalCompanyProvision = activeEntries.reduce((sum, e) => sum + e.companyProvisionAmount, 0);

    const statsBar = createElement('div', { className: 'revenue-stats-bar' }, [
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Gesamt-Einträge:']),
        createElement('span', { className: 'stat-value' }, [activeEntries.length.toString()]),
      ]),
      createElement('div', { className: 'stat-item' }, [
        createElement('span', { className: 'stat-label' }, ['Gesamt-Umsatz:']),
        createElement('span', { className: 'stat-value' }, [this.#formatCurrency(totalRevenue)]),
      ]),
      createElement('div', { className: 'stat-item highlight' }, [
        createElement('span', { className: 'stat-label' }, ['Unternehmens-Anteil:']),
        createElement('span', { className: 'stat-value' }, [this.#formatCurrency(totalCompanyProvision)]),
      ]),
    ]);

    // Build table rows with expandable cascade
    const tableBody = createElement('tbody', {});
    sortedEntries.forEach((entry) => {
      const { mainRow, cascadeRow } = this.#renderCompanyTableRow(entry);
      tableBody.appendChild(mainRow);
      if (cascadeRow) {
        tableBody.appendChild(cascadeRow);
      }
    });

    // Build sortable header
    const headerCells = COMPANY_COLUMNS.map((col) => {
      const isActive = this.#companySortColumn === col.key;
      const classes = [];
      if (col.className) classes.push(col.className);
      if (col.sortable) {
        classes.push('sortable');
        if (isActive) {
          classes.push('sort-active');
          classes.push(`sort-${this.#companySortDirection}`);
        }
      }

      const headerContent = [col.label];
      if (col.sortable) {
        headerContent.push(this.#renderSortIndicator(isActive ? this.#companySortDirection : null));
      }

      const th = createElement('th', { className: classes.join(' ') }, headerContent);
      if (col.sortable) {
        th.addEventListener('click', () => this.#handleCompanySort(col.key));
      }

      return th;
    });

    const table = createElement('table', { className: 'revenue-table company-table' }, [
      createElement('thead', {}, [
        createElement('tr', {}, headerCells),
      ]),
      tableBody,
    ]);

    return createElement('div', { className: 'revenue-company' }, [
      periodHeader,
      statsBar,
      createElement('div', { className: 'revenue-table-container' }, [table]),
    ]);
  }

  #renderSortIndicator(direction) {
    const wrapper = createElement('span', { className: 'sort-indicator' });

    if (direction === 'asc') {
      wrapper.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7-7 7 7"/></svg>`;
    } else if (direction === 'desc') {
      wrapper.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7 7 7-7"/></svg>`;
    } else {
      // Neutral state - show both arrows
      wrapper.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5-5 5 5"/><path d="M7 14l5 5 5-5"/></svg>`;
    }

    return wrapper;
  }

  #handleCompanySort(columnKey) {
    if (this.#companySortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (this.#companySortDirection === 'asc') {
        this.#companySortDirection = 'desc';
      } else if (this.#companySortDirection === 'desc') {
        this.#companySortColumn = null;
        this.#companySortDirection = null;
      }
    } else {
      this.#companySortColumn = columnKey;
      this.#companySortDirection = 'asc';
    }

    this.#renderContent();
  }

  #applySortingToCompanyEntries(entries) {
    if (!this.#companySortColumn || !this.#companySortDirection) {
      return entries;
    }

    const direction = this.#companySortDirection === 'asc' ? 1 : -1;

    return [...entries].sort((a, b) => {
      const valueA = this.#getCompanySortValue(a, this.#companySortColumn);
      const valueB = this.#getCompanySortValue(b, this.#companySortColumn);

      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB, 'de') * direction;
      }

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }

  #getCompanySortValue(entry, columnKey) {
    switch (columnKey) {
      case 'employee':
        return (entry.entryOwner?.name || entry.employee?.name || '').toLowerCase();
      case 'customer':
        return entry.originalEntry?.customerName?.toLowerCase() || '';
      case 'category':
        return entry.originalEntry?.category?.displayName?.toLowerCase() || '';
      case 'product':
        return entry.originalEntry?.product?.name?.toLowerCase() || '';
      case 'revenue':
        return entry.originalEntry?.provisionAmount || 0;
      case 'companyProvision':
        return entry.companyProvisionAmount || 0;
      case 'status':
        return entry.originalEntry?.status?.displayName?.toLowerCase() || '';
      default:
        return '';
    }
  }

  #renderCompanyTableRow(entry) {
    const entryId = entry.id;
    const isExpanded = this.#expandedEntries.has(entryId);
    const employeeName = entry.entryOwner?.name || entry.employee?.name || 'Unbekannt';
    const status = entry.originalEntry.status;
    const isExcluded = status.type === REVENUE_STATUS_TYPES.REJECTED ||
                       status.type === REVENUE_STATUS_TYPES.CANCELLED;

    // Expand/collapse button
    const isClosing = this.#closingEntries.has(entryId);
    const btnClasses = ['row-expand-btn'];
    if (isExpanded && !isClosing) btnClasses.push('expanded');
    if (isClosing) btnClasses.push('closing');

    const expandBtn = createElement('button', {
      className: btnClasses.join(' '),
      onclick: (e) => {
        e.stopPropagation();
        if (!isClosing) this.#toggleEntryExpansion(entryId);
      },
      title: 'Provisionsverteilung anzeigen',
    }, [
      createElement('span', { className: 'expand-chevron' }, ['▶']),
    ]);

    // Custom status dropdown for company view - all status options
    const statusDropdown = this.#createCompanyStatusDropdown(entry, status);

    // Build row class name
    const rowClasses = ['company-row'];
    if (isExpanded) rowClasses.push('row-expanded');
    if (isExcluded) rowClasses.push('row-rejected');

    // Main data row
    const mainRow = createElement('tr', {
      className: rowClasses.join(' '),
      'data-entry-id': entryId,
    }, [
      createElement('td', { className: 'td-expand' }, [expandBtn]),
      createElement('td', { className: 'td-employee' }, [
        createElement('span', { className: 'employee-name' }, [employeeName]),
        this.#createEmployeeExportButton(entry),
      ]),
      createElement('td', {}, [entry.originalEntry.customerName]),
      createElement('td', {}, [entry.originalEntry.category.displayName]),
      createElement('td', {}, [entry.originalEntry.product.name]),
      this.#renderCompanyRevenueAmountCell(entry.originalEntry, 'text-left'),
      createElement('td', { className: 'text-left' }, [
        this.#formatCurrency(entry.companyProvisionAmount),
      ]),
      createElement('td', { className: 'td-status' }, [statusDropdown]),
    ]);

    // Cascade row (only if expanded)
    let cascadeRow = null;
    if (isExpanded) {
      const cascade = new ProvisionCascade(entry);
      const cascadeClasses = ['cascade-row'];
      if (isExcluded) cascadeClasses.push('cascade-rejected');

      const isClosing = this.#closingEntries.has(entryId);
      const containerClasses = ['cascade-container'];
      if (isClosing) containerClasses.push('cascade-closing');

      cascadeRow = createElement('tr', { className: cascadeClasses.join(' ') }, [
        createElement('td', { colspan: '8', className: 'cascade-cell' }, [
          createElement('div', { className: containerClasses.join(' ') }, [
            cascade.element,
          ]),
        ]),
      ]);
    }

    return { mainRow, cascadeRow };
  }

  #createEmployeeExportButton(entry) {
    const employeeId = entry.entryOwner?.id || entry.originalEntry?.employeeId;
    const employeeName = entry.entryOwner?.name || entry.employee?.name || 'Mitarbeiter';

    const btn = createElement('button', {
      className: 'employee-export-btn',
      title: `Abrechnung für ${employeeName} exportieren`,
      onclick: (e) => {
        e.stopPropagation();
        this.#showBillingExportDialog(employeeId, employeeName);
      },
    });

    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`;

    return btn;
  }

  #toggleEntryExpansion(entryId) {
    const tableBody = this.#element.querySelector('.company-table tbody');
    if (!tableBody) return;

    // Find the main row for this entry
    const mainRow = tableBody.querySelector(`tr.company-row[data-entry-id="${entryId}"]`);
    if (!mainRow) return;

    const expandBtn = mainRow.querySelector('.row-expand-btn');

    if (this.#expandedEntries.has(entryId)) {
      // CLOSE: Animate out, then remove
      this.#closingEntries.add(entryId);

      // Update button state
      if (expandBtn) {
        expandBtn.classList.remove('expanded');
        expandBtn.classList.add('closing');
      }
      mainRow.classList.remove('row-expanded');

      // Find and animate the cascade row
      const cascadeRow = mainRow.nextElementSibling;
      if (cascadeRow && cascadeRow.classList.contains('cascade-row')) {
        const container = cascadeRow.querySelector('.cascade-container');
        if (container) {
          container.classList.add('cascade-closing');
        }

        // Remove after animation completes
        setTimeout(() => {
          this.#expandedEntries.delete(entryId);
          this.#closingEntries.delete(entryId);
          cascadeRow.remove();
          if (expandBtn) {
            expandBtn.classList.remove('closing');
          }
        }, 250);
      } else {
        // Fallback: just clean up state
        this.#expandedEntries.delete(entryId);
        this.#closingEntries.delete(entryId);
        if (expandBtn) {
          expandBtn.classList.remove('closing');
        }
      }
    } else {
      // OPEN: Create and insert cascade row
      this.#expandedEntries.add(entryId);

      // Update button and row state
      if (expandBtn) {
        expandBtn.classList.add('expanded');
      }
      mainRow.classList.add('row-expanded');

      // Find the entry data and create cascade row
      const state = this.#state.getState();
      const entries = this.#filterHierarchicalEntriesByDateRange(state.companyEntries);
      const entry = entries.find((e) => e.id === entryId);

      if (entry) {
        const cascade = new ProvisionCascade(entry);
        const isExcluded = entry.originalEntry?.status?.type === REVENUE_STATUS_TYPES.REJECTED ||
                          entry.originalEntry?.status?.type === REVENUE_STATUS_TYPES.CANCELLED;

        const cascadeClasses = ['cascade-row'];
        if (isExcluded) cascadeClasses.push('cascade-rejected');

        const cascadeRow = createElement('tr', { className: cascadeClasses.join(' ') }, [
          createElement('td', { colspan: '8', className: 'cascade-cell' }, [
            createElement('div', { className: 'cascade-container' }, [
              cascade.element,
            ]),
          ]),
        ]);

        // Insert after main row
        mainRow.after(cascadeRow);
      }
    }
  }

  async #handleStatusChange(entryId, newStatus) {
    try {
      await this.#revenueService.updateEntryStatus(entryId, newStatus);
      // Reload data to reflect changes
      await this.#loadData();
    } catch (error) {
      Logger.error('Failed to update status:', error);
    }
  }

  #createCompanyStatusDropdown(entry, currentStatus) {
    const statusOptions = [
      { value: REVENUE_STATUS_TYPES.SUBMITTED, label: 'Eingereicht' },
      { value: REVENUE_STATUS_TYPES.PROVISIONED, label: 'Provisioniert' },
      { value: REVENUE_STATUS_TYPES.REJECTED, label: 'Abgelehnt' },
      { value: REVENUE_STATUS_TYPES.CANCELLED, label: 'Storniert' },
    ];

    const dropdown = createElement('div', {
      className: 'status-dropdown',
    });

    // Chevron SVG
    const chevronSvg = `<svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

    // Trigger button
    const trigger = createElement('button', {
      type: 'button',
      className: `status-dropdown-trigger status-${currentStatus.type}`,
    });
    trigger.innerHTML = `<span>${currentStatus.displayName}</span>${chevronSvg}`;

    // Dropdown menu - will be portaled to body
    const menu = createElement('div', { className: 'status-dropdown-menu' });

    statusOptions.forEach((option) => {
      const isActive = option.value === currentStatus.type;
      const item = createElement('div', {
        className: `status-dropdown-item status-${option.value}${isActive ? ' active' : ''}`,
      }, [option.label]);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (option.value !== currentStatus.type) {
          this.#handleStatusChange(entry.originalEntry.id, option.value);
        }
        this.#closeStatusDropdown(dropdown, menu);
      });

      menu.appendChild(item);
    });

    dropdown.appendChild(trigger);

    // Position and show menu function
    const positionMenu = () => {
      const rect = trigger.getBoundingClientRect();
      menu.style.left = `${rect.left + rect.width / 2 - menu.offsetWidth / 2}px`;
      menu.style.top = `${rect.bottom + 2}px`;
    };

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');

      // Close all other dropdowns first
      document.querySelectorAll('.status-dropdown-menu.open').forEach((m) => {
        m.classList.remove('open');
      });
      document.querySelectorAll('.status-dropdown.open').forEach((d) => {
        d.classList.remove('open');
      });

      if (!isOpen) {
        // Portal menu to body if not already there
        if (!menu.parentElement || menu.parentElement !== document.body) {
          document.body.appendChild(menu);
        }
        dropdown.classList.add('open');
        menu.classList.add('open');
        positionMenu();
      }
    });

    // Close dropdown when clicking outside
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
        this.#closeStatusDropdown(dropdown, menu);
      }
    };
    document.addEventListener('click', closeHandler);

    // Reposition on scroll
    const scrollHandler = () => {
      if (dropdown.classList.contains('open')) {
        positionMenu();
      }
    };
    window.addEventListener('scroll', scrollHandler, true);

    return dropdown;
  }

  #closeStatusDropdown(dropdown, menu) {
    dropdown.classList.remove('open');
    menu.classList.remove('open');
  }

  #renderCompanyRevenueAmountCell(entry, alignment = 'text-right') {
    if (entry.hasVAT) {
      // Show Netto + Brutto for accounting
      return createElement('td', { className: alignment }, [
        createElement('div', { className: 'revenue-amount-with-vat' }, [
          createElement('div', { className: 'revenue-net' }, [
            createElement('span', { className: 'amount-label' }, ['Netto: ']),
            createElement('span', { className: 'currency-value' }, [
              this.#formatCurrency(entry.netAmount),
            ]),
          ]),
          createElement('div', { className: 'revenue-gross' }, [
            createElement('span', { className: 'amount-label' }, ['Brutto: ']),
            createElement('span', { className: 'currency-value' }, [
              this.#formatCurrency(entry.grossAmount),
            ]),
          ]),
        ]),
      ]);
    } else {
      // Show only amount (no VAT)
      return createElement('td', { className: alignment }, [
        this.#formatCurrency(entry.provisionAmount),
      ]);
    }
  }

  #formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  #renderHierarchicalRow(entry) {
    const revenueCell = entry.originalEntry.hasVAT
      ? createElement('td', { className: 'text-right' }, [
          createElement('div', { className: 'revenue-amount-with-vat' }, [
            createElement('div', { className: 'revenue-net' }, [
              createElement('span', { className: 'amount-label' }, ['Netto: ']),
              this.#formatCurrency(entry.originalEntry.netAmount),
            ]),
            createElement('div', { className: 'revenue-gross' }, [
              createElement('span', { className: 'amount-label' }, ['Brutto: ']),
              this.#formatCurrency(entry.originalEntry.grossAmount),
            ]),
          ]),
        ])
      : createElement('td', { className: 'text-right' }, [
          this.#formatCurrency(entry.originalEntry.provisionAmount),
        ]);

    return createElement('tr', {}, [
      createElement('td', {}, [entry.owner.name]),
      createElement('td', {}, [entry.originalEntry.customerName]),
      createElement('td', {}, [entry.originalEntry.category.displayName]),
      revenueCell,
      createElement('td', { className: 'text-right' }, [
        `${entry.ownerProvisionPercentage.toFixed(1)}%`,
      ]),
      createElement('td', { className: 'text-right' }, [
        `${entry.managerProvisionPercentage.toFixed(1)}%`,
      ]),
      createElement('td', { className: 'text-right' }, [
        createElement('span', { className: 'provision-badge' }, [
          `${entry.managerProvisionAmount.toFixed(2)} EUR`,
        ]),
      ]),
    ]);
  }

  #renderTipProviderRow(entry) {
    const tipProviderPercent = entry.tipProviderProvisionPercentage || 0;
    const tipProviderAmount = entry.tipProviderProvisionAmount || 0;
    const ownerName = entry.hierarchySnapshot?.ownerName || 'Unbekannt';
    const status = entry.status;
    const statusClass = `status-${status.type}`;

    // Format date
    const dateStr = this.#formatDate(entry.entryDate);

    const revenueCell = entry.hasVAT
      ? createElement('td', { className: 'text-right' }, [
          createElement('div', { className: 'revenue-amount-with-vat' }, [
            createElement('div', { className: 'revenue-net' }, [
              createElement('span', { className: 'amount-label' }, ['Netto: ']),
              this.#formatCurrency(entry.netAmount),
            ]),
            createElement('div', { className: 'revenue-gross' }, [
              createElement('span', { className: 'amount-label' }, ['Brutto: ']),
              this.#formatCurrency(entry.grossAmount),
            ]),
          ]),
        ])
      : createElement('td', { className: 'text-right' }, [
          this.#formatCurrency(entry.provisionAmount),
        ]);

    return createElement('tr', {}, [
      createElement('td', {}, [dateStr]),
      createElement('td', {}, [ownerName]),
      createElement('td', {}, [entry.customerName]),
      createElement('td', {}, [entry.category.displayName]),
      createElement('td', {}, [entry.product.name]),
      revenueCell,
      createElement('td', { className: 'text-right' }, [
        `${tipProviderPercent.toFixed(1)}%`,
      ]),
      createElement('td', { className: 'text-right' }, [
        createElement('span', { className: 'provision-badge tip-provider' }, [
          `${tipProviderAmount.toFixed(2)} EUR`,
        ]),
      ]),
      createElement('td', {}, [
        createElement('span', { className: `status-badge ${statusClass}` }, [
          status.displayName,
        ]),
      ]),
    ]);
  }

  #formatDate(date) {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  #calculateTotalProvision(entries) {
    if (!this.#employee) return 0;

    return entries.reduce((sum, entry) => {
      const provision = this.#getProvisionForCategory(entry.category.type);
      return sum + entry.provisionAmount * (provision / 100);
    }, 0);
  }

  #getProvisionForCategory(categoryType) {
    if (!this.#employee) return 0;

    switch (categoryType) {
      case 'bank':
        return this.#employee.bankProvision;
      case 'insurance':
        return this.#employee.insuranceProvision;
      case 'realEstate':
      case 'propertyManagement':
        return this.#employee.realEstateProvision;
      default:
        return 0;
    }
  }

  #showAddDialog() {
    const dialog = new AddRevenueDialog({
      revenueService: this.#revenueService,
      hierarchyService: this.#hierarchyService,
      employeeId: this.#employeeId,
      onSave: async (data) => {
        try {
          const entry = await this.#revenueService.addEntry(this.#employeeId, data);
          this.#state.addEntry(entry);
          dialog.remove();
        } catch (error) {
          Logger.error('Failed to add entry:', error);
        }
      },
      onCancel: () => dialog.remove(),
    });

    dialog.show();
  }

  #showBillingExportDialog(employeeId, employeeName) {
    const user = authService.getCurrentUser();

    const dialog = new BillingExportDialog({
      employeeId,
      employeeName: employeeName || 'Mitarbeiter',
      revenueService: this.#revenueService,
      profileService: this.#profileService,
      hierarchyService: this.#hierarchyService,
      generatedBy: user?.uid || null,
      generatedByName: user?.email || null,
      onExportComplete: (report) => {
        Logger.log('Billing export completed:', report.metadata.reportNumber);
      },
      onCancel: () => {
        Logger.log('Billing export cancelled');
      },
    });

    dialog.show();
  }

  async #handleEdit(entry) {
    const dialog = new AddRevenueDialog({
      entry,
      revenueService: this.#revenueService,
      hierarchyService: this.#hierarchyService,
      employeeId: this.#employeeId,
      onSave: async (data) => {
        try {
          const updatedEntry = await this.#revenueService.updateEntry(data.id, data);
          this.#state.updateEntry(updatedEntry);
          dialog.remove();
        } catch (error) {
          Logger.error('Failed to update entry:', error);
        }
      },
      onCancel: () => dialog.remove(),
    });

    dialog.show();
  }

  async #handleDelete(entry) {
    const confirmed = window.confirm(
      `Möchten Sie den Eintrag für "${entry.customerName}" wirklich löschen?`,
    );

    if (!confirmed) return;

    try {
      await this.#revenueService.deleteEntry(entry.id);
      this.#state.removeEntry(entry.id);
    } catch (error) {
      Logger.error('Failed to delete entry:', error);
    }
  }

  #canEditRevenue() {
    // Admins can always edit
    if (authService.isAdmin()) {
      return true;
    }

    // Employees can only edit their own revenue (linked node)
    if (authService.isEmployee()) {
      const linkedNodeId = authService.getLinkedNodeId();
      return linkedNodeId === this.#employeeId;
    }

    return false;
  }

  #navigateBack() {
    window.location.hash = '';
  }

  async mount() {
    clearElement(this.#container);
    await this.#init();
    this.#container.appendChild(this.#element);
    await this.#loadData();

    // Set up real-time listener for revenue entries
    try {
      this.#unsubscribeRevenueListener = await this.#revenueService.subscribeToRevenueUpdates(
        async () => {
          Logger.log('🔄 Real-time revenue update - reloading data');
          await this.#loadData();
        }
      );
      Logger.log('✓ Real-time revenue listener active for RevenueScreen');
    } catch (error) {
      Logger.warn('⚠ Failed to set up revenue listener:', error);
    }
  }

  unmount() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
    }
    if (this.#unsubscribeRevenueListener) {
      this.#unsubscribeRevenueListener();
      Logger.log('✓ Real-time revenue listener unsubscribed');
    }
    clearElement(this.#container);
  }

  get state() {
    return this.#state;
  }
}
