/**
 * Organism: RevenueOverviewPanel
 * The dashboard's revenue block: the viewer's figures, resolved from who they
 * are rather than from URL parameters, filtered to a selectable period that
 * defaults to the current month (same default as RevenueScreen).
 *
 * Role differentiation: employees see their own numbers, admins the company
 * cascade, and Geschaeftsfuehrer — the only viewers with both — get a scope
 * switch between company and personal figures.
 */

import { createElement, clearElement } from '../../../../../core/utils/index.js';
import { authService } from '../../../../../core/auth/index.js';
import { buildGeschaeftsfuehrerNode } from '../../../../../core/config/geschaeftsfuehrer.config.js';
import { Logger } from '../../../../../core/utils/logger.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { DateRangePicker } from '../../../../revenue-tracking/presentation/components/molecules/DateRangePicker.js';
import { RevenueDashboard } from '../../../../revenue-tracking/presentation/components/organisms/RevenueDashboard.js';
import {
  resolveRevenueView,
  canChooseRevenueScope,
  REVENUE_VIEW_KINDS,
  REVENUE_VIEW_SCOPES,
  REVENUE_VIEW_REASONS,
} from '../../../domain/policies/RevenueViewPolicy.js';

/** Matches the debounce RevenueScreen uses for the same subscription. */
const REFRESH_DEBOUNCE_MS = 300;

export class RevenueOverviewPanel {
  #revenueService;
  #hierarchyService;
  #element;
  #content;
  #dashboardHost = null;
  #view = null;
  #tree = null;
  #entries = [];
  #scope = REVENUE_VIEW_SCOPES.COMPANY;
  #canToggleScope = false;
  #startDate;
  #endDate;
  #unsubscribe = null;
  #refreshTimer = null;
  #isDestroyed = false;
  #isActive = true;
  #isDirty = false;

