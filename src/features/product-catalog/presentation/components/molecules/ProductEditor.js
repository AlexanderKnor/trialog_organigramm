/**
 * Molecule: ProductEditor
 * Dialog for creating/editing products
 */

import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class ProductEditor {
  #product;
  #categoryType;
  #categories;
  #props;
  #element;
  #nameInput;
  #categorySelectElement;
  #orderInput;
  #vatExemptCheckbox;

  constructor(product = null, categoryType = null, categories = [], props = {}) {
    this.#product = product;
    this.#categoryType = categoryType || product?.categoryType;
    this.#categories = categories;
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
    const isEditMode = this.#product !== null;
    const title = isEditMode ? 'Produkt bearbeiten' : 'Neues Produkt erstellen';

    // Name Input
    this.#nameInput = new Input({
      label: 'Produktname',
      placeholder: 'z.B. Baufinanzierung, Lebensversicherung',
      value: this.#product?.name || '',
      required: true,
      maxLength: 100,
      helpText: 'Produkte werden alphabetisch sortiert',
    });

    // Category Select
    const categorySelect = this.#createCategorySelect();

    // VAT Exemption Checkbox
    const vatExemptField = this.#createVatExemptField();

    // Basic Section
    const basicSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Produktinformationen']),
      this.#nameInput.element,
      categorySelect,
      vatExemptField,
    ]);

    // Action Bar
    const actionsBar = this.#createActionsBar(isEditMode);

    return createElement(
      'div',
      {
        className: `product-editor ${this.#props.className || ''}`,
      },
      [basicSection, actionsBar]
    );
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

  #createCategorySelect() {
    const select = createElement(
      'select',
      {
        className: 'editor-select',
        id: 'category-select',
      },
      this.#categories.map((category) => {
        const option = createElement('option', { value: category.type }, [category.displayName]);
        if (category.type === this.#categoryType) {
          option.selected = true;
        }
        return option;
      })
    );

    this.#categorySelectElement = select;

    const label = createElement('label', { className: 'editor-label', for: 'category-select' }, [
      'Kategorie',
      createElement('span', { className: 'required-marker' }, ['*']),
    ]);

    return createElement('div', { className: 'editor-field' }, [label, select]);
  }

  #createVatExemptField() {
    this.#vatExemptCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'vat-exempt-checkbox',
      className: 'editor-checkbox-input',
    });

    // Set initial value from product
    if (this.#product?.isVatExempt) {
      this.#vatExemptCheckbox.checked = true;
    }

    const checkboxLabel = createElement(
      'label',
      {
        className: 'editor-checkbox-label',
        htmlFor: 'vat-exempt-checkbox',
      },
      [
        this.#vatExemptCheckbox,
        createElement('span', { className: 'editor-checkbox-text' }, [
          'Nicht umsatzsteuerpflichtig',
        ]),
      ]
    );

    const helpText = createElement('p', { className: 'editor-help-text' }, [
      'Aktivieren Sie diese Option, wenn dieses Produkt nicht der Umsatzsteuer unterliegt (z.B. Versicherungsprovisionen).',
    ]);

    return createElement('div', { className: 'editor-field editor-checkbox-field' }, [
      checkboxLabel,
      helpText,
    ]);
  }

  #validate() {
    let isValid = true;

    // Validate name
    const name = this.#nameInput.value.trim();
    if (!name) {
      this.#nameInput.setError('Produktname ist erforderlich');
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

    const data = {
      name: this.#nameInput.value.trim(),
      categoryType: this.#categorySelectElement.value,
      order: 0,
      isVatExempt: this.#vatExemptCheckbox.checked,
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
