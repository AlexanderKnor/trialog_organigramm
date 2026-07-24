/**
 * Molecule: CampaignEditor
 * Create/edit form for a campaign. Assembles a plain object and hands it to
 * onSave; it never talks to the service itself.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';

export class CampaignEditor {
  #campaign;
  #props;
  #element;
  #titleInput;
  #focusInput;
  #descriptionField;
  #startInput;
  #endInput;
  #ctaLabelInput;
  #ctaUrlInput;
  #errorHost;

  constructor(campaign, props = {}) {
    this.#campaign = campaign;
    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#element = this.#render();
  }

  #render() {
    return createElement('div', { className: 'kb-editor promo-editor' }, [
      this.#createContentSection(),
      this.#createScheduleSection(),
      this.#createCtaSection(),
      this.#createErrorHost(),
      this.#createActionsBar(),
    ]);
  }

  #createContentSection() {
    this.#titleInput = new Input({
      id: 'promo-campaign-title',
      label: 'Titel',
      placeholder: 'z. B. Sommeroffensive 2026',
      value: this.#campaign?.title || '',
      required: true,
    });

    this.#focusInput = new Input({
      id: 'promo-campaign-focus',
      label: 'Fokus',
      placeholder: 'z. B. BU-Versicherung & Altersvorsorge',
      value: this.#campaign?.focus || '',
    });

    this.#descriptionField = createElement('textarea', {
      className: 'input-field',
      id: 'promo-campaign-description',
      rows: 3,
      maxLength: 2000,
      placeholder: 'Worum geht es in der Kampagne? Zeilenumbrüche bleiben erhalten.',
    });
    this.#descriptionField.value = this.#campaign?.description || '';

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Kampagne']),
      this.#titleInput.element,
      this.#focusInput.element,
      createElement('div', { className: 'input-wrapper' }, [
        createElement('label', { className: 'input-label', for: 'promo-campaign-description' }, [
          'Beschreibung',
        ]),
        this.#descriptionField,
      ]),
    ]);
  }

  #createScheduleSection() {
    this.#startInput = new Input({
      id: 'promo-campaign-start',
      type: 'date',
      label: 'Beginn',
      value: this.#campaign?.startDate || '',
      required: true,
    });

    this.#endInput = new Input({
      id: 'promo-campaign-end',
      type: 'date',
      label: 'Ende',
      value: this.#campaign?.endDate || '',
      required: true,
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Laufzeit']),
      createElement('div', { className: 'promo-editor-row' }, [
        this.#startInput.element,
        this.#endInput.element,
      ]),
    ]);
  }

  #createCtaSection() {
    this.#ctaLabelInput = new Input({
      id: 'promo-campaign-cta-label',
      label: 'Button-Beschriftung (optional)',
      placeholder: 'z. B. Details ansehen',
      value: this.#campaign?.ctaLabel || '',
    });

    this.#ctaUrlInput = new Input({
      id: 'promo-campaign-cta-url',
      label: 'Button-Link (optional)',
      placeholder: 'https://…',
      value: this.#campaign?.ctaUrl || '',
    });

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Verlinkung']),
      this.#ctaLabelInput.element,
      this.#ctaUrlInput.element,
    ]);
  }

  #createErrorHost() {
    this.#errorHost = createElement('p', { className: 'portal-editor-error', role: 'alert', hidden: true });
    return this.#errorHost;
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
        label: this.#campaign ? 'Speichern' : 'Kampagne anlegen',
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
      focus: this.#focusInput.value.trim(),
      description: this.#descriptionField.value.trim(),
      startDate: this.#startInput.value,
      endDate: this.#endInput.value,
      ctaLabel: this.#ctaLabelInput.value.trim(),
      ctaUrl: this.#ctaUrlInput.value.trim(),
    });
  }

  focus() {
    this.#titleInput.focus?.();
  }

  get element() {
    return this.#element;
  }
}
