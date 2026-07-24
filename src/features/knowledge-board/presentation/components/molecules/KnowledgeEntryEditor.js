/**
 * Molecule: KnowledgeEntryEditor
 * Create/edit form for a knowledge entry. Assembles a plain object and hands it
 * to onSave; it never talks to the service itself.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { KnowledgeLink } from '../../../domain/value-objects/KnowledgeLink.js';
import { LINK_TARGET_TYPES } from '../../../domain/value-objects/LinkTarget.js';
import { DEFAULT_REVIEW_INTERVAL_DAYS } from '../../../domain/value-objects/Freshness.js';

/**
 * <input type="date"> speaks YYYY-MM-DD, which new Date() reads as UTC midnight
 * while new Date(y, m, d) reads as local midnight. In CET that difference shows
 * up as the date jumping back a day. Both directions are pinned to UTC here so
 * a round-trip through the form cannot shift the date.
 */
const dateInputToIso = (value) => new Date(`${value}T00:00:00Z`).toISOString();
const isoToDateInput = (iso) => iso.slice(0, 10);

export class KnowledgeEntryEditor {
  #entry;
  #props;
  #element;
  #titleInput;
  #descriptionField;
  #categorySelect;
  #partnerNameInput;
  #partnerContactInput;
  #tagsInput;
  #linkRows;
  #linkRowHost;
  #reviewedAtInput;
  #intervalInput;

