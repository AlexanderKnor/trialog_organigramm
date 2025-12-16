/**
 * Atom: Input
 * Base input component
 */

import { createElement } from '../../../../../core/utils/index.js';

export class Input {
  #element;
  #inputElement;
  #props;

  constructor(props = {}) {
    this.#props = {
      type: props.type || 'text',
      placeholder: props.placeholder || '',
      value: props.value || '',
      disabled: props.disabled || false,
      required: props.required || false,
      label: props.label || null,
      error: props.error || null,
      onChange: props.onChange || null,
      onBlur: props.onBlur || null,
      onFocus: props.onFocus || null,
      className: props.className || '',
      id: props.id || `input-${Date.now()}`,
    };

    this.#element = this.#render();
  }

  #render() {
    const children = [];

    if (this.#props.label) {
      children.push(
        createElement('label', {
          className: 'input-label',
          htmlFor: this.#props.id,
        }, [this.#props.label]),
      );
    }

    const inputAttrs = {
      type: this.#props.type,
      id: this.#props.id,
      className: `input-field ${this.#props.error ? 'input-error' : ''}`,
      placeholder: this.#props.placeholder,
      value: this.#props.value,
      onInput: (e) => {
        this.#props.value = e.target.value;
        if (this.#props.onChange) {
          this.#props.onChange(e.target.value, e);
        }
      },
    };

    // Only add disabled/required when truthy (presence of attr always activates)
    if (this.#props.disabled) {
      inputAttrs.disabled = true;
    }
    if (this.#props.required) {
      inputAttrs.required = true;
    }
    if (typeof this.#props.onBlur === 'function') {
      inputAttrs.onBlur = this.#props.onBlur;
    }
    if (typeof this.#props.onFocus === 'function') {
      inputAttrs.onFocus = this.#props.onFocus;
    }

    this.#inputElement = createElement('input', inputAttrs);

    children.push(this.#inputElement);

    if (this.#props.error) {
      children.push(
        createElement('span', { className: 'input-error-message' }, [
          this.#props.error,
        ]),
      );
    }

    return createElement('div', {
      className: `input-wrapper ${this.#props.className}`,
    }, children);
  }

  get element() {
    return this.#element;
  }

  get value() {
    return this.#inputElement.value;
  }

  set value(val) {
    this.#inputElement.value = val;
    this.#props.value = val;
  }

  focus() {
    this.#inputElement.focus();
  }

  blur() {
    this.#inputElement.blur();
  }

  setDisabled(disabled) {
    this.#inputElement.disabled = disabled;
    this.#props.disabled = disabled;
  }

  setError(error) {
    this.#props.error = error;
    const errorSpan = this.#element.querySelector('.input-error-message');

    if (error) {
      this.#inputElement.classList.add('input-error');
      if (errorSpan) {
        errorSpan.textContent = error;
      } else {
        this.#element.appendChild(
          createElement('span', { className: 'input-error-message' }, [error]),
        );
      }
    } else {
      this.#inputElement.classList.remove('input-error');
      if (errorSpan) {
        errorSpan.remove();
      }
    }
  }

  clear() {
    this.value = '';
  }

  setValue(val) {
    this.value = val;
  }
}
