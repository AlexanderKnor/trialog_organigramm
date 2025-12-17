/**
 * Molecule: CatalogTable
 * Reusable table component for displaying catalog data
 */

import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class CatalogTable {
  #props;
  #element;

  constructor(props = {}) {
    this.#props = {
      columns: props.columns || [],
      data: props.data || [],
      onEdit: props.onEdit || null,
      onDelete: props.onDelete || null,
      emptyMessage: props.emptyMessage || 'Keine Einträge vorhanden',
      ...props,
    };

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
    const headerCells = this.#props.columns.map((column) =>
      createElement('th', { className: `table-header-${column.key}` }, [column.label])
    );

    // Add actions column if edit or delete handlers provided
    if (this.#props.onEdit || this.#props.onDelete) {
      headerCells.push(createElement('th', { className: 'table-header-actions' }, ['Aktionen']));
    }

    return createElement('thead', {}, [createElement('tr', {}, headerCells)]);
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

  update(data) {
    this.#props.data = data;
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
  }

  destroy() {
    this.#element.remove();
  }
}
