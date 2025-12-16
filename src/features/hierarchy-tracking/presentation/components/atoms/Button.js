/**
 * Atom: Button
 * Base button component with icon support
 */

import { createElement } from '../../../../../core/utils/index.js';

export class Button {
  #element;
  #props;

  constructor(props = {}) {
    this.#props = {
      label: props.label || '',
      variant: props.variant || 'primary',
      size: props.size || 'md',
      disabled: props.disabled || false,
      icon: props.icon || null,
      iconPosition: props.iconPosition || 'left',
      onClick: props.onClick || null,
      className: props.className || '',
      type: props.type || 'button',
      title: props.title || '',
      ariaLabel: props.ariaLabel || '',
    };

    this.#element = this.#render();
  }

  #getVariantClasses() {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      success: 'btn-success',
    };
    return variants[this.#props.variant] || variants.primary;
  }

  #getSizeClasses() {
    const sizes = {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      xl: 'btn-xl',
    };
    return sizes[this.#props.size] || sizes.md;
  }

  #render() {
    const hasIconOnly = this.#props.icon && !this.#props.label;

    const classes = [
      'btn',
      this.#getVariantClasses(),
      this.#getSizeClasses(),
      hasIconOnly ? 'btn-icon-only' : '',
      this.#props.className,
    ]
      .filter(Boolean)
      .join(' ');

    const children = [];

    // Handle icon - can be an Element or a class with .element property
    const iconElement = this.#props.icon?.element || this.#props.icon;

    if (iconElement && iconElement instanceof Node) {
      const iconWrapper = createElement('span', { className: 'btn-icon-wrapper' });
      iconWrapper.appendChild(iconElement.cloneNode(true));

      if (this.#props.iconPosition === 'left' || !this.#props.label) {
        children.push(iconWrapper);
      }
    }

    if (this.#props.label) {
      children.push(
        createElement('span', { className: 'btn-label' }, [this.#props.label]),
      );
    }

    // Add icon on the right if specified
    if (iconElement && iconElement instanceof Node && this.#props.iconPosition === 'right' && this.#props.label) {
      const iconWrapper = createElement('span', { className: 'btn-icon-wrapper' });
      iconWrapper.appendChild(iconElement.cloneNode(true));
      children.push(iconWrapper);
    }

    const attributes = {
      type: this.#props.type,
      className: classes,
    };

    // Only add disabled attribute when truthy (presence of disabled attr always disables)
    if (this.#props.disabled) {
      attributes.disabled = true;
    }

    // Only add onClick if it's a function
    if (typeof this.#props.onClick === 'function') {
      attributes.onClick = this.#props.onClick;
    }

    if (this.#props.title) {
      attributes.title = this.#props.title;
    }

    if (this.#props.ariaLabel || hasIconOnly) {
      attributes['aria-label'] = this.#props.ariaLabel || this.#props.title || this.#props.label;
    }

    return createElement('button', attributes, children);
  }

  get element() {
    return this.#element;
  }

  setDisabled(disabled) {
    this.#element.disabled = disabled;
    this.#props.disabled = disabled;
  }

  setLabel(label) {
    this.#props.label = label;
    const labelSpan = this.#element.querySelector('.btn-label');
    if (labelSpan) {
      labelSpan.textContent = label;
    }
  }

  setLoading(isLoading) {
    this.#element.classList.toggle('btn-loading', isLoading);
    this.#element.disabled = isLoading || this.#props.disabled;
  }
}
