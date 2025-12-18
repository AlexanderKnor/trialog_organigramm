/**
 * Organism: ProviderManagementPanel
 * Panel for managing providers (Produktgeber)
 */

import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { CatalogTable } from '../molecules/CatalogTable.js';
import { ProviderEditor } from '../molecules/ProviderEditor.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class ProviderManagementPanel {
  #catalogService;
  #element;
  #table;
  #providers;
  #categories;
  #selectedCategoryType;
  #unsubscribe;

  constructor(props = {}) {
    this.#catalogService = props.catalogService;
    this.#providers = [];
    this.#categories = [];
    this.#selectedCategoryType = null;
    this.#element = null;
  }

  get element() {
    return this.#element;
  }

  // Public method: Initialize panel with data BEFORE rendering
  async initialize() {
    await this.#loadData();
    this.#element = this.#render();
    await this.#setupRealTimeListener();
  }

  async #loadData() {
    try {
      this.#categories = await this.#catalogService.getAllCategories(false);

      if (this.#categories.length > 0) {
        this.#selectedCategoryType = this.#selectedCategoryType || this.#categories[0].type;
        await this.#loadProviders();
      }
      // Don't update UI here - will be created in #render() with the data
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error; // Re-throw so initialize() knows it failed
    }
  }

  async #loadProviders() {
    if (!this.#selectedCategoryType) {
      this.#providers = [];
      if (this.#table) {
        this.#updateTable();
      }
      return;
    }

    try {
      this.#providers = await this.#catalogService.getProvidersByCategory(this.#selectedCategoryType, true);
      // Update table if it exists (for category changes after initialization)
      if (this.#table) {
        this.#updateTable();
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      this.#providers = [];
      if (this.#table) {
        this.#updateTable();
      }
    }
  }

  async #setupRealTimeListener() {
    try {
      this.#unsubscribe = await this.#catalogService.subscribeToCatalogUpdates((data) => {
        console.log('🔄 Catalog updated (real-time)');
        this.#categories = data.categories || [];
        this.#providers = (data.providers || []).filter((p) => p.categoryType === this.#selectedCategoryType);
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
        { key: 'name', label: 'Produktgeber' },
        {
          key: 'categoryType',
          label: 'Kategorie',
          render: (provider) => {
            const category = this.#categories.find((c) => c.type === provider.categoryType);
            return category?.displayName || provider.categoryType;
          },
        },
        {
          key: 'status',
          label: 'Status',
          render: (provider) =>
            provider.isActive
              ? createElement('span', { className: 'badge badge-success' }, ['Aktiv'])
              : createElement('span', { className: 'badge badge-muted' }, ['Inaktiv']),
        },
      ],
      data: this.#providers,
      onEdit: (provider) => this.#handleEditProvider(provider),
      onDelete: (provider) => this.#handleDeleteProvider(provider),
      emptyMessage: 'Keine Produktgeber vorhanden. Wählen Sie eine Kategorie und erstellen Sie den ersten Produktgeber.',
    });

    return createElement('div', { className: 'catalog-panel' }, [toolbar, this.#table.element]);
  }

  #createToolbar() {
    const categorySelect = this.#createCategorySelect();

    const addButton = new Button({
      label: 'Neuer Produktgeber',
      variant: 'primary',
      onClick: () => this.#handleAddProvider(),
      disabled: this.#categories.length === 0,
    });

    return createElement('div', { className: 'catalog-toolbar' }, [
      createElement('h3', { className: 'catalog-panel-title' }, ['Produktgeber']),
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
    await this.#loadProviders();
  }

  #updateUI() {
    const newElement = this.#render();
    this.#element.replaceWith(newElement);
    this.#element = newElement;
    // Note: #table is re-created in #render(), reference is already correct
  }

  #updateTable() {
    if (this.#table && typeof this.#table.update === 'function') {
      this.#table.update(this.#providers);
    } else {
      // Fallback: full UI update if table reference is lost
      console.warn('⚠ Table reference lost, performing full UI update');
      this.#updateUI();
    }
  }

  #handleAddProvider() {
    if (!this.#selectedCategoryType) {
      alert('Bitte wählen Sie zuerst eine Kategorie aus.');
      return;
    }
    this.#showProviderDialog(null);
  }

  #handleEditProvider(provider) {
    this.#showProviderDialog(provider);
  }

  async #handleDeleteProvider(provider) {
    const confirmed = confirm(
      `Produktgeber "${provider.name}" wirklich löschen?\n\nDies ist nicht rückgängig zu machen und kann fehlschlagen, wenn der Produktgeber noch in Umsatz-Einträgen verwendet wird.`
    );

    if (!confirmed) return;

    try {
      await this.#catalogService.deleteProvider(provider.id);
      console.log('✓ Provider deleted successfully');
      await this.#loadProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      alert(`Fehler beim Löschen:\n\n${error.message}`);
    }
  }

  #showProviderDialog(provider) {
    const dialog = createElement('div', { className: 'dialog-overlay' });

    const editor = new ProviderEditor(provider, this.#selectedCategoryType, {
      onSave: async (data) => {
        try {
          const loadingOverlay = this.#createLoadingOverlay();
          dialog.querySelector('.dialog-content').appendChild(loadingOverlay);
          setTimeout(() => loadingOverlay.classList.add('visible'), 10);

          if (provider) {
            await this.#catalogService.updateProvider(provider.id, data);
            console.log('✓ Provider updated');
          } else {
            await this.#catalogService.createProvider(this.#selectedCategoryType, data);
            console.log('✓ Provider created');
          }

          this.#closeDialog(dialog);
          await this.#loadProviders();
        } catch (error) {
          console.error('Failed to save provider:', error);
          loadingOverlay?.remove();
          alert(`Fehler beim Speichern:\n\n${error.message}`);
        }
      },
      onCancel: () => this.#closeDialog(dialog),
    });

    const dialogContent = createElement('div', { className: 'dialog-content' }, [
      createElement('h2', { className: 'dialog-title' }, [
        provider ? 'Produktgeber bearbeiten' : 'Neuer Produktgeber',
      ]),
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
