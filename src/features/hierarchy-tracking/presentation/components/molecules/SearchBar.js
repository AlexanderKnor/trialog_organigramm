/**
 * Molecule: SearchBar
 * Search input with clear button
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Input } from '../atoms/Input.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';

export class SearchBar {
  #element;
  #input;
  #props;

  constructor(props = {}) {
    this.#props = {
      placeholder: props.placeholder || 'Suchen...',
      value: props.value || '',
      onSearch: props.onSearch || null,
      onClear: props.onClear || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    const searchIcon = new Icon({ name: 'search', size: 18, className: 'search-icon' });

    this.#input = new Input({
      type: 'search',
      placeholder: this.#props.placeholder,
      value: this.#props.value,
      onChange: (value) => {
        if (this.#props.onSearch) {
          this.#props.onSearch(value);
        }
      },
      className: 'search-input',
    });

    const clearButton = new Button({
      variant: 'ghost',
      size: 'sm',
      icon: new Icon({ name: 'close', size: 16 }),
      title: 'Suche löschen',
      onClick: () => {
        this.#input.clear();
        if (this.#props.onClear) {
          this.#props.onClear();
        }
      },
      className: 'search-clear-btn',
    });

    return createElement('div', {
      className: `search-bar ${this.#props.className}`,
    }, [
      searchIcon.element,
      this.#input.element,
      clearButton.element,
    ]);
  }

  get element() {
    return this.#element;
  }

  get value() {
    return this.#input.value;
  }

  set value(val) {
    this.#input.value = val;
  }

  focus() {
    this.#input.focus();
  }

  clear() {
    this.#input.clear();
  }
}
