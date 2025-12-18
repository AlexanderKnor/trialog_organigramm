/**
 * Organism: CancellationAnalysisView
 * Analysis of cancellation and rejection rates by employee
 */

import { createElement } from '../../../../../core/utils/index.js';
import { REVENUE_STATUS_TYPES } from '../../../domain/value-objects/RevenueStatus.js';

const STATUS_CONFIG = {
  [REVENUE_STATUS_TYPES.SUBMITTED]: {
    label: 'Eingereicht',
    color: '#3b82f6',
    shortLabel: 'Eingereicht',
  },
  [REVENUE_STATUS_TYPES.PROVISIONED]: {
    label: 'Provisioniert',
    color: '#22c55e',
    shortLabel: 'Erfolg',
  },
  [REVENUE_STATUS_TYPES.REJECTED]: {
    label: 'Abgelehnt',
    color: '#ef4444',
    shortLabel: 'Abgelehnt',
  },
  [REVENUE_STATUS_TYPES.CANCELLED]: {
    label: 'Storniert',
    color: '#f97316',
    shortLabel: 'Storniert',
  },
};

export class CancellationAnalysisView {
  #element;
  #entries;
  #employee;
  #sortBy;
  #sortDirection;

  constructor(props = {}) {
    this.#entries = props.entries || [];
    this.#employee = props.employee || null;
    this.#sortBy = props.sortBy || 'cancellationRate';
    this.#sortDirection = props.sortDirection || 'desc';
    this.#element = this.#render();
  }

  #calculateStatistics() {
    // Aggregate by employee
    const employeeStats = {};

