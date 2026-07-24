/**
 * Organism: PortalShell
 * The application frame every portal page lives in, modeled on the customer's
 * approved dashboard demo: a fixed dark sidebar with the area navigation, a
 * light sticky header carrying the page title, a live clock and the account
 * menu, and a content column underneath.
 *
 * Screens construct one shell per mount and append their content into
 * `contentElement`; the router replaces the whole shell on navigation, which
 * also resets transient state like the mobile drawer.
 */

import { createElement } from '../../core/utils/index.js';
import { Icon } from '../../features/hierarchy-tracking/presentation/components/atoms/Icon.js';
import { UserMenu } from './UserMenu.js';

const NAV_ITEMS = [
  { key: 'home', label: 'Übersicht', icon: 'grid', href: '#' },
  { key: 'org', label: 'Organigramm', icon: 'network', href: '#org' },
  { key: 'knowledge', label: 'Wissensdatenbank', icon: 'book', href: '#knowledge' },
  { key: 'videos', label: 'Lern-Videothek', icon: 'video', href: '#videos' },
  { key: 'promotion', label: 'Promotion', icon: 'star', href: '#promotion' },
];

const CLOCK_TICK_MS = 1000;

export class PortalShell {
  #element;
  #pageEl;
  #timeEl;
  #dateEl;
  #sidebarEl;
  #scrimEl;
  #userMenu;
  #clockTimer = null;

  /**
   * @param {object} options
   * @param {string} options.active - NAV_ITEMS key highlighted in the sidebar.
   * @param {string} options.title - Header headline (greeting or page title).
   * @param {string} options.subtitle - Header subline.
   * @param {{title: string}|null} [options.backBar] - Sub-page back bar with breadcrumb.
   */
  constructor({ active, title, subtitle, backBar = null }) {
    this.#element = this.#render({ active, title, subtitle, backBar });
    this.#startClock();
  }

  get element() {
    return this.#element;
  }

  /** Where screens append their page content. */
  get contentElement() {
    return this.#pageEl;
  }

  #render({ active, title, subtitle, backBar }) {
    this.#sidebarEl = this.#createSidebar(active);
    this.#scrimEl = createElement('div', {
      className: 'pshell-scrim',
      onclick: () => this.#closeSidebar(),
    });

    this.#pageEl = createElement('div', { className: 'pshell-page' });

    if (backBar) {
      this.#pageEl.appendChild(this.#createBackBar(backBar));
    }

    const main = createElement('div', { className: 'pshell-main' }, [
      this.#createHeader({ title, subtitle }),
      this.#pageEl,
    ]);

    return createElement('div', { className: 'pshell' }, [
      this.#sidebarEl,
      this.#scrimEl,
      main,
    ]);
  }

  // ========================================
  // SIDEBAR
  // ========================================

  #createSidebar(active) {
    const logo = createElement('div', { className: 'pshell-sidebar-logo' }, [
      createElement('span', { className: 'pshell-logo-mark', 'aria-hidden': 'true' }, ['T']),
      createElement('div', { className: 'pshell-logo-text' }, [
        createElement('span', { className: 'pshell-logo-name' }, ['Trialog Makler']),
        createElement('span', { className: 'pshell-logo-sub' }, ['Mitarbeiterportal']),
      ]),
    ]);

    const nav = createElement(
      'nav',
      { className: 'pshell-nav', 'aria-label': 'Portalbereiche' },
      [
        createElement('span', { className: 'pshell-nav-label' }, ['Navigation']),
        ...NAV_ITEMS.map((item) => this.#createNavItem(item, item.key === active)),
      ]
    );

    const footer = createElement('div', { className: 'pshell-sidebar-footer' }, [
      createElement('span', { className: 'pshell-sidebar-footnote' }, [
        'Trialog Makler Gruppe GmbH',
      ]),
    ]);

    return createElement('aside', { className: 'pshell-sidebar' }, [logo, nav, footer]);
  }

  #createNavItem(item, isActive) {
    return createElement(
      'a',
      {
        className: `pshell-nav-item ${isActive ? 'is-active' : ''}`.trim(),
        href: item.href,
        ...(isActive ? { 'aria-current': 'page' } : {}),
      },
      [
        createElement('span', { className: 'pshell-nav-icon', 'aria-hidden': 'true' }, [
          new Icon({ name: item.icon, size: 16 }).element,
        ]),
        createElement('span', { className: 'pshell-nav-text' }, [item.label]),
      ]
    );
  }

  #toggleSidebar() {
    const isOpen = this.#sidebarEl.classList.toggle('is-open');
    this.#scrimEl.classList.toggle('is-visible', isOpen);
  }

  #closeSidebar() {
    this.#sidebarEl.classList.remove('is-open');
    this.#scrimEl.classList.remove('is-visible');
  }

  // ========================================
  // HEADER
  // ========================================

  #createHeader({ title, subtitle }) {
    const menuButton = createElement(
      'button',
      {
        className: 'pshell-menu-btn',
        type: 'button',
        'aria-label': 'Navigation öffnen',
        onclick: () => this.#toggleSidebar(),
      },
      [new Icon({ name: 'menu', size: 18 }).element]
    );

    const text = createElement('div', { className: 'pshell-header-text' }, [
      createElement('h1', { className: 'pshell-header-title' }, [title]),
      createElement('p', { className: 'pshell-header-sub' }, [subtitle]),
    ]);

    this.#timeEl = createElement('span', { className: 'pshell-clock-time' });
    this.#dateEl = createElement('span', { className: 'pshell-clock-date' });

    const clock = createElement('div', { className: 'pshell-clock', 'aria-hidden': 'true' }, [
      this.#timeEl,
      this.#dateEl,
    ]);

    this.#userMenu = new UserMenu();

    return createElement('header', { className: 'pshell-header' }, [
      menuButton,
      text,
      clock,
      this.#userMenu.element,
    ]);
  }

  #startClock() {
    const tick = () => {
      const now = new Date();
      this.#timeEl.textContent = now.toLocaleTimeString('de-DE');
      this.#dateEl.textContent = now.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    tick();
    this.#clockTimer = setInterval(tick, CLOCK_TICK_MS);
  }

  // ========================================
  // BACK BAR (sub-pages)
  // ========================================

  /** No back button: the sidebar is the navigation. The crumb links home. */
  #createBackBar({ title }) {
    const crumb = createElement('p', { className: 'pshell-backbar-crumb' }, [
      createElement('a', { href: '#' }, ['Übersicht']),
      ' / ',
      createElement('span', {}, [title]),
    ]);

    return createElement('div', { className: 'pshell-backbar' }, [
      createElement('div', { className: 'pshell-backbar-text' }, [
        createElement('h2', { className: 'pshell-backbar-title' }, [title]),
        crumb,
      ]),
    ]);
  }

  destroy() {
    if (this.#clockTimer) {
      clearInterval(this.#clockTimer);
      this.#clockTimer = null;
    }

    this.#userMenu?.destroy();
    this.#element?.remove();
    this.#element = null;
  }
}
