/**
 * Molecule: KnowledgeSearchField
 * Search box for the board. Visually and behaviourally aligned with OrgSearch:
 * the wrapper takes :focus-within rather than the input taking :focus, so the
 * whole glass panel reacts.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';

/** Long enough to skip most intermediate keystrokes, short enough to feel live. */
const INPUT_DEBOUNCE_MS = 150;

export class KnowledgeSearchField {
  #props;
  #element;
  #input;
  #clearButton;
  #timer = null;

  constructor(props = {}) {
    this.#props = {
      onSearch: props.onSearch || null,
      placeholder: props.placeholder || 'Knowledgeboard durchsuchen',
    };

    this.#element = this.#render();
  }

  #render() {
    this.#input = createElement('input', {
      className: 'kb-search-input',
      type: 'search',
      placeholder: this.#props.placeholder,
      'aria-label': this.#props.placeholder,
      oninput: () => this.#handleInput(),
    });

    this.#clearButton = createElement(
      'button',
      {
        className: 'kb-search-clear',
        type: 'button',
        'aria-label': 'Suche zurücksetzen',
        hidden: true,
        onclick: () => this.clear(),
      },
      [new Icon({ name: 'close', size: 14 }).element]
    );

    return createElement('div', { className: 'kb-search', role: 'search' }, [
      createElement('span', { className: 'kb-search-icon' }, [
        new Icon({ name: 'search', size: 16 }).element,
      ]),
      this.#input,
      this.#clearButton,
    ]);
  }

  #handleInput() {
    this.#clearButton.hidden = this.#input.value.length === 0;

    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#props.onSearch?.(this.#input.value.trim());
    }, INPUT_DEBOUNCE_MS);
  }

  clear() {
    this.#input.value = '';
    this.#clearButton.hidden = true;
    clearTimeout(this.#timer);
    this.#props.onSearch?.('');
    this.#input.focus();
  }

  get value() {
    return this.#input.value.trim();
  }

  get element() {
    return this.#element;
  }

  destroy() {
    clearTimeout(this.#timer);
  }
}
