/**
 * Organism: IntranetShell
 * The persistent application frame in the Trialog intranet design: a fixed
 * dark sidebar with the workspace navigation, a light sticky topbar with the
 * (upcoming) global search and the account menu, and the content column.
 *
 * Unlike PortalShell (one shell per screen mount), main.js mounts this shell
 * ONCE after login; the router only swaps the screen inside `contentElement`
 * and updates the frame via `setPage()`. Legacy full-screen views run in
 * flush mode (no content padding, no page head) because they bring their own
 * page chrome.
 */

import { createElement, clearElement } from '../../core/utils/index.js';
import { authService } from '../../core/auth/index.js';
import { Icon } from '../../features/hierarchy-tracking/presentation/components/atoms/Icon.js';
import { UserMenu } from './UserMenu.js';

const NAV_SECTIONS = [
  {
    label: 'Arbeitsplatz',
    items: [
      { key: 'home', label: 'Übersicht', icon: 'home', href: '#' },
      { key: 'org', label: 'Organigramm', icon: 'network', href: '#org' },
      { key: 'knowledge', label: 'Trialog Wiki', icon: 'book', href: '#knowledge' },
      { key: 'videos', label: 'Akademie', icon: 'video', href: '#videos' },
      { key: 'promotion', label: 'Promotion', icon: 'star', href: '#promotion' },
    ],
  },
  {
    label: 'Verwaltung',
    adminOnly: true,
    items: [{ key: 'catalog', label: 'Produktkatalog', icon: 'grid', href: '#catalog' }],
  },
  {
    label: 'Persönlich',
    items: [{ key: 'profile', label: 'Mein Profil', icon: 'user', href: '#profile' }],
  },
];

const ROLE_LABELS = {
  admin: 'Administrator',
  employee: 'Mitarbeiter',
};

export class IntranetShell {
  #element;
  #contentEl;
  #pageEl;
  #pageHeadEl;
  #sidebarEl;
  #overlayEl;
  #userMenu;
  #navItems = new Map();

  constructor() {
    this.#element = this.#render();
  }

  get element() {
    return this.#element;
  }

  /** Where the router mounts the active screen. */
  get contentElement() {
    return this.#pageEl;
  }

