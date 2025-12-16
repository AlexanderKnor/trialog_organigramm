/**
 * Organism: RevenueDashboard
 * Comprehensive revenue analytics dashboard with mode-aware display (own vs team)
 */

import { createElement } from '../../../../../core/utils/index.js';
import { REVENUE_STATUS_TYPES } from '../../../domain/value-objects/RevenueStatus.js';

const CATEGORY_CONFIG = {
  bank: { label: 'Bank', color: '#3b82f6' },
  insurance: { label: 'Versicherung', color: '#22c55e' },
  realEstate: { label: 'Immobilien', color: '#f97316' },
  propertyManagement: { label: 'Hausverwaltung', color: '#a855f7' },
  energyContracts: { label: 'Energie', color: '#ec4899' },
};

const MODE_CONFIG = {
  own: {
    title: 'Eigene Provision',
  },
  team: {
    title: 'Team-Provision',
  },
  company: {
    title: 'Unternehmens-Anteil',
  },
};

export class RevenueDashboard {
  #element;
  #entries;
  #employee;
  #mode;
  #startDate;
  #endDate;

  constructor(props = {}) {
    this.#entries = props.entries || [];
    this.#employee = props.employee || null;
    this.#mode = props.mode || 'own'; // 'own' or 'team'
    this.#startDate = props.startDate || null;
    this.#endDate = props.endDate || null;
    this.#element = this.#render();
  }

