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

    // If status is SUBMITTED and we have a status change handler, show custom dropdown
    if (isSubmitted && this.#props.onStatusChange) {
      return createElement('td', { className: 'revenue-table-td td-status' }, [
        this.#createStatusDropdown(entry, status),
      ]);
    }

    // Otherwise show read-only badge
    return createElement('td', { className: 'revenue-table-td td-status' }, [
      createElement('span', {
        className: `status-badge ${statusClass}`,
      }, [status.displayName]),
    ]);
  }

  #createStatusDropdown(entry, currentStatus) {
    const statusOptions = [
      { value: REVENUE_STATUS_TYPES.SUBMITTED, label: 'Aktiv' },
      { value: REVENUE_STATUS_TYPES.CANCELLED, label: 'Storno' },
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
          this.#props.onStatusChange(entry.id, option.value);
        }
        this.#closeDropdown(dropdown, menu);
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
        this.#closeDropdown(dropdown, menu);
      }
    };
    document.addEventListener('click', closeHandler);

    // Clean up on scroll to reposition or close
    const scrollHandler = () => {
      if (dropdown.classList.contains('open')) {
        positionMenu();
      }
    };
    window.addEventListener('scroll', scrollHandler, true);

    return dropdown;
  }

  #closeDropdown(dropdown, menu) {
    dropdown.classList.remove('open');
    menu.classList.remove('open');
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
    // PRIORITY: Use provision snapshot if available (immutable, point-in-time value)
    if (entry.hasProvisionSnapshot) {
      return entry.ownerProvisionSnapshot || 0;
    }

    // FALLBACK: Dynamic calculation for legacy entries without snapshots
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