  /**
   * Update the frame for the current route.
   * @param {object} options
   * @param {string} options.active - NAV key to highlight (or '' for none).
   * @param {boolean} [options.flush] - Full-bleed mode for legacy full-screen views.
   * @param {string|null} [options.eyebrow] - Small uppercase line above the title.
   * @param {string|null} [options.title] - Page headline; omit to hide the head.
   * @param {string|null} [options.subtitle] - Subline under the title.
   */
  setPage({ active, flush = false, eyebrow = null, title = null, subtitle = null }) {
    for (const [key, item] of this.#navItems) {
      item.classList.toggle('active', key === active);

      if (key === active) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    }

    this.#contentEl.classList.toggle('in-content--flush', flush);

    clearElement(this.#pageHeadEl);
    this.#pageHeadEl.style.display = title ? '' : 'none';

    if (title) {
      if (eyebrow) {
        this.#pageHeadEl.appendChild(
          createElement('div', { className: 'in-eyebrow' }, [eyebrow])
        );
      }

      this.#pageHeadEl.appendChild(createElement('h1', {}, [title]));

      if (subtitle) {
        this.#pageHeadEl.appendChild(createElement('p', {}, [subtitle]));
      }
    }

    this.#closeSidebar();
    this.#element.querySelector('.in-main')?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  }

  #render() {
    this.#sidebarEl = this.#createSidebar();

    this.#overlayEl = createElement('div', {
      className: 'in-overlay',
      onclick: () => this.#closeSidebar(),
    });

    this.#pageHeadEl = createElement('div', { className: 'in-page-head' });
    this.#pageEl = createElement('div', { className: 'in-page' });

    this.#contentEl = createElement('main', { className: 'in-content in-scroll' }, [
      this.#pageHeadEl,
      this.#pageEl,
    ]);

    const main = createElement('div', { className: 'in-main' }, [
      this.#createTopbar(),
      this.#contentEl,
    ]);

    return createElement('div', { className: 'in-app' }, [
      this.#overlayEl,
      this.#sidebarEl,
      main,
    ]);
  }

  // ========================================
  // SIDEBAR
  // ========================================

  #createSidebar() {
    const isAdmin = authService.isAdmin();

    const brand = createElement('div', { className: 'in-brand' }, [
      createElement('div', { className: 'in-brand-mark' }, ['TRIALOG']),
      createElement('div', { className: 'in-brand-sub' }, ['Intranet']),
    ]);

    const navChildren = [];

    for (const section of NAV_SECTIONS) {
      if (section.adminOnly && !isAdmin) {
        continue;
      }

      navChildren.push(
        createElement('span', { className: 'in-nav-label' }, [section.label])
      );

      for (const item of section.items) {
        navChildren.push(this.#createNavItem(item));
      }
    }

    const nav = createElement(
      'nav',
      { className: 'in-nav in-scroll', 'aria-label': 'Intranet-Navigation' },
      navChildren
    );

    return createElement('aside', { className: 'in-sidebar in-scroll' }, [
      brand,
      nav,
      this.#createSidebarFooter(),
    ]);
  }

  #createNavItem(item) {
    const element = createElement(
      'a',
      {
        className: 'in-nav-item',
        href: item.href,
        onclick: () => this.#closeSidebar(),
      },
      [new Icon({ name: item.icon, size: 20 }).element, item.label]
    );

    this.#navItems.set(item.key, element);
    return element;
  }

  #createSidebarFooter() {
    const user = authService.getCurrentUser();
    const displayName = user?.displayName || (user?.email || 'User').split('@')[0];
    const roleLabel = ROLE_LABELS[user?.role] || 'Mitarbeiter';

    const userButton = createElement(
      'button',
      {
        className: 'in-side-user',
        type: 'button',
        onclick: () => {
          this.#closeSidebar();
          window.navigateToProfile();
        },
      },
      [
        createElement('span', { className: 'in-av', 'aria-hidden': 'true' }, [
          this.#initials(displayName),
        ]),
        createElement('span', {}, [
          createElement('span', { className: 'in-user-name' }, [displayName]),
          createElement('br'),
          createElement('span', { className: 'in-user-role' }, [roleLabel]),
        ]),
      ]
    );

    return createElement('div', { className: 'in-side-foot' }, [userButton]);
  }

  #initials(name) {
    return name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  #toggleSidebar() {
    const isOpen = this.#sidebarEl.classList.toggle('open');
    this.#overlayEl.classList.toggle('show', isOpen);
  }

  #closeSidebar() {
    this.#sidebarEl.classList.remove('open');
    this.#overlayEl.classList.remove('show');
  }

  // ========================================
  // TOPBAR
  // ========================================

  #createTopbar() {
    const hamburger = createElement(
      'button',
      {
        className: 'in-hamburger',
        type: 'button',
        'aria-label': 'Menü öffnen',
        onclick: () => this.#toggleSidebar(),
      },
      [new Icon({ name: 'menu', size: 22 }).element]
    );

    // Global search ships in a later phase; the field anchors the layout.
    const search = createElement('div', { className: 'in-search' }, [
      new Icon({ name: 'search', size: 18 }).element,
      createElement('input', {
        placeholder: 'Suche – bald verfügbar',
        'aria-label': 'Intranet durchsuchen',
        disabled: true,
      }),
    ]);

    this.#userMenu = new UserMenu();

    const actions = createElement('div', { className: 'in-top-actions' }, [
      this.#userMenu.element,
    ]);

    return createElement('header', { className: 'in-topbar' }, [
      hamburger,
      search,
      actions,
    ]);
  }

  destroy() {
    this.#userMenu?.destroy();
    this.#navItems.clear();
    this.#element?.remove();
    this.#element = null;
  }
}
