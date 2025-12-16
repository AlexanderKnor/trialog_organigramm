/**
 * Organism: Toolbar
 * Main toolbar with actions and controls
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';

export class Toolbar {
  #element;
  #props;

  constructor(props = {}) {
    this.#props = {
      onAddNode: props.onAddNode || null,
      onExpandAll: props.onExpandAll || null,
      onCollapseAll: props.onCollapseAll || null,
      onZoomIn: props.onZoomIn || null,
      onZoomOut: props.onZoomOut || null,
      onResetZoom: props.onResetZoom || null,
      onExport: props.onExport || null,
      onImport: props.onImport || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    const zoomInButton = new Button({
      variant: 'ghost',
      icon: new Icon({ name: 'zoomIn', size: 16 }),
      title: 'Vergrößern',
      onClick: this.#props.onZoomIn,
    });

    const zoomOutButton = new Button({
      variant: 'ghost',
      icon: new Icon({ name: 'zoomOut', size: 16 }),
      title: 'Verkleinern',
      onClick: this.#props.onZoomOut,
    });

    const rightGroup = createElement('div', { className: 'toolbar-group' }, [
      zoomOutButton.element,
      zoomInButton.element,
    ]);

    return createElement('div', {
      className: `toolbar ${this.#props.className}`,
    }, [rightGroup]);
  }

  get element() {
    return this.#element;
  }
}
