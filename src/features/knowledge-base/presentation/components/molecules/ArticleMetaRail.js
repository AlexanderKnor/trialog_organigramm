/**
 * Molecule: ArticleMetaRail
 * The composer's side rail: everything about an article that is not the article
 * itself — shelf, tags, cover, weight. Kept out of the document column so the
 * writing surface stays a page and not a form.
 *
 * Mutates the composer's state object in place and only reports that something
 * changed; the composer owns the state and the save.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { getAllArticleCategories } from '../../../domain/value-objects/ArticleCategory.js';

export class ArticleMetaRail {
  #state;
  #onChange;
  #element;
  #countHost;

  constructor(state, { onChange = null } = {}) {
    this.#state = state;
    this.#onChange = onChange;
    this.#countHost = createElement('span', { className: 'kbcomp-rail-count' });
    this.#element = this.#render();
  }

  #render() {
    return createElement('aside', { className: 'kbcomp-rail' }, [
      this.#createGroup('Einordnung', [this.#createCategoryField(), this.#createTagsField()]),
      this.#createGroup('Titelbild', this.#createHeroFields()),
      this.#createGroup('Sichtbarkeit', [this.#createPinnedField()]),
      createElement('div', { className: 'kbcomp-rail-foot' }, [this.#countHost]),
    ]);
  }

  #createGroup(title, fields) {
    return createElement('section', { className: 'kbcomp-rail-group' }, [
      createElement('h3', { className: 'kbcomp-rail-title' }, [title]),
      ...fields,
    ]);
  }

  #createLabelled(label, ...fields) {
    return createElement('label', { className: 'kbcomp-labelled' }, [
      createElement('span', { className: 'kbcomp-field-label' }, [label]),
      ...fields,
    ]);
  }

  #createCategoryField() {
    const select = createElement(
      'select',
      {
        className: 'kbcomp-field',
        onchange: (event) => {
          this.#state.categoryType = event.target.value;
          this.#onChange?.();
        },
      },
      getAllArticleCategories().map((category) =>
        createElement(
          'option',
          { value: category.type, selected: category.type === this.#state.categoryType },
          [category.label]
        )
      )
    );

    return this.#createLabelled('Kategorie', select);
  }

  #createTagsField() {
    const input = createElement('input', {
      className: 'kbcomp-field',
      type: 'text',
      placeholder: 'kv, antrag, storno',
      value: this.#state.tags,
      oninput: (event) => {
        this.#state.tags = event.target.value;
        this.#onChange?.();
      },
    });

    return this.#createLabelled(
      'Schlagwörter',
      input,
      createElement('span', { className: 'kbcomp-field-hint' }, ['Mit Komma trennen.'])
    );
  }

  #createHeroFields() {
    const preview = createElement('img', { className: 'kbcomp-preview-image', alt: '', hidden: true });

    const update = (url) => {
      const trimmed = (url || '').trim();

      if (!trimmed) {
        preview.hidden = true;
        return;
      }

      preview.onerror = () => {
        preview.hidden = true;
      };
      preview.onload = () => {
        preview.hidden = false;
      };
      preview.src = trimmed;
    };

    const input = createElement('input', {
      className: 'kbcomp-field',
      type: 'url',
      placeholder: 'https://…',
      value: this.#state.heroImageUrl,
      oninput: (event) => {
        this.#state.heroImageUrl = event.target.value;
        update(event.target.value);
        this.#onChange?.();
      },
    });

    update(this.#state.heroImageUrl);

    return [this.#createLabelled('Adresse (optional)', input), preview];
  }

  #createPinnedField() {
    const checkbox = createElement('input', {
      type: 'checkbox',
      className: 'kbcomp-checkbox',
      checked: this.#state.pinned,
      onchange: (event) => {
        this.#state.pinned = event.target.checked;
        this.#onChange?.();
      },
    });

    return createElement('label', { className: 'kbcomp-checkline' }, [
      checkbox,
      createElement('span', {}, ['Als wichtig markieren, erscheint zuerst']),
    ]);
  }

  setBlockCount(used, max) {
    this.#countHost.textContent = `${used} von ${max} Blöcken`;
  }

  get element() {
    return this.#element;
  }
}