    for (const entry of this.#entries) {
      const employeeId = entry.entryOwner?.id || entry.employee?.id || 'unknown';
      const employeeName = entry.entryOwner?.name || entry.employee?.name || 'Unbekannt';
      const status = entry.originalEntry?.status?.type;

      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          id: employeeId,
          name: employeeName,
          total: 0,
          submitted: 0,
          provisioned: 0,
          rejected: 0,
          cancelled: 0,
          submittedRate: 0,
          cancellationRate: 0,
          rejectionRate: 0,
          successRate: 0,
        };
      }

      employeeStats[employeeId].total += 1;

      if (status === REVENUE_STATUS_TYPES.SUBMITTED) {
        employeeStats[employeeId].submitted += 1;
      } else if (status === REVENUE_STATUS_TYPES.PROVISIONED) {
        employeeStats[employeeId].provisioned += 1;
      } else if (status === REVENUE_STATUS_TYPES.REJECTED) {
        employeeStats[employeeId].rejected += 1;
      } else if (status === REVENUE_STATUS_TYPES.CANCELLED) {
        employeeStats[employeeId].cancelled += 1;
      }
    }

    // Calculate rates
    Object.values(employeeStats).forEach((emp) => {
      emp.submittedRate = emp.total > 0 ? (emp.submitted / emp.total) * 100 : 0;
      emp.cancellationRate = emp.total > 0 ? (emp.cancelled / emp.total) * 100 : 0;
      emp.rejectionRate = emp.total > 0 ? (emp.rejected / emp.total) * 100 : 0;
      emp.successRate = emp.total > 0 ? (emp.provisioned / emp.total) * 100 : 0;
    });

    // Calculate overall statistics
    const totalEntries = this.#entries.length;
    const totalCancelled = Object.values(employeeStats).reduce((sum, emp) => sum + emp.cancelled, 0);
    const totalRejected = Object.values(employeeStats).reduce((sum, emp) => sum + emp.rejected, 0);
    const totalProvisioned = Object.values(employeeStats).reduce((sum, emp) => sum + emp.provisioned, 0);
    const totalSubmitted = Object.values(employeeStats).reduce((sum, emp) => sum + emp.submitted, 0);

    const overallCancellationRate = totalEntries > 0 ? (totalCancelled / totalEntries) * 100 : 0;
    const overallRejectionRate = totalEntries > 0 ? (totalRejected / totalEntries) * 100 : 0;
    const overallSuccessRate = totalEntries > 0 ? (totalProvisioned / totalEntries) * 100 : 0;

    // Sort employees
    const sortedEmployees = Object.values(employeeStats).sort((a, b) => {
      const multiplier = this.#sortDirection === 'asc' ? 1 : -1;
      return (b[this.#sortBy] - a[this.#sortBy]) * multiplier;
    });

    return {
      employees: sortedEmployees,
      overall: {
        total: totalEntries,
        cancelled: totalCancelled,
        rejected: totalRejected,
        provisioned: totalProvisioned,
        submitted: totalSubmitted,
        cancellationRate: overallCancellationRate,
        rejectionRate: overallRejectionRate,
        successRate: overallSuccessRate,
      },
    };
  }

  #render() {
    const stats = this.#calculateStatistics();

    return createElement('div', { className: 'cancellation-analysis-view' }, [
      this.#renderHeader(),
      this.#renderOverallStats(stats.overall),
      this.#renderStatusDistribution(stats.overall),
      this.#renderEmployeeTable(stats.employees),
    ]);
  }

  #renderHeader() {
    return createElement('div', { className: 'cancellation-header' }, [
      createElement('div', { className: 'cancellation-title-group' }, [
        createElement('h2', { className: 'cancellation-title' }, [
          'Qualitätsanalyse',
        ]),
        createElement('p', { className: 'cancellation-subtitle' }, [
          'Erfolgs-, Storno- und Ablehnungsquoten nach Mitarbeiter',
        ]),
      ]),
    ]);
  }

  #renderOverallStats(overall) {
    return createElement('div', { className: 'cancellation-overall-stats' }, [
      createElement('div', { className: 'overall-stat-card stat-success' }, [
        createElement('div', { className: 'stat-content' }, [
          createElement('div', { className: 'stat-label' }, ['Erfolgsquote']),
          createElement('div', { className: 'stat-value' }, [
            `${overall.successRate.toFixed(1)}%`,
          ]),
          createElement('div', { className: 'stat-count' }, [
            `${overall.provisioned} von ${overall.total}`,
          ]),
        ]),
      ]),
      createElement('div', { className: 'overall-stat-card stat-cancellation' }, [
        createElement('div', { className: 'stat-content' }, [
          createElement('div', { className: 'stat-label' }, ['Stornoquote']),
          createElement('div', { className: 'stat-value' }, [
            `${overall.cancellationRate.toFixed(1)}%`,
          ]),
          createElement('div', { className: 'stat-count' }, [
            `${overall.cancelled} von ${overall.total}`,
          ]),
        ]),
      ]),
      createElement('div', { className: 'overall-stat-card stat-rejection' }, [
        createElement('div', { className: 'stat-content' }, [
          createElement('div', { className: 'stat-label' }, ['Ablehnungsquote']),
          createElement('div', { className: 'stat-value' }, [
            `${overall.rejectionRate.toFixed(1)}%`,
          ]),
          createElement('div', { className: 'stat-count' }, [
            `${overall.rejected} von ${overall.total}`,
          ]),
        ]),
      ]),
      createElement('div', { className: 'overall-stat-card stat-submitted' }, [
        createElement('div', { className: 'stat-content' }, [
          createElement('div', { className: 'stat-label' }, ['In Bearbeitung']),
          createElement('div', { className: 'stat-value' }, [
            `${((overall.submitted / overall.total) * 100).toFixed(1)}%`,
          ]),
          createElement('div', { className: 'stat-count' }, [
            `${overall.submitted} von ${overall.total}`,
          ]),
        ]),
      ]),
    ]);
  }

  #renderStatusDistribution(overall) {
    const total = overall.total || 1;

    const statusBars = [
      {
        type: REVENUE_STATUS_TYPES.PROVISIONED,
        count: overall.provisioned,
        percentage: (overall.provisioned / total) * 100,
      },
      {
        type: REVENUE_STATUS_TYPES.SUBMITTED,
        count: overall.submitted,
        percentage: (overall.submitted / total) * 100,
      },
      {
        type: REVENUE_STATUS_TYPES.CANCELLED,
        count: overall.cancelled,
        percentage: (overall.cancelled / total) * 100,
      },
      {
        type: REVENUE_STATUS_TYPES.REJECTED,
        count: overall.rejected,
        percentage: (overall.rejected / total) * 100,
      },
    ];

    const stackedBar = createElement('div', { className: 'stacked-bar' },
      statusBars.map((bar) => {
        const config = STATUS_CONFIG[bar.type];
        return createElement('div', {
          className: `stacked-bar-segment segment-${bar.type}`,
          style: `width: ${bar.percentage}%; background-color: ${config.color}`,
          title: `${config.label}: ${bar.count} (${bar.percentage.toFixed(1)}%)`,
        });
      })
    );

    const legend = createElement('div', { className: 'status-legend' },
      statusBars.map((bar) => {
        const config = STATUS_CONFIG[bar.type];
        return createElement('div', { className: 'legend-item' }, [
          createElement('div', {
            className: 'legend-color',
            style: `background-color: ${config.color}`,
          }),
          createElement('span', { className: 'legend-label' }, [config.label]),
          createElement('span', { className: 'legend-value' }, [
            `${bar.count} (${bar.percentage.toFixed(1)}%)`,
          ]),
        ]);
      })
    );

    return createElement('div', { className: 'cancellation-distribution' }, [
      createElement('h3', { className: 'distribution-title' }, ['Status-Verteilung Gesamt']),
      stackedBar,
      legend,
    ]);
  }

  #renderEmployeeTable(employees) {
    if (employees.length === 0) {
      return createElement('div', { className: 'cancellation-empty' }, [
        'Keine Daten verfügbar',
      ]);
    }

    const tableHeader = createElement('div', { className: 'employee-table-header' }, [
      createElement('h3', { className: 'table-title' }, ['Mitarbeiter-Übersicht']),
      createElement('div', { className: 'table-sort-info' }, [
        `Sortiert nach: ${this.#getSortLabel()}`,
      ]),
    ]);

    const table = createElement('table', { className: 'cancellation-table' }, [
      createElement('thead', {}, [
        createElement('tr', {}, [
          createElement('th', { className: 'th-employee' }, ['Mitarbeiter']),
          createElement('th', { className: 'th-total' }, ['Gesamt']),
          createElement('th', {
            className: `th-submitted sortable ${this.#sortBy === 'submittedRate' ? 'active' : ''}`,
            onclick: () => this.#changeSort('submittedRate'),
          }, [
            'Offen',
            this.#renderSortIndicator('submittedRate'),
          ]),
          createElement('th', {
            className: `th-success sortable ${this.#sortBy === 'successRate' ? 'active' : ''}`,
            onclick: () => this.#changeSort('successRate'),
          }, [
            'Erfolg',
            this.#renderSortIndicator('successRate'),
          ]),
          createElement('th', {
            className: `th-cancellation sortable ${this.#sortBy === 'cancellationRate' ? 'active' : ''}`,
            onclick: () => this.#changeSort('cancellationRate'),
          }, [
            'Storno',
            this.#renderSortIndicator('cancellationRate'),
          ]),
          createElement('th', {
            className: `th-rejection sortable ${this.#sortBy === 'rejectionRate' ? 'active' : ''}`,
            onclick: () => this.#changeSort('rejectionRate'),
          }, [
            'Ablehnung',
            this.#renderSortIndicator('rejectionRate'),
          ]),
          createElement('th', { className: 'th-distribution' }, ['Verteilung']),
        ]),
      ]),
      createElement('tbody', {},
        employees.map((emp) => this.#renderEmployeeRow(emp))
      ),
    ]);

    return createElement('div', { className: 'cancellation-employee-table' }, [
      tableHeader,
      table,
    ]);
  }

  #renderEmployeeRow(employee) {
    const hasHighCancellation = employee.cancellationRate > 15;
    const hasHighRejection = employee.rejectionRate > 15;
    const hasLowSuccess = employee.successRate < 70;

    const rowClass = ['employee-row'];
    if (hasHighCancellation || hasHighRejection) {
      rowClass.push('row-warning');
    }

    // Mini stacked bar for distribution
    const total = employee.total || 1;
    const miniBar = createElement('div', { className: 'mini-stacked-bar' }, [
      createElement('div', {
        className: 'mini-bar-segment segment-provisioned',
        style: `width: ${(employee.provisioned / total) * 100}%`,
        title: `Provisioniert: ${employee.provisioned}`,
      }),
      createElement('div', {
        className: 'mini-bar-segment segment-submitted',
        style: `width: ${(employee.submitted / total) * 100}%`,
        title: `Eingereicht: ${employee.submitted}`,
      }),
      createElement('div', {
        className: 'mini-bar-segment segment-cancelled',
        style: `width: ${(employee.cancelled / total) * 100}%`,
        title: `Storniert: ${employee.cancelled}`,
      }),
      createElement('div', {
        className: 'mini-bar-segment segment-rejected',
        style: `width: ${(employee.rejected / total) * 100}%`,
        title: `Abgelehnt: ${employee.rejected}`,
      }),
    ]);

    return createElement('tr', { className: rowClass.join(' ') }, [
      createElement('td', { className: 'td-employee' }, [
        createElement('div', { className: 'employee-avatar-small' }, [
          employee.name.charAt(0).toUpperCase(),
        ]),
        createElement('span', { className: 'employee-name' }, [employee.name]),
      ]),
      createElement('td', { className: 'td-total' }, [
        employee.total.toString(),
      ]),
      createElement('td', { className: 'td-submitted' }, [
        createElement('div', { className: 'rate-cell' }, [
          createElement('span', { className: 'rate-value' }, [
            `${employee.submittedRate.toFixed(1)}%`,
          ]),
          createElement('span', { className: 'rate-count' }, [
            `(${employee.submitted})`,
          ]),
        ]),
      ]),
      createElement('td', { className: `td-success ${hasLowSuccess ? 'value-low' : ''}` }, [
        createElement('div', { className: 'rate-cell' }, [
          createElement('span', { className: 'rate-value' }, [
            `${employee.successRate.toFixed(1)}%`,
          ]),
          createElement('span', { className: 'rate-count' }, [
            `(${employee.provisioned})`,
          ]),
        ]),
      ]),
      createElement('td', { className: `td-cancellation ${hasHighCancellation ? 'value-high' : ''}` }, [
        createElement('div', { className: 'rate-cell' }, [
          createElement('span', { className: 'rate-value' }, [
            `${employee.cancellationRate.toFixed(1)}%`,
          ]),
          createElement('span', { className: 'rate-count' }, [
            `(${employee.cancelled})`,
          ]),
        ]),
      ]),
      createElement('td', { className: `td-rejection ${hasHighRejection ? 'value-high' : ''}` }, [
        createElement('div', { className: 'rate-cell' }, [
          createElement('span', { className: 'rate-value' }, [
            `${employee.rejectionRate.toFixed(1)}%`,
          ]),
          createElement('span', { className: 'rate-count' }, [
            `(${employee.rejected})`,
          ]),
        ]),
      ]),
      createElement('td', { className: 'td-distribution' }, [miniBar]),
    ]);
  }

  #renderSortIndicator(column) {
    if (this.#sortBy !== column) {
      return createElement('span', { className: 'sort-indicator' }, ['⇅']);
    }

    return createElement('span', { className: 'sort-indicator active' }, [
      this.#sortDirection === 'asc' ? '↑' : '↓',
    ]);
  }

  #getSortLabel() {
    const labels = {
      submittedRate: 'Offene Quote',
      cancellationRate: 'Stornoquote',
      rejectionRate: 'Ablehnungsquote',
      successRate: 'Erfolgsquote',
      total: 'Anzahl Einträge',
    };
    return labels[this.#sortBy] || 'Unbekannt';
  }

  #changeSort(column) {
    if (this.#sortBy === column) {
      this.#sortDirection = this.#sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.#sortBy = column;
      this.#sortDirection = 'desc';
    }

    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
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