  constructor(entry, props = {}) {
    this.#entry = entry;
    this.#props = {
      categories: props.categories || [],
      defaultCategoryType: props.defaultCategoryType || null,
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#linkRows = (entry?.links || []).map((link) => ({
      label: link.label,
      url: link.url,
      target: link.target.toJSON(),
    }));

    this.#element = this.#render();
  }

  get #isEditMode() {
    return this.#entry !== null;
  }

  #render() {
    return createElement('div', { className: 'kb-editor kb-entry-editor' }, [
      this.#createContentSection(),
      this.#createPartnerSection(),
      this.#createLinksSection(),
      this.#createFreshnessSection(),
      this.#createActionsBar(),
    ]);
  }

  #createContentSection() {
    this.#titleInput = new Input({
      id: 'kb-entry-title',
      label: 'Titel',
      placeholder: 'z. B. Tarifübersicht Berufsunfähigkeit',
      value: this.#entry?.title || '',
      required: true,
    });

    this.#descriptionField = createElement('textarea', {
      className: 'input-field',
      id: 'kb-entry-description',
      rows: 6,
      placeholder: 'Worum geht es? Zeilenumbrüche bleiben erhalten.',
    });
    this.#descriptionField.value = this.#entry?.description || '';

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Inhalt']),
      this.#titleInput.element,
      this.#createCategorySelect(),
      createElement('div', { className: 'input-wrapper' }, [
        createElement('label', { className: 'input-label', htmlFor: 'kb-entry-description' }, [
          'Beschreibung',
        ]),
        this.#descriptionField,
      ]),
    ]);
  }

  #createCategorySelect() {
    const current = this.#entry?.categoryType || this.#props.defaultCategoryType;

    this.#categorySelect = createElement(
      'select',
      { className: 'input-field', id: 'kb-entry-category' },
      this.#props.categories.map((category) =>
        createElement(
          'option',
          { value: category.type, selected: category.type === current },
          [category.displayName]
        )
      )
    );

    return createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label', htmlFor: 'kb-entry-category' }, [
        'Kategorie',
      ]),
      this.#categorySelect,
    ]);
  }

  #createPartnerSection() {
    this.#partnerNameInput = new Input({
      id: 'kb-entry-partner-name',
      label: 'Produktpartner',
      placeholder: 'z. B. Alte Leipziger',
      value: this.#entry?.partnerName || '',
    });

    this.#partnerContactInput = new Input({
      id: 'kb-entry-partner-contact',
      label: 'Kontakt',
      placeholder: 'z. B. service@partner.de oder +49 30 123456',
      value: this.#entry?.partnerContact || '',
    });

    this.#tagsInput = new Input({
      id: 'kb-entry-tags',
      label: 'Schlagwörter',
      placeholder: 'Mit Komma trennen, z. B. bu, tarif',
      value: (this.#entry?.tags || []).join(', '),
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Partner']),
      this.#partnerNameInput.element,
      this.#partnerContactInput.element,
      this.#tagsInput.element,
    ]);
  }

  #createLinksSection() {
    this.#linkRowHost = createElement('div', { className: 'kb-link-rows' });
    this.#renderLinkRows();

    const addButton = new Button({
      label: 'Link hinzufügen',
      variant: 'outline',
      size: 'sm',
      onClick: () => {
        this.#linkRows.push({ label: '', url: '', target: LINK_TARGET_TYPES.EXTERNAL });
        this.#renderLinkRows();
      },
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Links']),
      this.#linkRowHost,
      createElement('div', { className: 'kb-link-add' }, [addButton.element]),
    ]);
  }

  #renderLinkRows() {
    this.#linkRowHost.replaceChildren(
      ...this.#linkRows.map((row, index) => this.#createLinkRow(row, index))
    );
  }

  #createLinkRow(row, index) {
    const error = createElement('span', {
      className: 'input-error-message kb-link-error',
      hidden: true,
    });

    const labelInput = createElement('input', {
      className: 'input-field kb-link-label',
      type: 'text',
      value: row.label,
      placeholder: 'Bezeichnung',
      'aria-label': `Bezeichnung von Link ${index + 1}`,
      oninput: (event) => {
        row.label = event.target.value;
      },
    });

    const urlInput = createElement('input', {
      className: 'input-field kb-link-url',
      type: 'text',
      value: row.url,
      placeholder: 'https://… oder #org',
      'aria-label': `Ziel von Link ${index + 1}`,
      oninput: (event) => {
        row.url = event.target.value;
        this.#validateLinkRow(row, urlInput, error);
      },
    });

    const targetSelect = createElement(
      'select',
      {
        className: 'input-field kb-link-target',
        'aria-label': `Art von Link ${index + 1}`,
        onchange: (event) => {
          row.target = event.target.value;
          this.#validateLinkRow(row, urlInput, error);
        },
      },
      [
        createElement(
          'option',
          { value: LINK_TARGET_TYPES.EXTERNAL, selected: row.target === LINK_TARGET_TYPES.EXTERNAL },
          ['Externe Seite']
        ),
        createElement(
          'option',
          { value: LINK_TARGET_TYPES.INTERNAL, selected: row.target === LINK_TARGET_TYPES.INTERNAL },
          ['In der App']
        ),
      ]
    );

    const remove = createElement(
      'button',
      {
        className: 'kb-link-remove',
        type: 'button',
        'aria-label': `Link ${index + 1} entfernen`,
        title: 'Link entfernen',
        onclick: () => {
          this.#linkRows.splice(index, 1);
          this.#renderLinkRows();
        },
      },
      [new Icon({ name: 'close', size: 14 }).element]
    );

    return createElement('div', { className: 'kb-link-row' }, [
      createElement('div', { className: 'kb-link-row-fields' }, [labelInput, urlInput, targetSelect, remove]),
      error,
    ]);
  }

  /**
   * Inline feedback only. The authoritative check is KnowledgeLink's constructor,
   * which this reuses rather than duplicating the protocol allowlist.
   */
  #validateLinkRow(row, urlInput, errorElement) {
    if (!row.url) {
      urlInput.classList.remove('input-error');
      errorElement.hidden = true;
      return true;
    }

    try {
      new KnowledgeLink({ label: row.label || 'Link', url: row.url, target: row.target });
      urlInput.classList.remove('input-error');
      errorElement.hidden = true;
      return true;
    } catch (error) {
      urlInput.classList.add('input-error');
      errorElement.textContent = this.#linkErrorMessage(row.target);
      errorElement.hidden = false;
      return false;
    }
  }

  #linkErrorMessage(target) {
    return target === LINK_TARGET_TYPES.INTERNAL
      ? 'Interne Links müssen mit # beginnen, z. B. #org'
      : 'Nur https, http, mailto und tel sind als Ziel erlaubt';
  }

  #createFreshnessSection() {
    this.#reviewedAtInput = new Input({
      id: 'kb-entry-reviewed-at',
      type: 'date',
      label: 'Zuletzt geprüft am',
      value: isoToDateInput(this.#entry?.freshness.lastReviewedAt || new Date().toISOString()),
    });

    this.#intervalInput = new Input({
      id: 'kb-entry-interval',
      type: 'number',
      label: 'Prüfintervall in Tagen',
      value: String(this.#entry?.freshness.reviewIntervalDays ?? DEFAULT_REVIEW_INTERVAL_DAYS),
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Aktualität']),
      this.#reviewedAtInput.element,
      this.#intervalInput.element,
      createElement('p', { className: 'editor-help-text' }, [
        'Nach Ablauf des Intervalls wird der Eintrag als prüfungsbedürftig markiert.',
      ]),
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
    let isValid = true;

    if (!this.#titleInput.value.trim()) {
      this.#titleInput.setError('Titel ist erforderlich');
      isValid = false;
    } else {
      this.#titleInput.setError(null);
    }

    if (!this.#categorySelect.value) {
      isValid = false;
    }

    const interval = Number(this.#intervalInput.value);
    if (!Number.isFinite(interval) || interval < 1) {
      this.#intervalInput.setError('Bitte eine Anzahl Tage ab 1 angeben');
      isValid = false;
    } else {
      this.#intervalInput.setError(null);
    }

    if (!this.#reviewedAtInput.value) {
      this.#reviewedAtInput.setError('Datum ist erforderlich');
      isValid = false;
    } else {
      this.#reviewedAtInput.setError(null);
    }

    const rows = [...this.#linkRowHost.children];
    this.#linkRows.forEach((row, index) => {
      const rowElement = rows[index];
      if (!rowElement) return;

      const urlInput = rowElement.querySelector('.kb-link-url');
      const errorElement = rowElement.querySelector('.kb-link-error');

      if (!row.url || !row.label) {
        urlInput.classList.add('input-error');
        errorElement.textContent = 'Bezeichnung und Ziel sind erforderlich';
        errorElement.hidden = false;
        isValid = false;
        return;
      }

      if (!this.#validateLinkRow(row, urlInput, errorElement)) {
        isValid = false;
      }
    });

    return isValid;
  }

  #handleSave() {
    if (!this.#validate()) {
      return;
    }

    this.#props.onSave?.({
      categoryType: this.#categorySelect.value,
      title: this.#titleInput.value.trim(),
      description: this.#descriptionField.value,
      partnerName: this.#partnerNameInput.value.trim(),
      partnerContact: this.#partnerContactInput.value.trim(),
      tags: this.#tagsInput.value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      links: this.#linkRows.map((row) => ({ ...row })),
      lastReviewedAt: dateInputToIso(this.#reviewedAtInput.value),
      reviewIntervalDays: Number(this.#intervalInput.value),
    });
  }

  focus() {
    this.#titleInput.focus();
  }

  get element() {
    return this.#element;
  }
}
