/**
 * Molecule: ResourceEditor
 * Create/edit form for a promo resource (a linked marketing asset).
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getAllResourceKinds } from '../../../domain/value-objects/ResourceKind.js';

export class ResourceEditor {
  #resource;
  #props;
  #element;
  #titleInput;
  #kindSelect;
  #urlInput;
  #descriptionField;
  #errorHost;

  constructor(resource, props = {}) {
    this.#resource = resource;
    this.#props = {
      defaultKindType: props.defaultKindType || null,
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#element = this.#render();
  }

  #render() {
    const current =
      this.#resource?.kindType || this.#props.defaultKindType || getAllResourceKinds()[0].type;

    this.#titleInput = new Input({
      id: 'promo-resource-title',
      label: 'Titel',
      placeholder: 'z. B. LinkedIn-Kit Sommeroffensive',
      value: this.#resource?.title || '',
      required: true,
    });

    this.#kindSelect = createElement(
      'select',
      { className: 'input-field', id: 'promo-resource-kind' },
      getAllResourceKinds().map((kind) =>
        createElement('option', { value: kind.type, selected: kind.type === current }, [
          kind.label,
        ])
      )
    );

    this.#urlInput = new Input({
      id: 'promo-resource-url',
      label: 'Link',
      placeholder: 'https://… (Ablage, Dokument oder Veranstaltungsseite)',
      value: this.#resource?.url || '',
      required: true,
    });

    this.#descriptionField = createElement('textarea', {
      className: 'input-field',
      id: 'promo-resource-description',
      rows: 2,
      maxLength: 500,
      placeholder: 'Was finden Mitarbeitende hinter dem Link?',
    });
    this.#descriptionField.value = this.#resource?.description || '';

    this.#errorHost = createElement('p', { className: 'portal-editor-error', role: 'alert', hidden: true });

    return createElement('div', { className: 'kb-editor promo-editor' }, [
      createElement('div', { className: 'editor-section-group' }, [
        createElement('h4', { className: 'editor-section-title' }, ['Material']),
        this.#titleInput.element,
        createElement('div', { className: 'input-wrapper' }, [
          createElement('label', { className: 'input-label', for: 'promo-resource-kind' }, [
            'Bereich',
          ]),
          this.#kindSelect,
        ]),
        this.#urlInput.element,
        createElement('div', { className: 'input-wrapper' }, [
          createElement('label', { className: 'input-label', for: 'promo-resource-description' }, [
            'Beschreibung',
          ]),
          this.#descriptionField,
        ]),
      ]),
      this.#errorHost,
      this.#createActionsBar(),
    ]);
  }

  showError(message) {
    this.#errorHost.textContent = message;
    this.#errorHost.hidden = false;
  }

  #createActionsBar() {
    return createElement('div', { className: 'editor-actions-bar promo-editor-actions' }, [
      new Button({
        label: 'Abbrechen',
        variant: 'ghost',
        onClick: () => this.#props.onCancel?.(),
      }).element,
      new Button({
        label: this.#resource ? 'Speichern' : 'Material hinzufügen',
        variant: 'primary',
        icon: new Icon({ name: 'check', size: 15 }).element,
        onClick: () => this.#handleSave(),
      }).element,
    ]);
  }

  #handleSave() {
    this.#errorHost.hidden = true;

    this.#props.onSave?.({
      title: this.#titleInput.value,
      kindType: this.#kindSelect.value,
      url: this.#urlInput.value.trim(),
      description: this.#descriptionField.value.trim(),
    });
  }

  focus() {
    this.#titleInput.focus?.();
  }

  get element() {
    return this.#element;
  }
}
