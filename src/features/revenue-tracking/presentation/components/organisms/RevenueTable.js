/**
 * Organism: RevenueTable
 * Displays revenue entries in a table format with sortable columns
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { REVENUE_STATUS_TYPES } from '../../../domain/value-objects/RevenueStatus.js';

// Column configuration for sorting
const COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'customerNumber', label: 'Kd-Nr.', sortable: true },
  { key: 'entryDate', label: 'Datum', sortable: true },
  { key: 'customerName', label: 'Kundenname', sortable: true },
  { key: 'customerAddress', label: 'Anschrift', sortable: true },
  { key: 'category', label: 'Kategorie', sortable: true },
  { key: 'product', label: 'Produkt', sortable: true },
  { key: 'productProvider', label: 'Produktgeber', sortable: true },
  { key: 'contractNumber', label: 'Vertragsnr.', sortable: true },
  { key: 'provisionAmount', label: 'Umsatz', sortable: true, align: 'right' },
  { key: 'employeePercent', label: 'Ihre %', sortable: true, align: 'right' },
  { key: 'employeeProvision', label: 'Ihre Provision', sortable: true, align: 'right' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Aktionen', sortable: false },
];

export class RevenueTable {
  #element;
  #entries;
  #originalEntries;
  #employee;
  #props;
  #sortColumn = null;
  #sortDirection = null; // 'asc', 'desc', or null

  constructor(props = {}) {
    this.#entries = props.entries || [];
    this.#originalEntries = [...this.#entries];
    this.#employee = props.employee || null;
    this.#props = {
      onEdit: props.onEdit || null,
      onDelete: props.onDelete || null,
      onStatusChange: props.onStatusChange || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    if (this.#entries.length === 0) {
      return this.#renderEmptyState();
    }

    const table = createElement('div', { className: 'revenue-table-container' }, [
      createElement('table', { className: 'revenue-table' }, [
        this.#renderHeader(),
        this.#renderBody(),
      ]),
    ]);

    return createElement('div', {
      className: `revenue-table-wrapper ${this.#props.className}`,
    }, [table]);
  }

  #renderEmptyState() {
    return createElement('div', { className: 'revenue-empty-state' }, [
      createElement('h3', { className: 'empty-state-title' }, [
        'Keine Umsätze in diesem Monat',
      ]),
    ]);
  }

  #renderHeader() {
    const headerCells = COLUMNS.map((col) => {
      const isActive = this.#sortColumn === col.key;
      const classes = ['revenue-table-th'];

      if (col.sortable) {
        classes.push('sortable');
        if (isActive) {
          classes.push('sort-active');
          classes.push(`sort-${this.#sortDirection}`);
        }
      }

      if (col.align === 'right') {
        classes.push('text-right');
      }

      const headerContent = [col.label];

      if (col.sortable) {
        const sortIndicator = createElement('span', { className: 'sort-indicator' }, [
          this.#renderSortIcon(isActive ? this.#sortDirection : null),
        ]);
        headerContent.push(sortIndicator);
      }

      const th = createElement('th', { className: classes.join(' ') }, headerContent);

      if (col.sortable) {
        th.addEventListener('click', () => this.#handleSort(col.key));
      }

      return th;
    });

    return createElement('thead', { className: 'revenue-table-head' }, [
      createElement('tr', {}, headerCells),
    ]);
  }

  #renderSortIcon(direction) {
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

  #handleSort(columnKey) {
    if (this.#sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (this.#sortDirection === 'asc') {
        this.#sortDirection = 'desc';
      } else if (this.#sortDirection === 'desc') {
        this.#sortColumn = null;
        this.#sortDirection = null;
      }
    } else {
      this.#sortColumn = columnKey;
      this.#sortDirection = 'asc';
    }

    this.#applySorting();
    this.#rerender();
  }

  #applySorting() {
    if (!this.#sortColumn || !this.#sortDirection) {
      // Reset to original order
      this.#entries = [...this.#originalEntries];
      return;
    }

    const direction = this.#sortDirection === 'asc' ? 1 : -1;

    this.#entries = [...this.#originalEntries].sort((a, b) => {
      const valueA = this.#getSortValue(a, this.#sortColumn);
      const valueB = this.#getSortValue(b, this.#sortColumn);

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

  #getSortValue(entry, columnKey) {
    switch (columnKey) {
      case 'id':
        return entry.id;
      case 'customerNumber':
        return entry.customerNumber;
      case 'entryDate':
        return new Date(entry.entryDate).getTime();
      case 'customerName':
        return entry.customerName?.toLowerCase() || '';
      case 'customerAddress':
        return entry.customerAddress?.formatted?.toLowerCase() || '';
      case 'category':
        return entry.category?.displayName?.toLowerCase() || '';
      case 'product':
        return entry.product?.name?.toLowerCase() || '';
      case 'productProvider':
        return entry.providerDisplayText?.toLowerCase() || '';
      case 'contractNumber':
        return entry.contractNumber?.toLowerCase() || '';
      case 'provisionAmount':
        return entry.provisionAmount || 0;
      case 'employeePercent':
        return this.#getEmployeeProvision(entry);
      case 'employeeProvision':
        return entry.provisionAmount * (this.#getEmployeeProvision(entry) / 100);
      case 'status':
        return entry.status?.displayName?.toLowerCase() || '';
      default:
        return '';
    }
  }

  #renderBody() {
    const rows = this.#entries.map((entry) => this.#renderRow(entry));
    return createElement('tbody', { className: 'revenue-table-body' }, rows);
  }

  #renderRow(entry) {
    const employeeProvision = this.#getEmployeeProvision(entry);
    const provisionAmount = entry.provisionAmount * (employeeProvision / 100);
    const isExcluded = entry.status?.type === REVENUE_STATUS_TYPES.REJECTED ||
                       entry.status?.type === REVENUE_STATUS_TYPES.CANCELLED;

    const cells = [
      this.#renderIdCell(entry.id),
      this.#renderCustomerNumberCell(entry.customerNumber),
      this.#renderDateCell(entry.entryDate),
      this.#renderTextCell(entry.customerName, 150),
      this.#renderTextCell(entry.customerAddress.formatted, 200),
      this.#renderCategoryCell(entry.category),
      this.#renderTextCell(entry.product.name, 120),
      this.#renderTextCell(entry.providerDisplayText, 150),
      this.#renderTextCell(entry.contractNumber, 120),
      this.#renderCurrencyCell(entry.provisionAmount),
      this.#renderPercentCell(employeeProvision),
      this.#renderProvisionCell(provisionAmount),
      this.#renderStatusCell(entry),
      this.#renderActionsCell(entry),
    ];

    const rowClassName = `revenue-table-row${isExcluded ? ' row-rejected' : ''}`;
    return createElement('tr', { className: rowClassName }, cells);
  }

  #renderIdCell(id) {
    const shortId = id.substring(0, 8);
    return createElement('td', { className: 'revenue-table-td' }, [
      createElement('span', {
        className: 'id-badge',
        title: id,
      }, [shortId]),
    ]);
  }

  #renderCustomerNumberCell(number) {
    return createElement('td', { className: 'revenue-table-td' }, [
      createElement('span', { className: 'customer-number-badge' }, [
        number.toString(),
      ]),
    ]);
  }

  #renderDateCell(date) {
    const formatted = this.#formatDate(date);
    return createElement('td', { className: 'revenue-table-td text-muted' }, [
      formatted,
    ]);
  }

  #renderTextCell(text, maxWidth) {
    return createElement('td', { className: 'revenue-table-td' }, [
      createElement('span', {
        className: 'cell-text',
        style: `max-width: ${maxWidth}px`,
        title: text,
      }, [text]),
    ]);
  }

  #renderCategoryCell(category) {
    return createElement('td', { className: 'revenue-table-td' }, [
      category.displayName,
    ]);
  }

  #renderCurrencyCell(amount) {
    return createElement('td', { className: 'revenue-table-td text-right' }, [
      createElement('span', { className: 'currency-value' }, [
        this.#formatCurrency(amount),
      ]),
    ]);
  }

  #renderPercentCell(percent) {
    return createElement('td', { className: 'revenue-table-td text-right' }, [
      createElement('span', { className: 'percent-value' }, [
        `${percent.toFixed(1)}%`,
      ]),
    ]);
  }

  #renderProvisionCell(amount) {
    return createElement('td', { className: 'revenue-table-td text-right' }, [
      createElement('span', { className: 'provision-badge' }, [
        this.#formatCurrency(amount),
      ]),
    ]);
  }

  #renderStatusCell(entry) {
    const status = entry.status;
    const statusClass = `status-${status.type}`;
    const isSubmitted = status.type === REVENUE_STATUS_TYPES.SUBMITTED;

    // If status is SUBMITTED and we have a status change handler, show dropdown
    if (isSubmitted && this.#props.onStatusChange) {
      const statusSelect = createElement('select', {
        className: `status-select status-${status.type}`,
      }, [
        createElement('option', { value: REVENUE_STATUS_TYPES.SUBMITTED }, ['Aktiv']),
        createElement('option', { value: REVENUE_STATUS_TYPES.CANCELLED }, ['Storno']),
      ]);

      statusSelect.value = status.type;
      statusSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        statusSelect.className = `status-select status-${newStatus}`;
        this.#props.onStatusChange(entry.id, newStatus);
      });

      return createElement('td', { className: 'revenue-table-td td-status' }, [statusSelect]);
    }

    // Otherwise show read-only badge
    return createElement('td', { className: 'revenue-table-td td-status' }, [
      createElement('span', {
        className: `status-badge ${statusClass}`,
      }, [status.displayName]),
    ]);
  }

  #renderActionsCell(entry) {
    // Only allow editing/deleting if status is still SUBMITTED
    const isEditable = entry.status?.type === REVENUE_STATUS_TYPES.SUBMITTED;

    if (!isEditable) {
      // Show lock icon when entry is locked by Trialog
      return createElement('td', { className: 'revenue-table-td' }, [
        createElement('div', { className: 'action-buttons' }, [
          createElement('span', {
            className: 'action-locked',
            title: 'Dieser Eintrag wurde von Trialog bearbeitet und kann nicht mehr geändert werden',
          }, ['🔒']),
        ]),
      ]);
    }

    const editIcon = new Icon({ name: 'edit', size: 16 });
    const editBtn = createElement('button', {
      className: 'action-btn action-btn-edit',
      type: 'button',
      title: 'Bearbeiten',
    }, [editIcon.element]);

    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#props.onEdit) {
        this.#props.onEdit(entry);
      }
    });

    const deleteIcon = new Icon({ name: 'trash', size: 16 });
    const deleteBtn = createElement('button', {
      className: 'action-btn action-btn-delete',
      type: 'button',
      title: 'Löschen',
    }, [deleteIcon.element]);

    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.#props.onDelete) {
        this.#props.onDelete(entry);
      }
    });

    return createElement('td', { className: 'revenue-table-td' }, [
      createElement('div', { className: 'action-buttons' }, [editBtn, deleteBtn]),
    ]);
  }

  #getEmployeeProvision(entry) {
    if (!this.#employee) return 0;

    switch (entry.category.type) {
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

  #formatDate(date) {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  #formatCurrency(amount) {
    return `${amount.toFixed(2)} EUR`;
  }

  get element() {
    return this.#element;
  }

  setEntries(entries) {
    this.#entries = entries;
    this.#originalEntries = [...entries];
    this.#applySorting();
    this.#rerender();
  }

  setEmployee(employee) {
    this.#employee = employee;
    this.#rerender();
  }

  #rerender() {
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
  }
}
