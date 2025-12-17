/**
 * Molecule: CategoryEditor
 * Dialog for creating/editing categories
 */

import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { PROVISION_TYPES } from '../../../domain/value-objects/ProvisionType.js';
import { createElement } from '../../../../../core/utils/dom.js';

export class CategoryEditor {
  #category;
  #props;
  #element;
  #displayNameInput;
  #typeInput;
  #provisionTypeSelect;
  #requiresPropertyAddressCheckbox;
  #orderInput;

  constructor(category = null, props = {}) {
    this.#category = category;
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
    const isEditMode = this.#category !== null;
    const title = isEditMode ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen';

    // Display Name Input
    this.#displayNameInput = new Input({
      label: 'Anzeigename',
      placeholder: 'z.B. Bank, Versicherung, Immobilien',
      value: this.#category?.displayName || '',
      required: true,
      maxLength: 100,
      helpText: isEditMode ? null : 'Der technische Typ wird automatisch generiert',
    });

    // Type Input (only shown in edit mode for information)
    this.#typeInput = isEditMode
      ? new Input({
          label: 'Technischer Typ',
          value: this.#category?.type || '',
          disabled: true,
          helpText: 'Eindeutiger Schlüssel (kann nicht geändert werden)',
        })
      : null;

    // Provision Type Select
    this.#provisionTypeSelect = this.#createProvisionTypeSelect();

    // Requires Property Address Checkbox
    this.#requiresPropertyAddressCheckbox = this.#createPropertyAddressCheckbox();

    // Sections
    const basicSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Grundinformationen']),
      this.#displayNameInput.element,
      this.#typeInput ? this.#typeInput.element : null,
    ].filter(Boolean));

    const provisionSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Provisions-Zuordnung']),
      this.#provisionTypeSelect,
      createElement('p', { className: 'editor-help-text' }, [
        'Bestimmt, welches Provisionsfeld in den Mitarbeiter-Profilen verwendet wird.',
      ]),
    ]);

    const optionsSection = createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Optionen']),
      this.#requiresPropertyAddressCheckbox,
    ]);

    // Action Bar
    const actionsBar = this.#createActionsBar(isEditMode);

    return createElement(
      'div',
      {
        className: `category-editor ${this.#props.className || ''}`,
      },
      [basicSection, provisionSection, optionsSection, actionsBar]
    );
  }

  #createProvisionTypeSelect() {
    const select = createElement(
      'select',
      {
        className: 'editor-select',
        id: 'provision-type-select',
      },
      Object.values(PROVISION_TYPES).map((type) => {
        const option = createElement('option', { value: type }, [this.#getProvisionTypeDisplayName(type)]);
        if (this.#category?.provisionType?.type === type) {
          option.selected = true;
        }
        return option;
      })
    );

    const label = createElement('label', { className: 'editor-label', for: 'provision-type-select' }, [
      'Provisions-Typ',
      createElement('span', { className: 'required-marker' }, ['*']),
    ]);

    return createElement('div', { className: 'editor-field' }, [label, select]);
  }

  #getProvisionTypeDisplayName(type) {
    const names = {
      [PROVISION_TYPES.BANK]: 'Bank-Provision',
      [PROVISION_TYPES.INSURANCE]: 'Versicherungs-Provision',
      [PROVISION_TYPES.REAL_ESTATE]: 'Immobilien-Provision',
    };
    return names[type] || type;
  }

  #createPropertyAddressCheckbox() {
    const checkbox = createElement('input', {
      type: 'checkbox',
      id: 'requires-property-address',
      className: 'editor-checkbox',
      checked: this.#category?.requiresPropertyAddress || false,
    });

    const label = createElement(
      'label',
      {
        className: 'editor-checkbox-label',
        for: 'requires-property-address',
      },
      [
        checkbox,
        createElement('span', {}, ['Benötigt Immobilien-Adresse (statt Produktgeber-Dropdown)']),
      ]
    );

    return createElement('div', { className: 'editor-field' }, [label]);
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

    // Validate display name
    const displayName = this.#displayNameInput.value.trim();
    if (!displayName) {
      this.#displayNameInput.setError('Anzeigename ist erforderlich');
      isValid = false;
    } else {
      this.#displayNameInput.setError(null);
    }

    return isValid;
  }

  /**
   * Generate technical type from display name
   * Examples: "Bank" → "bank", "Neue Kategorie" → "neue_kategorie"
   */
  #generateTypeFromDisplayName(displayName) {
    return displayName
      .toLowerCase()
      .trim()
      // Replace German umlauts
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      // Replace spaces and special chars with underscore
      .replace(/[^a-z0-9]+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      // Collapse multiple underscores
      .replace(/_+/g, '_');
  }

  #handleSave() {
    if (!this.#validate()) {
      return;
    }

    const displayName = this.#displayNameInput.value.trim();

    const data = {
      displayName,
      type: this.#category?.type || this.#generateTypeFromDisplayName(displayName),
      provisionType: this.#provisionTypeSelect.value,
      requiresPropertyAddress: this.#requiresPropertyAddressCheckbox.checked,
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
    this.#displayNameInput.focus();
  }
}