  #getActiveEntries() {
    return this.#entries.filter((entry) => {
      const status = (this.#mode === 'team' || this.#mode === 'company')
        ? entry.originalEntry?.status
        : entry.status;
      return status?.type !== REVENUE_STATUS_TYPES.REJECTED &&
             status?.type !== REVENUE_STATUS_TYPES.CANCELLED;
    });
  }

  #calculateStats() {
    const activeEntries = this.#getActiveEntries();
    const config = MODE_CONFIG[this.#mode];

    let totalRevenue = 0;
    let totalProvision = 0;

    // Category breakdown
    const categories = {};
    for (const type of Object.keys(CATEGORY_CONFIG)) {
      categories[type] = { revenue: 0, provision: 0, count: 0 };
    }

    // Team member breakdown (only for team mode)
    const teamMembers = {};

    for (const entry of activeEntries) {
      if (this.#mode === 'company') {
        // Company mode: entry is CompanyRevenueEntry
        const originalEntry = entry.originalEntry;
        const cat = originalEntry.category.type;
        const revenue = originalEntry.provisionAmount;
        const provision = entry.companyProvisionAmount;
        const ownerName = entry.entryOwner?.name || entry.employee?.name || 'Unbekannt';
        const ownerId = entry.entryOwner?.id || entry.employee?.id || 'unknown';

        totalRevenue += revenue;
        totalProvision += provision;

        if (categories[cat]) {
          categories[cat].count++;
          categories[cat].revenue += revenue;
          categories[cat].provision += provision;
        }

        // Aggregate by employee (who created the entry)
        if (!teamMembers[ownerId]) {
          teamMembers[ownerId] = {
            id: ownerId,
            name: ownerName,
            revenue: 0,
            provision: 0,
            count: 0,
            categories: {},
          };
        }
        teamMembers[ownerId].revenue += revenue;
        teamMembers[ownerId].provision += provision;
        teamMembers[ownerId].count++;

        // Track categories per employee
        if (!teamMembers[ownerId].categories[cat]) {
          teamMembers[ownerId].categories[cat] = { revenue: 0, provision: 0, count: 0 };
        }
        teamMembers[ownerId].categories[cat].revenue += revenue;
        teamMembers[ownerId].categories[cat].provision += provision;
        teamMembers[ownerId].categories[cat].count++;
      } else if (this.#mode === 'team') {
        // Team mode: entry is HierarchicalRevenueEntry
        const originalEntry = entry.originalEntry;
        const cat = originalEntry.category.type;
        const revenue = originalEntry.provisionAmount;
        const provision = entry.managerProvisionAmount;
        const ownerName = entry.owner?.name || 'Unbekannt';
        const ownerId = entry.owner?.id || 'unknown';

        totalRevenue += revenue;
        totalProvision += provision;

        if (categories[cat]) {
          categories[cat].count++;
          categories[cat].revenue += revenue;
          categories[cat].provision += provision;
        }

        // Aggregate by team member
        if (!teamMembers[ownerId]) {
          teamMembers[ownerId] = {
            id: ownerId,
            name: ownerName,
            revenue: 0,
            provision: 0,
            count: 0,
            categories: {},
          };
        }
        teamMembers[ownerId].revenue += revenue;
        teamMembers[ownerId].provision += provision;
        teamMembers[ownerId].count++;

        // Track categories per team member
        if (!teamMembers[ownerId].categories[cat]) {
          teamMembers[ownerId].categories[cat] = { revenue: 0, provision: 0, count: 0 };
        }
        teamMembers[ownerId].categories[cat].revenue += revenue;
        teamMembers[ownerId].categories[cat].provision += provision;
        teamMembers[ownerId].categories[cat].count++;
      } else {
        // Own mode: entry is RevenueEntry
        const cat = entry.category.type;
        const revenue = entry.provisionAmount;
        const provisionPercent = this.#getProvisionPercent(cat);
        const provision = revenue * provisionPercent / 100;

        totalRevenue += revenue;
        totalProvision += provision;

        if (categories[cat]) {
          categories[cat].count++;
          categories[cat].revenue += revenue;
          categories[cat].provision += provision;
        }
      }
    }

    return {
      revenue: totalRevenue,
      provision: totalProvision,
      count: activeEntries.length,
      categories,
      teamMembers: Object.values(teamMembers).sort((a, b) => b.provision - a.provision),
      config,
    };
  }

  #getProvisionPercent(categoryType) {
    if (!this.#employee) return 0;
    switch (categoryType) {
      case 'bank': return this.#employee.bankProvision;
      case 'insurance': return this.#employee.insuranceProvision;
      case 'realEstate':
      case 'propertyManagement': return this.#employee.realEstateProvision;
      default: return 0;
    }
  }

  #render() {
    const stats = this.#calculateStats();
    const modeClass = `db db-mode-${this.#mode}`;

    const sections = [
      this.#renderHeader(stats),
    ];

    // In team and company mode, show member breakdown before categories
    if ((this.#mode === 'team' || this.#mode === 'company') && stats.teamMembers.length > 0) {
      sections.push(this.#renderTeamMemberSection(stats));
    }

    sections.push(this.#renderCategoryGrid(stats));

    return createElement('div', { className: modeClass }, sections);
  }

  #renderHeader(stats) {
    const config = stats.config;
    const avgPerEntry = stats.count > 0 ? stats.provision / stats.count : 0;

    const header = createElement('div', {}, [
      createElement('div', { className: 'db-header' }, [
        // Main KPI - Provision
        createElement('div', { className: 'db-kpi db-kpi-main' }, [
          createElement('div', { className: 'db-kpi-label' }, [config.title]),
          createElement('div', { className: 'db-kpi-value' }, [this.#formatCurrency(stats.provision)]),
          createElement('div', { className: 'db-kpi-context' }, [
            `aus ${stats.count} ${stats.count === 1 ? 'Eintrag' : 'Einträgen'}`,
          ]),
        ]),
        // Revenue KPI
        createElement('div', { className: 'db-kpi' }, [
          createElement('div', { className: 'db-kpi-label' }, [
            this.#mode === 'company' ? 'Gesamt-Umsatz' : this.#mode === 'team' ? 'Team-Umsatz' : 'Umsatz',
          ]),
          createElement('div', { className: 'db-kpi-value' }, [this.#formatCurrency(stats.revenue)]),
          createElement('div', { className: 'db-kpi-sub' }, [
            this.#mode === 'company' ? 'Alle Mitarbeiter' : this.#mode === 'team' ? 'Gesamt der Mitarbeiter' : 'Ihr Gesamtumsatz',
          ]),
        ]),
        // Entry Count KPI
        createElement('div', { className: 'db-kpi' }, [
          createElement('div', { className: 'db-kpi-label' }, ['Einträge']),
          createElement('div', { className: 'db-kpi-value' }, [stats.count.toString()]),
          createElement('div', { className: 'db-kpi-sub' }, [
            this.#mode === 'company' ? 'Gesamt-Einträge' : this.#mode === 'team' ? 'Von Ihrem Team' : 'Eigene Einträge',
          ]),
        ]),
        // Average per Entry KPI
        createElement('div', { className: 'db-kpi' }, [
          createElement('div', { className: 'db-kpi-label' }, ['Ø Provision']),
          createElement('div', { className: 'db-kpi-value' }, [this.#formatCurrency(avgPerEntry)]),
          createElement('div', { className: 'db-kpi-sub' }, ['Pro Eintrag']),
        ]),
      ]),
      this.#renderAveragesSection(stats),
    ]);

    return header;
  }

  #renderAveragesSection(stats) {
    // Calculate days in period
    let daysInPeriod = 30;
    let periodLabel = 'Aktueller Monat';

    if (this.#startDate && this.#endDate) {
      const start = new Date(this.#startDate);
      const end = new Date(this.#endDate);
      const diffTime = Math.abs(end - start);
      daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Format period label
      if (daysInPeriod <= 31) {
        periodLabel = `${daysInPeriod} Tage`;
      } else if (daysInPeriod <= 366) {
        const months = Math.round(daysInPeriod / 30);
        periodLabel = `${months} ${months === 1 ? 'Monat' : 'Monate'}`;
      } else {
        const years = Math.round(daysInPeriod / 365);
        periodLabel = `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
      }
    }

    // Calculate averages for both revenue and provision
    const revenuePerDay = stats.revenue / daysInPeriod;
    const revenuePerMonth = revenuePerDay * 30;
    const revenuePerYear = revenuePerDay * 365;

    const provisionPerDay = stats.provision / daysInPeriod;
    const provisionPerMonth = provisionPerDay * 30;
    const provisionPerYear = provisionPerDay * 365;

    return createElement('div', { className: 'db-averages' }, [
      createElement('div', { className: 'db-averages-header' }, [
        createElement('h4', { className: 'db-averages-title' }, ['Hochrechnungen']),
        createElement('span', { className: 'db-averages-period' }, [`Basis: ${periodLabel}`]),
      ]),
      createElement('div', { className: 'db-averages-content' }, [
        // Revenue row
        createElement('div', { className: 'db-averages-row' }, [
          createElement('div', { className: 'db-avg-row-label' }, ['Umsatz']),
          createElement('div', { className: 'db-averages-grid' }, [
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Tag']),
              createElement('div', { className: 'db-avg-value db-avg-value-muted' }, [this.#formatCurrency(revenuePerDay)]),
            ]),
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Monat']),
              createElement('div', { className: 'db-avg-value db-avg-value-muted' }, [this.#formatCurrency(revenuePerMonth)]),
              createElement('div', { className: 'db-avg-note' }, ['(30-Tage-Basis)']),
            ]),
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Jahr']),
              createElement('div', { className: 'db-avg-value db-avg-value-muted' }, [this.#formatCurrency(revenuePerYear)]),
              createElement('div', { className: 'db-avg-note' }, ['(365-Tage-Basis)']),
            ]),
          ]),
        ]),
        // Provision row
        createElement('div', { className: 'db-averages-row' }, [
          createElement('div', { className: 'db-avg-row-label' }, ['Provision']),
          createElement('div', { className: 'db-averages-grid' }, [
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Tag']),
              createElement('div', { className: 'db-avg-value' }, [this.#formatCurrency(provisionPerDay)]),
            ]),
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Monat']),
              createElement('div', { className: 'db-avg-value' }, [this.#formatCurrency(provisionPerMonth)]),
              createElement('div', { className: 'db-avg-note' }, ['(30-Tage-Basis)']),
            ]),
            createElement('div', { className: 'db-avg-item' }, [
              createElement('div', { className: 'db-avg-label' }, ['Ø Pro Jahr']),
              createElement('div', { className: 'db-avg-value' }, [this.#formatCurrency(provisionPerYear)]),
              createElement('div', { className: 'db-avg-note' }, ['(365-Tage-Basis)']),
            ]),
          ]),
        ]),
      ]),
    ]);
  }

  #renderTeamMemberSection(stats) {
    const totalProvision = stats.provision || 1;
    const sectionTitle = this.#mode === 'company' ? 'Mitarbeiter-Übersicht' : 'Team-Mitglieder';

    return createElement('div', { className: 'db-team-section' }, [
      createElement('div', { className: 'db-section-header' }, [
        createElement('h3', { className: 'db-section-title' }, [sectionTitle]),
        createElement('span', { className: 'db-section-badge' }, [
          `${stats.teamMembers.length} Mitarbeiter`,
        ]),
      ]),
      createElement('div', { className: 'db-team-grid' },
        stats.teamMembers.map((member) => this.#renderTeamMemberCard(member, totalProvision)),
      ),
    ]);
  }

  #renderTeamMemberCard(member, totalProvision) {
    const sharePercent = (member.provision / totalProvision) * 100;

    // Get top categories for this member
    const topCategories = Object.entries(member.categories)
      .map(([type, data]) => ({ type, ...data, config: CATEGORY_CONFIG[type] }))
      .sort((a, b) => b.provision - a.provision)
      .slice(0, 3);

    return createElement('div', { className: 'db-team-card' }, [
      // Header with name and share
      createElement('div', { className: 'db-team-card-header' }, [
        createElement('div', { className: 'db-team-avatar' }, [
          member.name.charAt(0).toUpperCase(),
        ]),
        createElement('div', { className: 'db-team-info' }, [
          createElement('div', { className: 'db-team-name' }, [member.name]),
          createElement('div', { className: 'db-team-entries' }, [
            `${member.count} ${member.count === 1 ? 'Eintrag' : 'Einträge'}`,
          ]),
        ]),
        createElement('div', { className: 'db-team-share' }, [
          `${sharePercent.toFixed(0)}%`,
        ]),
      ]),

      // Revenue and Provision
      createElement('div', { className: 'db-team-metrics' }, [
        createElement('div', { className: 'db-team-metric' }, [
          createElement('span', { className: 'db-team-metric-label' }, ['Umsatz']),
          createElement('span', { className: 'db-team-metric-value' }, [this.#formatCurrency(member.revenue)]),
        ]),
        createElement('div', { className: 'db-team-metric db-team-metric-highlight' }, [
          createElement('span', { className: 'db-team-metric-label' }, [
            this.#mode === 'company' ? 'Unternehmens-Anteil' : 'Ihre Provision',
          ]),
          createElement('span', { className: 'db-team-metric-value' }, [this.#formatCurrency(member.provision)]),
        ]),
      ]),

      // Category breakdown mini-bars
      topCategories.length > 0
        ? createElement('div', { className: 'db-team-categories' },
            topCategories.map((cat) =>
              createElement('div', { className: 'db-team-cat' }, [
                createElement('div', {
                  className: 'db-team-cat-dot',
                  style: `background: ${cat.config.color}`,
                }),
                createElement('span', { className: 'db-team-cat-name' }, [cat.config.label]),
                createElement('div', { className: 'db-team-cat-values' }, [
                  createElement('span', { className: 'db-team-cat-revenue' }, [this.#formatCurrency(cat.revenue)]),
                  createElement('span', { className: 'db-team-cat-separator' }, ['→']),
                  createElement('span', { className: 'db-team-cat-provision' }, [this.#formatCurrency(cat.provision)]),
                ]),
              ]),
            ),
          )
        : null,
    ].filter(Boolean));
  }

  #renderCategoryGrid(stats) {
    const cats = Object.entries(stats.categories)
      .map(([type, data]) => ({
        type,
        ...data,
        config: CATEGORY_CONFIG[type],
        rate: this.#mode === 'own' ? this.#getProvisionPercent(type) : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = Math.max(...cats.map((c) => c.revenue), 1);
    const totalRevenue = stats.revenue || 1;
    const totalProvision = stats.provision || 1;

    // Separate active and inactive categories
    const activeCats = cats.filter((c) => c.count > 0);
    const inactiveCats = cats.filter((c) => c.count === 0);

    return createElement('div', { className: 'db-categories' }, [
      createElement('div', { className: 'db-section-header' }, [
        createElement('h3', { className: 'db-section-title' }, ['Kategorie-Übersicht']),
        createElement('span', { className: 'db-section-badge' }, [
          `${activeCats.length} von ${cats.length} aktiv`,
        ]),
      ]),
      // Active categories
      activeCats.length > 0
        ? createElement('div', { className: 'db-cat-grid' },
            activeCats.map((cat) => this.#renderCategoryCard(cat, maxRevenue, totalRevenue, totalProvision)),
          )
        : createElement('div', { className: 'db-empty' }, [
            this.#mode === 'company'
              ? 'Keine Umsätze in diesem Monat'
              : this.#mode === 'team'
              ? 'Keine Team-Umsätze in diesem Monat'
              : 'Keine Umsätze in diesem Monat',
          ]),
      // Inactive categories hint
      inactiveCats.length > 0
        ? createElement('div', { className: 'db-inactive' }, [
            createElement('span', { className: 'db-inactive-label' }, ['Ohne Umsatz:']),
            ...inactiveCats.map((cat) =>
              createElement('span', { className: 'db-inactive-item' }, [cat.config.label]),
            ),
          ])
        : null,
    ].filter(Boolean));
  }

  #renderCategoryCard(cat, maxRevenue, totalRevenue, totalProvision) {
    const revenuePercent = (cat.revenue / maxRevenue) * 100;
    const shareOfRevenue = (cat.revenue / totalRevenue) * 100;
    const shareOfProvision = (cat.provision / totalProvision) * 100;
    const avgPerEntry = cat.count > 0 ? cat.revenue / cat.count : 0;

    const provisionDetails = [];

    // Provision row
    provisionDetails.push(
      createElement('div', { className: 'db-cat-prov-row' }, [
        createElement('span', { className: 'db-cat-prov-label' }, [
          this.#mode === 'company' ? 'Unternehmens-Anteil' : this.#mode === 'team' ? 'Ihre Provision' : 'Provision',
        ]),
        createElement('span', { className: 'db-cat-prov-value' }, [this.#formatCurrency(cat.provision)]),
      ]),
    );

    // Show rate only in own mode
    if (this.#mode === 'own' && cat.rate !== null) {
      provisionDetails.push(
        createElement('div', { className: 'db-cat-prov-row' }, [
          createElement('span', { className: 'db-cat-prov-label' }, ['Provisionsrate']),
          createElement('span', { className: 'db-cat-prov-rate' }, [`${cat.rate}%`]),
        ]),
      );
    }

    // Share row
    provisionDetails.push(
      createElement('div', { className: 'db-cat-prov-row' }, [
        createElement('span', { className: 'db-cat-prov-label' }, ['Anteil Gesamt']),
        createElement('span', {}, [`${shareOfProvision.toFixed(0)}%`]),
      ]),
    );

    return createElement('div', { className: 'db-cat-card' }, [
      // Header with color indicator
      createElement('div', { className: 'db-cat-header' }, [
        createElement('div', {
          className: 'db-cat-indicator',
          style: `background: ${cat.config.color}`,
        }),
        createElement('div', { className: 'db-cat-title' }, [cat.config.label]),
        createElement('div', { className: 'db-cat-count' }, [`${cat.count} Eintr.`]),
      ]),

      // Revenue bar
      createElement('div', { className: 'db-cat-metric' }, [
        createElement('div', { className: 'db-cat-metric-header' }, [
          createElement('span', { className: 'db-cat-metric-label' }, ['Umsatz']),
          createElement('span', { className: 'db-cat-metric-value' }, [this.#formatCurrency(cat.revenue)]),
        ]),
        createElement('div', { className: 'db-cat-bar' }, [
          createElement('div', {
            className: 'db-cat-bar-fill',
            style: `width: ${revenuePercent}%; background: ${cat.config.color}`,
          }),
        ]),
        createElement('div', { className: 'db-cat-metric-footer' }, [
          createElement('span', {}, [`${shareOfRevenue.toFixed(0)}% Anteil`]),
        ]),
      ]),

      // Provision section
      createElement('div', { className: 'db-cat-provision' }, provisionDetails),

      // Average per entry
      createElement('div', { className: 'db-cat-avg' }, [
        createElement('span', { className: 'db-cat-avg-label' }, ['Ø Umsatz/Eintrag']),
        createElement('span', { className: 'db-cat-avg-value' }, [this.#formatCurrency(avgPerEntry)]),
      ]),
    ]);
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

  update(entries, employee, mode) {
    this.#entries = entries;
    this.#employee = employee;
    this.#mode = mode || this.#mode;
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
  }
}
