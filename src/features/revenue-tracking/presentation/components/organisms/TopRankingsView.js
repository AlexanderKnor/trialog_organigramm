/**
 * Organism: TopRankingsView
 * High-quality visual ranking of top performing employees
 */

import { createElement } from '../../../../../core/utils/index.js';
import { REVENUE_STATUS_TYPES } from '../../../domain/value-objects/RevenueStatus.js';

const RANKING_METRICS = {
  revenue: { label: 'Umsatz', shortLabel: 'Umsatz', unit: 'EUR' },
  provision: { label: 'Provision', shortLabel: 'Provision', unit: 'EUR' },
  entries: { label: 'Einträge', shortLabel: 'Anzahl', unit: 'Einträge' },
  avgPerEntry: { label: 'Durchschnitt', shortLabel: 'Ø Umsatz', unit: 'EUR/Eintrag' },
};

const CATEGORY_CONFIG = {
  bank: { label: 'Bank', color: '#3b82f6' },
  insurance: { label: 'Versicherung', color: '#22c55e' },
  realEstate: { label: 'Immobilien', color: '#f97316' },
  propertyManagement: { label: 'Hausverwaltung', color: '#a855f7' },
  energyContracts: { label: 'Energie', color: '#ec4899' },
};

export class TopRankingsView {
  #element;
  #entries;
  #employee;
  #selectedMetric;
  #selectedCategory;
  #isAnimating;

  constructor(props = {}) {
    this.#entries = props.entries || [];
    this.#employee = props.employee || null;
    this.#selectedMetric = props.metric || 'revenue';
    this.#selectedCategory = props.category || 'all';
    this.#isAnimating = false;
    this.#element = this.#render();
  }

