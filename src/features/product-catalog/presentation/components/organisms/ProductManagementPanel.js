/**
 * Organism: ProductManagementPanel
 * Panel for managing products
 */

import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { CatalogTable } from '../molecules/CatalogTable.js';
import { ProductEditor } from '../molecules/ProductEditor.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class ProductManagementPanel {
  #catalogService;
  #element;
  #table;
  #products;
  #categories;
  #selectedCategoryType;
  #unsubscribe;

  constructor(props = {}) {
    this.#catalogService = props.catalogService;
    this.#products = [];
    this.#categories = [];
    this.#selectedCategoryType = null;
    this.#element = this.#render();
    this.#loadData();
    this.#setupRealTimeListener();
  }

  get element() {
    return this.#element;
  }

  async #loadData() {
    try {
      this.#categories = await this.#catalogService.getAllCategories(false);

      if (this.#categories.length > 0) {
        this.#selectedCategoryType = this.#selectedCategoryType || this.#categories[0].type;
        await this.#loadProducts();
      }

      this.#updateUI();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.#showError('Fehler beim Laden der Daten');
    }
  }

  async #loadProducts() {
    if (!this.#selectedCategoryType) {
      this.#products = [];
      return;
    }

    try {
      this.#products = await this.#catalogService.getProductsByCategory(this.#selectedCategoryType, true);
      this.#updateTable();
    } catch (error) {
      console.error('Failed to load products:', error);
      this.#products = [];
      this.#updateTable();
    }
  }

  async #setupRealTimeListener() {
    try {
      this.#unsubscribe = await this.#catalogService.subscribeToCatalogUpdates((data) => {
        console.log('🔄 Catalog updated (real-time)');
        this.#categories = data.categories || [];
        this.#products = (data.products || []).filter((p) => p.categoryType === this.#selectedCategoryType);
        this.#updateUI();
      });
    } catch (error) {
      console.error('Failed to setup real-time listener:', error);
      this.#unsubscribe = null;
    }
  }

  #render() {
    const toolbar = this.#createToolbar();

    this.#table = new CatalogTable({
      columns: [
        { key: 'name', label: 'Produktname' },
        {
          key: 'categoryType',
          label: 'Kategorie',
          render: (product) => {
            const category = this.#categories.find((c) => c.type === product.categoryType);
            return category?.displayName || product.categoryType;
          },
        },
        {
          key: 'status',
          label: 'Status',
          render: (product) =>
            product.isActive
              ? createElement('span', { className: 'badge badge-success' }, ['Aktiv'])
              : createElement('span', { className: 'badge badge-muted' }, ['Inaktiv']),
        },
      ],
      data: this.#products,
      onEdit: (product) => this.#handleEditProduct(product),
      onDelete: (product) => this.#handleDeleteProduct(product),
      emptyMessage: 'Keine Produkte vorhanden. Wählen Sie eine Kategorie und erstellen Sie das erste Produkt.',
    });

    return createElement('div', { className: 'catalog-panel' }, [toolbar, this.#table.element]);
  }

  #createToolbar() {
    const categorySelect = this.#createCategorySelect();

    const addButton = new Button({
      label: 'Neues Produkt',
      variant: 'primary',
      onClick: () => this.#handleAddProduct(),
      disabled: this.#categories.length === 0,
    });

    return createElement('div', { className: 'catalog-toolbar' }, [
      createElement('h3', { className: 'catalog-panel-title' }, ['Produkte']),
      createElement('div', { className: 'catalog-toolbar-actions' }, [categorySelect, addButton.element]),
    ]);
  }

  #createCategorySelect() {
    const select = createElement(
      'select',
      {
        className: 'catalog-category-filter',
        onchange: (e) => this.#handleCategoryChange(e.target.value),
      },
      this.#categories.map((category) => {
        const option = createElement('option', { value: category.type }, [category.displayName]);
        if (category.type === this.#selectedCategoryType) {
          option.selected = true;
        }
        return option;
      })
    );

    if (this.#categories.length === 0) {
      select.disabled = true;
      select.appendChild(createElement('option', {}, ['Keine Kategorien verfügbar']));
    }

    return select;
  }

  async #handleCategoryChange(categoryType) {
    this.#selectedCategoryType = categoryType;
    await this.#loadProducts();
  }

  #updateUI() {
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
    this.#table = this.#element.querySelector('.catalog-table-wrapper');
  }

  #updateTable() {
    if (this.#table) {
      this.#table.update(this.#products);
    }
  }

  #handleAddProduct() {
    if (!this.#selectedCategoryType) {
      alert('Bitte wählen Sie zuerst eine Kategorie aus.');
      return;
    }
    this.#showProductDialog(null);
  }

  #handleEditProduct(product) {
    this.#showProductDialog(product);
  }

  async #handleDeleteProduct(product) {
    const confirmed = confirm(
      `Produkt "${product.name}" wirklich löschen?\n\nDies ist nicht rückgängig zu machen und kann fehlschlagen, wenn das Produkt noch in Umsatz-Einträgen verwendet wird.`
    );

    if (!confirmed) return;

    try {
      await this.#catalogService.deleteProduct(product.id);
      console.log('✓ Product deleted successfully');
      await this.#loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert(`Fehler beim Löschen:\n\n${error.message}`);
    }
  }

  #showProductDialog(product) {
    const dialog = createElement('div', { className: 'dialog-overlay' });

    const editor = new ProductEditor(product, this.#selectedCategoryType, {
      onSave: async (data) => {
        try {
          const loadingOverlay = this.#createLoadingOverlay();
          dialog.querySelector('.dialog-content').appendChild(loadingOverlay);
          setTimeout(() => loadingOverlay.classList.add('visible'), 10);

          if (product) {
            await this.#catalogService.updateProduct(product.id, data);
            console.log('✓ Product updated');
          } else {
            await this.#catalogService.createProduct(this.#selectedCategoryType, data);
            console.log('✓ Product created');
          }

          this.#closeDialog(dialog);
          await this.#loadProducts();
        } catch (error) {
          console.error('Failed to save product:', error);
          loadingOverlay?.remove();
          alert(`Fehler beim Speichern:\n\n${error.message}`);
        }
      },
      onCancel: () => this.#closeDialog(dialog),
    });

    const dialogContent = createElement('div', { className: 'dialog-content' }, [
      createElement('h2', { className: 'dialog-title' }, [product ? 'Produkt bearbeiten' : 'Neues Produkt']),
      editor.element,
    ]);

    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    requestAnimationFrame(() => {
      dialog.style.opacity = '1';
    });
    editor.focus();
  }

  #createLoadingOverlay() {
    return createElement(
      'div',
      {
        className: 'dialog-loading-overlay visible',
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
    console.error(message);
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
