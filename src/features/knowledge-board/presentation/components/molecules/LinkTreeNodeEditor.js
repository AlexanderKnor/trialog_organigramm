/**
 * Molecule: LinkTreeNodeEditor
 * Create/edit form for one link tree node. A node may be a pure grouping
 * heading (no link) or a destination — leaving the target empty makes it the
 * former.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { KnowledgeLink } from '../../../domain/value-objects/KnowledgeLink.js';
import { LINK_TARGET_TYPES } from '../../../domain/value-objects/LinkTarget.js';

export class LinkTreeNodeEditor {
  #node;
  #props;
  #element;
  #labelInput;
  #urlInput;
  #targetSelect;
  #urlError;

  constructor(node, props = {}) {
    this.#node = node;
    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#element = this.#render();
  }

  get #isEditMode() {
    return this.#node !== null;
  }

  #render() {
    return createElement('div', { className: 'kb-editor' }, [
      this.#createNodeSection(),
      this.#createActionsBar(),
    ]);
  }

  #createNodeSection() {
    this.#labelInput = new Input({
      id: 'kb-node-label',
      label: 'Bezeichnung',
      placeholder: 'z. B. Maklerportal',
      value: this.#node?.label || '',
      required: true,
    });

    this.#urlInput = new Input({
      id: 'kb-node-url',
      label: 'Ziel',
      placeholder: 'https://… oder #org — leer lassen für eine reine Überschrift',
      value: this.#node?.link?.url || '',
      onChange: () => this.#validateUrl(),
    });

    this.#urlError = createElement('span', {
      className: 'input-error-message kb-link-error',
      hidden: true,
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Eintrag im Verlinkungsbaum']),
      this.#labelInput.element,
      this.#createTargetSelect(),
      this.#urlInput.element,
      this.#urlError,
      createElement('p', { className: 'editor-help-text' }, [
        'Ohne Ziel wird der Eintrag zu einer Überschrift, unter die weitere Einträge passen.',
      ]),
    ]);
  }

  #createTargetSelect() {
    const current = this.#node?.link?.target.toJSON() || LINK_TARGET_TYPES.EXTERNAL;

    this.#targetSelect = createElement(
      'select',
      {
        className: 'input-field',
        id: 'kb-node-target',
        onchange: () => this.#validateUrl(),
      },
      [
        createElement(
          'option',
          { value: LINK_TARGET_TYPES.EXTERNAL, selected: current === LINK_TARGET_TYPES.EXTERNAL },
          ['Externe Seite']
        ),
        createElement(
          'option',
          { value: LINK_TARGET_TYPES.INTERNAL, selected: current === LINK_TARGET_TYPES.INTERNAL },
          ['In der App']
        ),
      ]
    );

    return createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label', htmlFor: 'kb-node-target' }, ['Art']),
      this.#targetSelect,
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

  /** Inline feedback; KnowledgeLink's constructor stays the authority. */
  #validateUrl() {
    const url = this.#urlInput.value.trim();

    if (!url) {
      this.#urlError.hidden = true;
      return true;
    }

    try {
      new KnowledgeLink({
        label: this.#labelInput.value.trim() || 'Link',
        url,
        target: this.#targetSelect.value,
      });
      this.#urlError.hidden = true;
      return true;
    } catch {
      this.#urlError.textContent =
        this.#targetSelect.value === LINK_TARGET_TYPES.INTERNAL
          ? 'Interne Links müssen mit # beginnen, z. B. #org'
          : 'Nur https, http, mailto und tel sind als Ziel erlaubt';
      this.#urlError.hidden = false;
      return false;
    }
  }

  #validate() {
    if (!this.#labelInput.value.trim()) {
      this.#labelInput.setError('Bezeichnung ist erforderlich');
      return false;
    }

    this.#labelInput.setError(null);
    return this.#validateUrl();
  }

  #handleSave() {
    if (!this.#validate()) {
      return;
    }

    const label = this.#labelInput.value.trim();
    const url = this.#urlInput.value.trim();

    this.#props.onSave?.({
      label,
      link: url ? { label, url, target: this.#targetSelect.value } : null,
    });
  }

  focus() {
    this.#labelInput.focus();
  }

  get element() {
    return this.#element;
  }
}