  #getActiveEntries() {
    return this.#entries.filter((entry) => {
      const status = entry.originalEntry?.status;
      return status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             status?.type !== REVENUE_STATUS_TYPES.CANCELLED;
    });
  }

  #calculateRankings() {
    const activeEntries = this.#getActiveEntries();

    // Filter by category if selected
    const filteredEntries = this.#selectedCategory === 'all'
      ? activeEntries
      : activeEntries.filter(e => e.originalEntry?.category?.type === this.#selectedCategory);

    // Aggregate by employee
    const employeeStats = {};

    for (const entry of filteredEntries) {
      const employeeId = entry.entryOwner?.id || entry.employee?.id || 'unknown';
      const employeeName = entry.entryOwner?.name || entry.employee?.name || 'Unbekannt';
      const employee = entry.entryOwner || entry.employee;
      const revenue = entry.originalEntry?.provisionAmount || 0;

      // Calculate employee's actual provision based on their rate
      const categoryType = entry.originalEntry?.category?.type;
      let employeeRate = 0;

      if (employee) {
        switch (categoryType) {
          case 'bank':
            employeeRate = employee.bankProvision || 0;
            break;
          case 'insurance':
            employeeRate = employee.insuranceProvision || 0;
            break;
          case 'realEstate':
          case 'propertyManagement':
            employeeRate = employee.realEstateProvision || 0;
            break;
        }
      }

      const provision = revenue * (employeeRate / 100);

      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          id: employeeId,
          name: employeeName,
          revenue: 0,
          provision: 0,
          entries: 0,
          avgPerEntry: 0,
        };
      }

      employeeStats[employeeId].revenue += revenue;
      employeeStats[employeeId].provision += provision;
      employeeStats[employeeId].entries += 1;
    }

    // Calculate averages
    Object.values(employeeStats).forEach((emp) => {
      emp.avgPerEntry = emp.entries > 0 ? emp.revenue / emp.entries : 0;
    });

    // Sort by selected metric
    const rankings = Object.values(employeeStats).sort((a, b) => {
      return b[this.#selectedMetric] - a[this.#selectedMetric];
    });

    return rankings;
  }

  #render() {
    const rankings = this.#calculateRankings();

    return createElement('div', { className: 'top-rankings-view' }, [
      this.#renderHeader(),
      this.#renderFilters(),
      this.#renderPodium(rankings.slice(0, 3)),
      this.#renderRankingsList(rankings),
    ]);
  }

  #renderHeader() {
    return createElement('div', { className: 'rankings-header' }, [
      createElement('div', { className: 'rankings-title-group' }, [
        createElement('h2', { className: 'rankings-title' }, [
          'Top Performer',
        ]),
        createElement('p', { className: 'rankings-subtitle' }, [
          'Leistungsranking nach ausgewählter Metrik',
        ]),
      ]),
    ]);
  }

  #renderFilters() {
    const metricButtons = Object.entries(RANKING_METRICS).map(([key, config]) => {
      const isActive = this.#selectedMetric === key;
      return createElement('button', {
        className: `rankings-filter-btn ${isActive ? 'active' : ''}`,
        onclick: () => this.#changeMetric(key),
      }, [config.label]);
    });

    const categoryOptions = [
      createElement('option', { value: 'all' }, ['Alle Kategorien']),
      ...Object.entries(CATEGORY_CONFIG).map(([key, config]) =>
        createElement('option', { value: key }, [config.label])
      ),
    ];

    const categorySelect = createElement('select', {
      className: 'rankings-category-select',
      onchange: (e) => this.#changeCategory(e.target.value),
    }, categoryOptions);

    // Set selected value after creation
    categorySelect.value = this.#selectedCategory;

    return createElement('div', { className: 'rankings-filters' }, [
      createElement('div', { className: 'rankings-metric-filters' }, metricButtons),
      createElement('div', { className: 'rankings-category-filter' }, [
        createElement('label', { className: 'filter-label-small' }, ['Kategorie:']),
        categorySelect,
      ]),
    ]);
  }

  #renderPodium(topThree) {
    if (topThree.length === 0) {
      return createElement('div', { className: 'rankings-empty' }, [
        'Keine Daten verfügbar',
      ]);
    }

    const metricConfig = RANKING_METRICS[this.#selectedMetric];

    // Reorder for visual podium: [2nd, 1st, 3rd]
    const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
    const heights = ['medium', 'tall', 'short'];
    const positions = ['second', 'first', 'third'];
    const ranks = ['2', '1', '3'];

    const podiumItems = podiumOrder.map((employee, idx) => {
      if (!employee) return null;

      const value = employee[this.#selectedMetric];
      const formattedValue = metricConfig.unit === 'EUR'
        ? this.#formatCurrency(value)
        : metricConfig.unit === 'EUR/Eintrag'
        ? this.#formatCurrency(value)
        : value.toString();

      return createElement('div', {
        className: `podium-item podium-${heights[idx]} podium-${positions[idx]}`,
      }, [
        createElement('div', { className: 'podium-rank-badge' }, [`#${ranks[idx]}`]),
        createElement('div', { className: 'podium-avatar' }, [
          employee.name.charAt(0).toUpperCase(),
        ]),
        createElement('div', { className: 'podium-name' }, [employee.name]),
        createElement('div', { className: 'podium-stats' }, [
          createElement('div', { className: 'podium-value' }, [formattedValue]),
          createElement('div', { className: 'podium-label' }, [metricConfig.shortLabel]),
        ]),
        createElement('div', { className: 'podium-stand' }, [
          createElement('div', { className: 'stand-body' }),
        ]),
      ]);
    });

    return createElement('div', { className: 'rankings-podium' }, [
      createElement('div', { className: 'podium-container' }, podiumItems),
    ]);
  }

  #renderRankingsList(rankings) {
    if (rankings.length === 0) {
      return createElement('div', { className: 'rankings-empty' }, [
        'Keine Rankings verfügbar',
      ]);
    }

    const metricConfig = RANKING_METRICS[this.#selectedMetric];
    const maxValue = rankings.length > 0 ? rankings[0][this.#selectedMetric] : 1;

    const listHeader = createElement('div', { className: 'rankings-list-header' }, [
      createElement('h3', { className: 'list-title' }, [
        'Vollständiges Ranking',
      ]),
      createElement('span', { className: 'list-count' }, [
        `${rankings.length} ${rankings.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}`,
      ]),
    ]);

    const listItems = rankings.map((employee, idx) => {
      const value = employee[this.#selectedMetric];
      const percentage = (value / maxValue) * 100;
      const formattedValue = metricConfig.unit === 'EUR'
        ? this.#formatCurrency(value)
        : metricConfig.unit === 'EUR/Eintrag'
        ? this.#formatCurrency(value)
        : value.toString();

      const rank = idx + 1;
      let rankClass = 'rank-normal';

      if (rank === 1) {
        rankClass = 'rank-first';
      } else if (rank === 2) {
        rankClass = 'rank-second';
      } else if (rank === 3) {
        rankClass = 'rank-third';
      }

      return createElement('div', {
        className: `rankings-list-item ${rankClass}`,
      }, [
        createElement('div', { className: 'item-rank' }, [rank.toString()]),
        createElement('div', { className: 'item-avatar' }, [
          employee.name.charAt(0).toUpperCase(),
        ]),
        createElement('div', { className: 'item-info' }, [
          createElement('div', { className: 'item-name' }, [employee.name]),
          createElement('div', { className: 'item-stats' }, [
            createElement('span', { className: 'stat-label' }, ['Einträge:']),
            createElement('span', { className: 'stat-value' }, [employee.entries.toString()]),
            createElement('span', { className: 'stat-separator' }, ['•']),
            createElement('span', { className: 'stat-label' }, ['Umsatz:']),
            createElement('span', { className: 'stat-value' }, [this.#formatCurrency(employee.revenue)]),
          ]),
        ]),
        createElement('div', { className: 'item-progress' }, [
          createElement('div', { className: 'progress-bar-container' }, [
            createElement('div', {
              className: 'progress-bar-fill',
              style: `width: ${percentage}%`,
            }),
          ]),
        ]),
        createElement('div', { className: 'item-value' }, [
          createElement('span', { className: 'value-number' }, [formattedValue]),
          createElement('span', { className: 'value-unit' }, [metricConfig.unit]),
        ]),
      ]);
    });

    return createElement('div', { className: 'rankings-list' }, [
      listHeader,
      createElement('div', { className: 'rankings-list-items' }, listItems),
    ]);
  }

  #changeMetric(metric) {
    this.#selectedMetric = metric;
    this.#animateChange();
  }

  #changeCategory(category) {
    this.#selectedCategory = category;
    this.#animateChange();
  }

  #animateChange() {
    if (this.#isAnimating) return;
    this.#isAnimating = true;

    const podium = this.#element.querySelector('.rankings-podium');
    const list = this.#element.querySelector('.rankings-list');

    // Remove old animation classes first
    if (podium) {
      podium.classList.remove('ranking-exit', 'ranking-enter');
      podium.classList.add('ranking-exit');
    }
    if (list) {
      list.classList.remove('ranking-exit', 'ranking-enter');
      list.classList.add('ranking-exit');
    }

    setTimeout(() => {
      const newElement = this.#render();
      this.#element.replaceWith(newElement);
      this.#element = newElement;

      const newPodium = this.#element.querySelector('.rankings-podium');
      const newList = this.#element.querySelector('.rankings-list');

      // Clean and add enter animation
      requestAnimationFrame(() => {
        if (newPodium) {
          newPodium.classList.remove('ranking-exit', 'ranking-enter');
          // Force reflow
          void newPodium.offsetWidth;
          newPodium.classList.add('ranking-enter');
        }
        if (newList) {
          newList.classList.remove('ranking-exit', 'ranking-enter');
          // Force reflow
          void newList.offsetWidth;
          newList.classList.add('ranking-enter');
        }

        setTimeout(() => {
          this.#isAnimating = false;
        }, 300);
      });
    }, 200);
  }

  #formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  get element() {
    return this.#element;
  }

  update(entries, employee) {
    this.#entries = entries;
    this.#employee = employee;
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
  }
}
