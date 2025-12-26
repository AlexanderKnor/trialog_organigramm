/**
 * Molecule: CatalogTable
 * Reusable table component for displaying catalog data
 */

import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class CatalogTable {
  #props;
  #element;
  #sortColumn;
  #sortDirection;

  constructor(props = {}) {
    this.#props = {
      columns: props.columns || [],
      data: props.data || [],
      onEdit: props.onEdit || null,
      onDelete: props.onDelete || null,
      onSort: props.onSort || null,
      sortColumn: props.sortColumn || null,
      sortDirection: props.sortDirection || null,
      emptyMessage: props.emptyMessage || 'Keine Einträge vorhanden',
      ...props,
    };

    this.#sortColumn = this.#props.sortColumn;
    this.#sortDirection = this.#props.sortDirection;

    this.#element = this.#render();
  }

  get element() {
    return this.#element;
  }

  #render() {
    if (this.#props.data.length === 0) {
      return this.#renderEmpty();
    }

    const table = createElement('table', { className: 'catalog-table' }, [
      this.#renderHeader(),
      this.#renderBody(),
    ]);

    return createElement('div', { className: 'catalog-table-wrapper' }, [table]);
  }

  #renderEmpty() {
    return createElement('div', { className: 'catalog-table-empty' }, [
      createElement('p', { className: 'empty-message' }, [this.#props.emptyMessage]),
    ]);
  }

  #renderHeader() {
    const headerCells = this.#props.columns.map((column) => {
      const isActive = this.#sortColumn === column.key;
      const classes = [`table-header-${column.key}`];

      // Mark as sortable if column has sortable: true (default)
      const isSortable = column.sortable !== false;
      if (isSortable) {
        classes.push('sortable');
        if (isActive) {
          classes.push('sort-active');
          classes.push(`sort-${this.#sortDirection}`);
        }
      }

      const headerContent = [column.label];
      if (isSortable) {
        headerContent.push(this.#renderSortIndicator(isActive ? this.#sortDirection : null));
      }

      const th = createElement('th', { className: classes.join(' ') }, headerContent);

      if (isSortable && this.#props.onSort) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.#handleSort(column.key));
      }

      return th;
    });

    // Add actions column if edit or delete handlers provided
    if (this.#props.onEdit || this.#props.onDelete) {
      headerCells.push(createElement('th', { className: 'table-header-actions' }, ['Aktionen']));
    }

    return createElement('thead', {}, [createElement('tr', {}, headerCells)]);
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

  #handleSort(columnKey) {
    if (!this.#props.onSort) return;

    let newDirection;

    if (this.#sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (this.#sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (this.#sortDirection === 'desc') {
        newDirection = null;
        columnKey = null;
      }
    } else {
      // New column: start with asc
      newDirection = 'asc';
    }

    this.#sortColumn = columnKey;
    this.#sortDirection = newDirection;

    this.#props.onSort(columnKey, newDirection);
  }

  #renderBody() {
    const rows = this.#props.data.map((item) => this.#renderRow(item));
    return createElement('tbody', {}, rows);
  }

  #renderRow(item) {
    const cells = this.#props.columns.map((column) => {
      const value = column.render ? column.render(item) : item[column.key];
      return createElement('td', { className: `table-cell-${column.key}` }, [value]);
    });

    // Add actions cell
    if (this.#props.onEdit || this.#props.onDelete) {
      cells.push(this.#renderActionsCell(item));
    }

    return createElement('tr', { className: 'table-row' }, cells);
  }

  #renderActionsCell(item) {
    const actions = [];

    if (this.#props.onEdit) {
      const editButton = new Button({
        label: 'Bearbeiten',
        variant: 'ghost',
        size: 'sm',
        onClick: () => this.#props.onEdit(item),
      });
      actions.push(editButton.element);
    }

    if (this.#props.onDelete) {
      const deleteButton = new Button({
        label: 'Löschen',
        variant: 'ghost',
        size: 'sm',
        onClick: () => this.#props.onDelete(item),
      });
      actions.push(deleteButton.element);
    }

    return createElement('td', { className: 'table-cell-actions' }, actions);
  }

  update(data, sortColumn = null, sortDirection = null) {
    this.#props.data = data;

    // Update sort state if provided
    if (sortColumn !== undefined) {
      this.#sortColumn = sortColumn;
      this.#props.sortColumn = sortColumn;
    }
    if (sortDirection !== undefined) {
      this.#sortDirection = sortDirection;
      this.#props.sortDirection = sortDirection;
    }

    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
  }

  destroy() {
    this.#element.remove();
  }
}
