/**
 * Molecule: PortalTile
 * One shortcut card on the dashboard, following the customer demo: a vertical
 * gradient card with icon tile, title, description and a trailing arrow. The
 * gradient tone is the area's identity color.
 *
 * A real anchor rather than a button with an onclick: every area is a genuine
 * hash route, so this gets middle-click, open-in-new-tab, Enter and the right
 * screen-reader semantics for free.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';

export class PortalTile {
  #element;

  constructor({ title, subtitle, href, icon, tone }) {
    this.#element = this.#render({ title, subtitle, href, icon, tone });
  }

  #render({ title, subtitle, href, icon, tone }) {
    return createElement(
      'a',
      { className: `portal-shortcut portal-shortcut--${tone}`, href },
      [
        createElement('span', { className: 'portal-shortcut-icon', 'aria-hidden': 'true' }, [
          new Icon({ name: icon, size: 20 }).element,
        ]),
        createElement('h3', { className: 'portal-shortcut-title' }, [title]),
        createElement('p', { className: 'portal-shortcut-sub' }, [subtitle]),
        createElement('span', { className: 'portal-shortcut-arrow', 'aria-hidden': 'true' }, [
          new Icon({ name: 'arrowRight', size: 16 }).element,
        ]),
      ]
    );
  }

  get element() {
    return this.#element;
  }
}
