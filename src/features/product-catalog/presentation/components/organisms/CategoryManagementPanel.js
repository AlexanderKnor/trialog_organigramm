/**
 * Organism: CategoryManagementPanel
 * Panel for managing categories
 */

import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { CatalogTable } from '../molecules/CatalogTable.js';
import { CategoryEditor } from '../molecules/CategoryEditor.js';
import { createElement } from '../../../../../core/utils/dom.js';
import { Logger } from './../../../../../core/utils/logger.js';

export class CategoryManagementPanel {
  #catalogService;
  #element;
  #table;
  #categories;
  #unsubscribe;
  #sortColumn;
  #sortDirection;

  constructor(props = {}) {
    this.#catalogService = props.catalogService;
    this.#categories = [];
    this.#element = null;
    this.#sortColumn = null;
    this.#sortDirection = null;
  }

  get element() {
    return this.#element;
  }

  // Public method: Initialize panel with data BEFORE rendering
  async initialize() {
    await this.#loadCategories();
    this.#element = this.#render();
    await this.#setupRealTimeListener();
  }

  async #loadCategories() {
    try {
      this.#categories = await this.#catalogService.getAllCategories(true);
      // Don't update table here - it will be created in #render() with the data
    } catch (error) {
      Logger.error('Failed to load categories:', error);
      throw error; // Re-throw so initialize() knows it failed
    }
  }

  async #setupRealTimeListener() {
    try {
      this.#unsubscribe = await this.#catalogService.subscribeToCatalogUpdates((data) => {
        Logger.log('🔄 Catalog updated (real-time)');
        this.#categories = data.categories || [];
        this.#updateTable();
      });
    } catch (error) {
      Logger.error('Failed to setup real-time listener:', error);
      this.#unsubscribe = null;
    }
  }

  #render() {
    const toolbar = this.#createToolbar();

    // Apply sorting to data
    const sortedCategories = this.#applySorting(this.#categories);

    this.#table = new CatalogTable({
      columns: [
        { key: 'displayName', label: 'Anzeigename' },
        { key: 'type', label: 'Typ' },
        {
          key: 'provisionType',
          label: 'Provisions-Typ',
          render: (category) => category.provisionType?.type || '-',
        },
        {
          key: 'requiresPropertyAddress',
          label: 'Immobilien-Adresse',
          render: (category) =>
            category.requiresPropertyAddress
              ? createElement('span', { className: 'badge badge-success' }, ['✓ Ja'])
              : createElement('span', { className: 'badge badge-muted' }, ['Nein']),
        },
        {
          key: 'status',
          label: 'Status',
          render: (category) =>
            category.isActive
              ? createElement('span', { className: 'badge badge-success' }, ['Aktiv'])
              : createElement('span', { className: 'badge badge-muted' }, ['Inaktiv']),
        },
      ],
      data: sortedCategories,
      sortColumn: this.#sortColumn,
      sortDirection: this.#sortDirection,
      onSort: (column, direction) => this.#handleSort(column, direction),
      onEdit: (category) => this.#handleEditCategory(category),
      onDelete: (category) => this.#handleDeleteCategory(category),
      emptyMessage: 'Keine Kategorien vorhanden. Erstellen Sie die erste Kategorie.',
    });

    return createElement('div', { className: 'catalog-panel' }, [toolbar, this.#table.element]);
  }

  #applySorting(categories) {
    if (!this.#sortColumn || !this.#sortDirection) {
      return categories;
    }

    const direction = this.#sortDirection === 'asc' ? 1 : -1;

    return [...categories].sort((a, b) => {
      const valueA = this.#getSortValue(a, this.#sortColumn);
      const valueB = this.#getSortValue(b, this.#sortColumn);

      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB, 'de') * direction;
      }

      if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        return (valueA === valueB ? 0 : valueA ? -1 : 1) * direction;
      }

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }

  #getSortValue(category, columnKey) {
    switch (columnKey) {
      case 'displayName':
        return category.displayName?.toLowerCase() || '';
      case 'type':
        return category.type?.toLowerCase() || '';
      case 'provisionType':
        return category.provisionType?.type?.toLowerCase() || '';
      case 'requiresPropertyAddress':
        return category.requiresPropertyAddress;
      case 'status':
        return category.isActive;
      default:
        return '';
    }
  }

  #handleSort(column, direction) {
    this.#sortColumn = column;
    this.#sortDirection = direction;
    this.#updateTable();
  }

  #createToolbar() {
    const addButton = new Button({
      label: 'Neue Kategorie',
      variant: 'primary',
      onClick: () => this.#handleAddCategory(),
    });

    return createElement('div', { className: 'catalog-toolbar' }, [
      createElement('h3', { className: 'catalog-panel-title' }, ['Kategorien']),
      createElement('div', { className: 'catalog-toolbar-actions' }, [addButton.element]),
    ]);
  }

  #updateTable() {
    if (this.#table && typeof this.#table.update === 'function') {
      const sortedCategories = this.#applySorting(this.#categories);
      this.#table.update(sortedCategories, this.#sortColumn, this.#sortDirection);
    } else {
      Logger.warn('⚠ Table reference lost, recreating panel');
      const newElement = this.#render();
      this.#element.replaceWith(newElement);
      this.#element = newElement;
    }
  }

  #handleAddCategory() {
    this.#showCategoryDialog(null);
  }

  #handleEditCategory(category) {
    this.#showCategoryDialog(category);
  }

  async #handleDeleteCategory(category) {
    // Get count of products and providers to inform user
    const products = await this.#catalogService.getProductsByCategory(category.type, true);
    const providers = await this.#catalogService.getProvidersForCategory(category.type, true);

    let confirmMessage = `Kategorie "${category.displayName}" wirklich löschen?\n\n`;

    if (products.length > 0 || providers.length > 0) {
      confirmMessage += '⚠️ KASKADIERENDES LÖSCHEN:\n';
      if (products.length > 0) {
        confirmMessage += `• ${products.length} Produkt(e) werden gelöscht\n`;
      }
      if (providers.length > 0) {
        confirmMessage += `• ${providers.length} Produktgeber werden gelöscht\n`;
      }
      confirmMessage += '\n';
    }

    confirmMessage += 'Dies ist nicht rückgängig zu machen!';

    const confirmed = confirm(confirmMessage);

    if (!confirmed) return;

    try {
      await this.#catalogService.deleteCategory(category.type);
      Logger.log('✓ Category deleted successfully with cascade');
      await this.#loadCategories();
    } catch (error) {
      Logger.error('Failed to delete category:', error);
      alert(`Fehler beim Löschen:\n\n${error.message}`);
    }
  }

  #showCategoryDialog(category) {
    const dialog = createElement('div', { className: 'dialog-overlay' });

    const editor = new CategoryEditor(category, {
      onSave: async (data) => {
        let loadingOverlay;
        try {
          // Show loading
          loadingOverlay = this.#createLoadingOverlay();
          dialog.querySelector('.dialog-content').appendChild(loadingOverlay);
          setTimeout(() => loadingOverlay.classList.add('visible'), 10);

          if (category) {
            await this.#catalogService.updateCategory(category.type, data);
            Logger.log('✓ Category updated');
          } else {
            await this.#catalogService.createCategory(data);
            Logger.log('✓ Category created');
          }

          this.#closeDialog(dialog);
          await this.#loadCategories();
        } catch (error) {
          Logger.error('Failed to save category:', error);
          loadingOverlay?.remove();
          alert(`Fehler beim Speichern:\n\n${error.message}`);
        }
      },
      onCancel: () => this.#closeDialog(dialog),
    });

    const dialogContent = createElement('div', { className: 'dialog-content' }, [
      createElement('h2', { className: 'dialog-title' }, [
        category ? 'Kategorie bearbeiten' : 'Neue Kategorie',
      ]),
      editor.element,
    ]);

    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    // Fade in animation
    requestAnimationFrame(() => {
      dialog.style.opacity = '1';
    });

    editor.focus();
  }

  #createLoadingOverlay() {
    return createElement(
      'div',
      {
        className: 'dialog-loading-overlay',
        style:
          'position: absolute; inset: 0; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; border-radius: 24px; z-index: 1000; opacity: 0; transition: opacity 0.2s ease;',
      },
      [
        createElement('div', {
          className: 'loading-spinner',
          style:
            'width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite;',
        }),
      ]
    );
  }

  #closeDialog(dialog) {
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.95)';
    dialog.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => dialog.remove(), 200);
  }

  #showError(message) {
    Logger.error(message);
    // TODO: Show toast notification
  }

  destroy() {
    if (this.#unsubscribe && typeof this.#unsubscribe === 'function') {
      this.#unsubscribe();
    }
    if (this.#element && this.#element.parentNode) {
      this.#element.remove();
    }
  }
}
