/**
 * Molecule: VideoEditor
 * Create/edit form for a learning video. Assembles a plain object and hands it
 * to onSave; it never talks to the service itself.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getAllVideoCategories } from '../../../domain/value-objects/VideoCategory.js';
import { VideoSource } from '../../../domain/value-objects/VideoSource.js';

export class VideoEditor {
  #video;
  #props;
  #element;
  #titleInput;
  #urlInput;
  #urlHint;
  #categorySelect;
  #errorHost;

  constructor(video, props = {}) {
    this.#video = video;
    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
    };

    this.#element = this.#render();
  }

  #render() {
    return createElement('div', { className: 'kb-editor vlib-editor' }, [
      this.#createSourceSection(),
      this.#createDetailsSection(),
      this.#createErrorHost(),
      this.#createActionsBar(),
    ]);
  }

  #createSourceSection() {
    this.#urlHint = createElement('p', { className: 'vlib-editor-hint' }, ['']);

    this.#urlInput = new Input({
      id: 'vlib-video-url',
      label: 'Video-Link (Loom, YouTube oder Vimeo)',
      placeholder: 'https://www.loom.com/share/…',
      value: this.#video?.source.shareUrl || '',
      required: true,
      onChange: (value) => this.#updateUrlHint(value),
    });

    this.#updateUrlHint(this.#video?.source.shareUrl || '');

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Aufnahme']),
      this.#urlInput.element,
      this.#urlHint,
    ]);
  }

  #updateUrlHint(value) {
    const url = (value || '').trim();

    if (!url) {
      this.#urlHint.textContent = 'Link zur Loom-Aufnahme einfügen – er wird direkt im Portal abgespielt.';
      this.#urlHint.className = 'vlib-editor-hint';
      return;
    }

    if (VideoSource.isValid(url)) {
      const source = new VideoSource(url);
      const providerLabels = { loom: 'Loom', youtube: 'YouTube', vimeo: 'Vimeo' };
      this.#urlHint.textContent = `✓ ${providerLabels[source.provider]}-Video erkannt`;
      this.#urlHint.className = 'vlib-editor-hint vlib-editor-hint--ok';
    } else {
      this.#urlHint.textContent = 'Link noch nicht erkannt. Unterstützt: Loom, YouTube, Vimeo.';
      this.#urlHint.className = 'vlib-editor-hint vlib-editor-hint--warn';
    }
  }

  #createDetailsSection() {
    this.#titleInput = new Input({
      id: 'vlib-video-title',
      label: 'Titel',
      placeholder: 'z. B. Einwandbehandlung: Die 10 häufigsten Kundenreaktionen',
      value: this.#video?.title || '',
      required: true,
    });

    const currentCategory = this.#video?.categoryType || getAllVideoCategories()[0].type;

    this.#categorySelect = createElement(
      'select',
      { className: 'input-field', id: 'vlib-video-category' },
      getAllVideoCategories().map((category) =>
        createElement(
          'option',
          { value: category.type, selected: category.type === currentCategory },
          [category.label]
        )
      )
    );

    return createElement('div', { className: 'editor-section-group' }, [
      createElement('h4', { className: 'editor-section-title' }, ['Einordnung']),
      this.#titleInput.element,
      createElement('div', { className: 'input-wrapper' }, [
        createElement('label', { className: 'input-label', for: 'vlib-video-category' }, [
          'Kategorie',
        ]),
        this.#categorySelect,
      ]),
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
    return createElement('div', { className: 'editor-actions-bar vlib-editor-actions' }, [
      new Button({
        label: 'Abbrechen',
        variant: 'ghost',
        onClick: () => this.#props.onCancel?.(),
      }).element,
      new Button({
        label: this.#video ? 'Speichern' : 'Video hinzufügen',
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
      shareUrl: this.#urlInput.value.trim(),
      categoryType: this.#categorySelect.value,
    });
  }

  focus() {
    this.#urlInput.focus?.();
  }

  get element() {
    return this.#element;
  }
}
