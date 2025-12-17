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
  #props;
  #element;
  #nameInput;
  #orderInput;

  constructor(product = null, categoryType = null, props = {}) {
    this.#product = product;
    this.#categoryType = categoryType || product?.categoryType;
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

    // Basic Section
    const basicSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Produktinformationen']),
      this.#nameInput.element,
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
      order: 0, // Alphabetic sorting - order field not used
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