  constructor({ revenueService, hierarchyService }) {
    this.#revenueService = revenueService;
    this.#hierarchyService = hierarchyService;

    // Default period: current month, first to last day — the same default
    // RevenueScreen uses, so overview and detail agree on the numbers. End of
    // day, not midnight: entries carry timestamps, and a midnight bound would
    // silently drop everything booked on the last day of the month.
    const now = new Date();
    this.#startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.#endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  async initialize() {
    const user = authService.getCurrentUser();
    this.#canToggleScope = canChooseRevenueScope({
      isAdmin: authService.isAdmin(),
      email: user?.email ?? null,
    });

    this.#content = createElement('div', { className: 'home-revenue-content' });
    this.#element = createElement('div', { className: 'home-revenue' }, [this.#content]);

    await this.#load();
    await this.#setupSubscription();
  }

  async #load() {
    try {
      this.#tree = await this.#resolveTree();

      const user = authService.getCurrentUser();
      this.#view = resolveRevenueView({
        isAdmin: authService.isAdmin(),
        isEmployee: authService.isEmployee(),
        email: user?.email ?? null,
        linkedNodeId: authService.getLinkedNodeId(),
        tree: this.#tree,
        scope: this.#scope,
      });

      if (this.#view.kind === REVENUE_VIEW_KINDS.ERROR) {
        this.#renderError(this.#view.reason);
        return;
      }

      if (this.#view.kind === REVENUE_VIEW_KINDS.EMPTY) {
        this.#renderEmpty();
        return;
      }

      this.#entries = await this.#fetchEntries(this.#view);
      this.#renderView();
    } catch (error) {
      // A Firestore hiccup must not leave the landing page blank.
      Logger.error('Failed to load revenue overview:', error);
      this.#renderLoadFailure();
    }
  }

  /** The Single Tree Policy, same derivation HierarchyScreen uses. */
  async #resolveTree() {
    const trees = await this.#hierarchyService.getAllTrees();
    return trees.length > 0 ? trees[0] : null;
  }

  async #fetchEntries(view) {
    if (view.fetch === 'company') {
      return this.#revenueService.getCompanyRevenues(view.employeeId, this.#tree.id);
    }

    return this.#revenueService.getEntriesByEmployee(view.employeeId);
  }

  #resolveEmployee(view) {
    const node = this.#tree?.hasNode(view.employeeId) ? this.#tree.getNode(view.employeeId) : null;
    return node || buildGeschaeftsfuehrerNode(view.employeeId);
  }

  /** Same semantics as RevenueScreen's date filtering, both entry shapes. */
  #filterEntriesByDateRange(entries) {
    if (!this.#startDate || !this.#endDate) {
      return entries;
    }

    const isCompany = this.#view.mode === 'company';

    return entries.filter((entry) => {
      const source = isCompany ? entry.originalEntry : entry;
      const entryDate = new Date(source.entryDate || source.createdAt);
      return entryDate >= this.#startDate && entryDate <= this.#endDate;
    });
  }

  // ========================================
  // RENDERING
  // ========================================

  #renderView() {
    this.#dashboardHost = createElement('div', { className: 'home-revenue-dashboard-host' });
    this.#renderDashboard();

    clearElement(this.#content);
    this.#content.append(this.#createToolbar(), this.#dashboardHost);
  }

  /**
   * Scope control and period picker. Rebuilt only on full loads; period
   * changes swap the dashboard host underneath so the picker keeps its state.
   */
  #createToolbar() {
    const picker = new DateRangePicker({
      startDate: this.#startDate,
      endDate: this.#endDate,
      onChange: ({ startDate, endDate }) => {
        this.#startDate = startDate;
        this.#endDate = endDate;
        this.#renderDashboard();
      },
    });

    return createElement('div', { className: 'home-revenue-toolbar' }, [
      this.#createScopeControl(),
      createElement('div', { className: 'home-revenue-period' }, [picker.element]),
    ]);
  }

  #createScopeControl() {
    if (!this.#canToggleScope) {
      const label =
        this.#view.mode === 'company' ? 'Unternehmensumsätze' : 'Meine Umsätze';

      return createElement('span', { className: 'home-revenue-scope-label' }, [label]);
    }

    const options = [
      { scope: REVENUE_VIEW_SCOPES.COMPANY, label: 'Unternehmen' },
      { scope: REVENUE_VIEW_SCOPES.OWN, label: 'Eigene Umsätze' },
    ];

    return createElement(
      'div',
      { className: 'home-revenue-scope', role: 'group', 'aria-label': 'Umsatzsicht wählen' },
      options.map((option) =>
        createElement(
          'button',
          {
            className: `portal-filter-chip ${this.#scope === option.scope ? 'is-active' : ''}`.trim(),
            type: 'button',
            'aria-pressed': String(this.#scope === option.scope),
            onclick: () => this.#switchScope(option.scope),
          },
          [option.label]
        )
      )
    );
  }

  async #switchScope(scope) {
    if (this.#scope === scope) {
      return;
    }

    this.#scope = scope;
    await this.#load();
  }

  #renderDashboard() {
    // mode and entry shape are coupled: 'own' reads entry.status/provisionAmount
    // off raw RevenueEntry objects, 'company' reads originalEntry/entryOwner off
    // wrapped CompanyRevenueEntry ones. A mismatch renders zeros rather than
    // failing, so both values come from the single policy object above.
    const dashboard = new RevenueDashboard({
      entries: this.#filterEntriesByDateRange(this.#entries),
      employee: this.#resolveEmployee(this.#view),
      mode: this.#view.mode,
      startDate: this.#startDate,
      endDate: this.#endDate,
    });

    this.#dashboardHost.replaceChildren(dashboard.element, this.#createDetailLink(this.#view));
  }

  #createDetailLink(view) {
    return createElement('div', { className: 'home-revenue-actions' }, [
      createElement(
        'a',
        {
          className: 'home-revenue-detail-link',
          href: `#revenue/${view.employeeId}/${this.#tree.id}`,
        },
        ['Alle Details im Umsatz-Tracking', new Icon({ name: 'arrowRight', size: 16 }).element]
      ),
    ]);
  }

  #renderState({ icon, title, message, action = null, variant = 'info' }) {
    const children = [
      createElement('span', { className: `home-state-icon home-state-icon-${variant}` }, [
        new Icon({ name: icon, size: 32 }).element,
      ]),
      createElement('h3', { className: 'home-state-title' }, [title]),
      createElement('p', { className: 'home-state-message' }, [message]),
    ];

    if (action) {
      children.push(action);
    }

    clearElement(this.#content);
    this.#content.appendChild(
      createElement('div', { className: 'home-state', role: 'status' }, children)
    );
  }

  #renderError(reason) {
    if (reason === REVENUE_VIEW_REASONS.NO_LINKED_NODE) {
      this.#renderState({
        icon: 'alertTriangle',
        variant: 'warning',
        title: 'Konto nicht mit dem Organigramm verknüpft',
        message:
          'Ihre Umsätze können nicht geladen werden, weil zu Ihrer Anmelde-Adresse kein Eintrag im Organigramm gefunden wurde. Die E-Mail-Adresse im Organigramm muss exakt der Adresse entsprechen, mit der Sie sich anmelden. Bitte wenden Sie sich an einen Administrator.',
      });
      return;
    }

    this.#renderLoadFailure();
  }

  #renderEmpty() {
    this.#renderState({
      icon: 'network',
      title: 'Noch keine Organisationsstruktur',
      message:
        'Sobald das Organigramm angelegt ist, erscheinen hier die Unternehmenszahlen. Öffnen Sie dazu das Organigramm.',
    });
  }

  #renderLoadFailure() {
    const retry = new Button({
      label: 'Erneut versuchen',
      variant: 'outline',
      size: 'sm',
      onClick: () => this.#load(),
    });

    this.#renderState({
      icon: 'alertCircle',
      variant: 'error',
      title: 'Umsätze konnten nicht geladen werden',
      message: 'Die Verbindung zur Datenbank ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
      action: createElement('div', { className: 'home-state-action' }, [retry.element]),
    });
  }

  async #setupSubscription() {
    // Nothing to keep in sync when we never showed figures in the first place.
    if (!this.#view || this.#view.kind === REVENUE_VIEW_KINDS.ERROR || this.#view.kind === REVENUE_VIEW_KINDS.EMPTY) {
      return;
    }

    const unsubscribe = await this.#revenueService.subscribeToRevenueUpdates(() => {
      this.#scheduleRefresh();
    });

    // subscribeToRevenueUpdates resolves its unsubscribe asynchronously, so the
    // panel can be destroyed while it is still in flight. Without this the
    // listener would outlive the panel on every quick navigation.
    if (this.#isDestroyed) {
      unsubscribe?.();
      return;
    }

    this.#unsubscribe = unsubscribe;
  }

  #scheduleRefresh() {
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      if (this.#isDestroyed) {
        return;
      }

      // Re-fetching a tab nobody is looking at costs queries for nothing; catch
      // up when it comes back into view instead.
      if (!this.#isActive) {
        this.#isDirty = true;
        return;
      }

      this.#load();
    }, REFRESH_DEBOUNCE_MS);
  }

  /** Called by the screen when this tab gains or loses focus. */
  setActive(isActive) {
    this.#isActive = isActive;

    if (isActive && this.#isDirty) {
      this.#isDirty = false;
      this.#load();
    }
  }

  get element() {
    return this.#element;
  }

  destroy() {
    this.#isDestroyed = true;
    clearTimeout(this.#refreshTimer);
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#element?.remove();
  }
}
