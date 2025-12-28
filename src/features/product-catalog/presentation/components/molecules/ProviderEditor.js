/**
 * Molecule: ProviderEditor
 * Dialog for creating/editing providers (Produktgeber)
 */

import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { createElement } from '../../../../../core/utils/dom.js';
import { Logger } from './../../../../../core/utils/logger.js';

export class ProviderEditor {
  #provider;
  #product;
  #categories;
  #products;
  #catalogService;
  #props;
  #element;
  #nameInput;
  #categorySelectElement;
  #productSelectElement;
  #orderInput;

  constructor(provider = null, product = null, props = {}) {
    this.#provider = provider;
    this.#product = product;
    this.#categories = props.categories || [];
    this.#products = props.products || [];
    this.#catalogService = props.catalogService;
    this.#props = {
      onSave: props.onSave || (() => {}),
      onCancel: props.onCancel || (() => {}),
      ...props,
    };

    this.#element = this.#render();
  }

  get element() {
    return this.#element;
  }

  #render() {
    const isEditMode = this.#provider !== null;
    const title = isEditMode ? 'Produktgeber bearbeiten' : 'Neuer Produktgeber erstellen';

    // Name Input
    this.#nameInput = new Input({
      label: 'Produktgeber',
      placeholder: 'z.B. Sparkasse, Volkswohlbund',
      value: this.#provider?.name || '',
      required: true,
      maxLength: 200,
      helpText: 'Produktgeber werden alphabetisch sortiert',
    });

    // Category + Product Dropdowns
    const categorySelect = this.#createCategorySelect();
    const productSelect = this.#createProductSelect();

    // Basic Section
    const basicSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Zuordnung']),
      categorySelect,
      productSelect,
      createElement('h4', { className: 'editor-section-title', style: 'margin-top: 1.5rem;' }, ['Produktgeber']),
      this.#nameInput.element,
    ]);

    // Action Bar
    const actionsBar = this.#createActionsBar(isEditMode);

    return createElement(
      'div',
      {
        className: `provider-editor ${this.#props.className || ''}`,
      },
      [basicSection, actionsBar]
    );
  }

  #createCategorySelect() {
    // Filter out property address categories
    const availableCategories = this.#categories.filter(c => !c.requiresPropertyAddress);

    const select = createElement(
      'select',
      {
        className: 'editor-select',
        id: 'provider-category-select',
        onchange: (e) => this.#handleCategoryChange(e.target.value),
      },
      availableCategories.map((category) => {
        const option = createElement('option', { value: category.type }, [category.displayName]);
        if (this.#product && category.type === this.#product.categoryType) {
          option.selected = true;
        }
        return option;
      })
    );

    this.#categorySelectElement = select;

    const label = createElement('label', { className: 'editor-label', for: 'provider-category-select' }, [
      'Kategorie',
      createElement('span', { className: 'required-marker' }, ['*']),
    ]);

    return createElement('div', { className: 'editor-field' }, [label, select]);
  }

  #createProductSelect() {
    const select = createElement(
      'select',
      {
        className: 'editor-select',
        id: 'provider-product-select',
      },
      this.#products.map((product) => {
        const option = createElement('option', { value: product.id }, [product.name]);
        if (this.#product && product.id === this.#product.id) {
          option.selected = true;
        }
        return option;
      })
    );

    this.#productSelectElement = select;

    const label = createElement('label', { className: 'editor-label', for: 'provider-product-select' }, [
      'Produkt',
      createElement('span', { className: 'required-marker' }, ['*']),
    ]);

    return createElement('div', { className: 'editor-field' }, [label, select]);
  }

  async #handleCategoryChange(categoryType) {
    if (!this.#catalogService) return;

    // Load products for selected category
    try {
      this.#products = await this.#catalogService.getProductsByCategory(categoryType, false);

      // Update product dropdown
      this.#productSelectElement.innerHTML = '';
      this.#products.forEach((product) => {
        const option = createElement('option', { value: product.id }, [product.name]);
        this.#productSelectElement.appendChild(option);
      });

      // Select first product if available
      if (this.#products.length > 0 && this.#productSelectElement.options.length > 0) {
        this.#productSelectElement.selectedIndex = 0;
      }
    } catch (error) {
      Logger.error('Failed to load products:', error);
    }
  }

  #createActionsBar(isEditMode) {
    const cancelButton = new Button({
      label: 'Abbrechen',
      variant: 'outline',
      onClick: () => this.#handleCancel(),
    });

    const saveButton = new Button({
      label: isEditMode ? 'Speichern' : 'Erstellen',
      variant: 'primary',
      onClick: () => this.#handleSave(),
    });

    return createElement(
      'div',
      { className: 'editor-actions-bar' },
      [
        createElement('div', { className: 'editor-actions-left' }, []),
        createElement('div', { className: 'editor-actions-right' }, [cancelButton.element, saveButton.element]),
      ]
    );
  }

  #validate() {
    let isValid = true;

    // Validate name
    const name = this.#nameInput.value.trim();
    if (!name) {
      this.#nameInput.setError('Produktgeber ist erforderlich');
      isValid = false;
    } else {
      this.#nameInput.setError(null);
    }

    return isValid;
  }

  #handleSave() {
    if (!this.#validate()) {
      return;
    }

    const selectedProductId = this.#productSelectElement.value;

    if (!selectedProductId) {
      alert('Bitte wählen Sie ein Produkt aus.');
      return;
    }

    const data = {
      name: this.#nameInput.value.trim(),
      productId: selectedProductId,
      order: 0,
    };

    if (this.#props.onSave) {
      this.#props.onSave(data);
    }
  }

  #handleCancel() {
    if (this.#props.onCancel) {
      this.#props.onCancel();
    }
  }

  focus() {
    this.#nameInput.focus();
  }
}
