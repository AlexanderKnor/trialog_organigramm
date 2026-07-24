/**
 * Molecule: KnowledgeCategoryEditor
 * Create/edit form for a knowledge category. Never touches the service — it
 * hands a plain object to onSave and lets the panel do the work.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';

/** Icons offered for a category. All exist in the Icon atom. */
const CATEGORY_ICONS = Object.freeze([
  { value: 'folder', label: 'Ordner' },
  { value: 'briefcase', label: 'Aktentasche' },
  { value: 'building', label: 'Gebäude' },
  { value: 'fileText', label: 'Dokument' },
  { value: 'users', label: 'Personen' },
  { value: 'star', label: 'Stern' },
  { value: 'tag', label: 'Etikett' },
  { value: 'info', label: 'Info' },
]);

export class KnowledgeCategoryEditor {
  #category;
  #props;
  #element;
  #displayNameInput;
  #iconSelect;

  constructor(category, props = {}) {
    this.#category = category;
    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#element = this.#render();
  }

  get #isEditMode() {
    return this.#category !== null;
  }

  #render() {
    return createElement('div', { className: 'kb-editor' }, [
      this.#createGeneralSection(),
      this.#createActionsBar(),
    ]);
  }

  #createGeneralSection() {
    this.#displayNameInput = new Input({
      id: 'kb-category-display-name',
      label: 'Name',
      placeholder: 'z. B. Versicherung',
      value: this.#category?.displayName || '',
      required: true,
    });

    const children = [
      createElement('h4', { className: 'editor-section-title' }, ['Kategorie']),
      this.#displayNameInput.element,
    ];

    if (this.#isEditMode) {
      // The type is the parent key every entry stores; changing it would orphan
      // them all, so it is shown for orientation and locked.
      children.push(
        new Input({
          id: 'kb-category-type',
          label: 'Technischer Schlüssel',
          value: this.#category.type,
          disabled: true,
        }).element,
        createElement('p', { className: 'editor-help-text' }, [
          'Der technische Schlüssel wird aus dem Namen abgeleitet und kann nicht geändert werden.',
        ])
      );
    }

    children.push(this.#createIconSelect());

    return createElement('div', { className: 'editor-section-group' }, children);
  }

  /** Hand-rolled: there is no Select atom in this codebase. */
  #createIconSelect() {
    const current = this.#category?.icon || 'folder';

    this.#iconSelect = createElement(
      'select',
      { className: 'input-field', id: 'kb-category-icon' },
      CATEGORY_ICONS.map((icon) =>
        createElement('option', { value: icon.value, selected: icon.value === current }, [icon.label])
      )
    );

    return createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label', htmlFor: 'kb-category-icon' }, ['Symbol']),
      this.#iconSelect,
    ]);
  }

  #createActionsBar() {
    const cancel = new Button({
      label: 'Abbrechen',
      variant: 'outline',
      onClick: () => this.#props.onCancel?.(),
    });

    const save = new Button({
      label: this.#isEditMode ? 'Speichern' : 'Erstellen',
      variant: 'primary',
      onClick: () => this.#handleSave(),
    });

    return createElement('div', { className: 'editor-actions-bar' }, [
      createElement('div', {}, [cancel.element]),
      createElement('div', {}, [save.element]),
    ]);
  }

  #validate() {
    const displayName = this.#displayNameInput.value.trim();

    if (!displayName) {
      this.#displayNameInput.setError('Name ist erforderlich');
      return false;
    }

    if (!this.#isEditMode && !this.#generateTypeFromDisplayName(displayName)) {
      // e.g. a name of only punctuation would slug down to an empty string,
      // which the entity would reject with a far less helpful message.
      this.#displayNameInput.setError('Name muss mindestens einen Buchstaben oder eine Ziffer enthalten');
      return false;
    }

    this.#displayNameInput.setError(null);
    return true;
  }

  /** Mirrors the catalog's slug rules so both taxonomies read the same. */
  #generateTypeFromDisplayName(displayName) {
    return displayName
      .toLowerCase()
      .trim()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  #handleSave() {
    if (!this.#validate()) {
      return;
    }

    const displayName = this.#displayNameInput.value.trim();

    this.#props.onSave?.({
      type: this.#isEditMode ? this.#category.type : this.#generateTypeFromDisplayName(displayName),
      displayName,
      icon: this.#iconSelect.value,
    });
  }

  focus() {
    this.#displayNameInput.focus();
  }

  get element() {
    return this.#element;
  }
}
