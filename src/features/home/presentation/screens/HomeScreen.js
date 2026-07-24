/**
 * Screen: HomeScreen
 * The dashboard everyone lands on after logging in, framed by the portal
 * shell: gradient shortcut cards into the four areas, with the live revenue
 * overview beneath because it is the daily-use surface. The overview IS the
 * revenue view; there is no separate revenue page duplicating it.
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { PortalShell } from '../../../../shared/presentation/PortalShell.js';
import { PortalTile } from '../components/molecules/PortalTile.js';
import { RevenueOverviewPanel } from '../components/organisms/RevenueOverviewPanel.js';

const PORTAL_AREAS = [
  {
    tone: 'slate',
    title: 'Organigramm',
    subtitle: 'Struktur, Teams und Hierarchie im Überblick',
    icon: 'network',
    href: '#org',
  },
  {
    tone: 'gold',
    title: 'Wissensdatenbank',
    subtitle: 'Leitfäden, Prozesse, Vorlagen und FAQs sofort zugänglich',
    icon: 'book',
    href: '#knowledge',
  },
  {
    tone: 'teal',
    title: 'Lern-Videothek',
    subtitle: 'Onboarding, Vertriebswissen und Produktschulungen als Videos',
    icon: 'video',
    href: '#videos',
  },
  {
    tone: 'purple',
    title: 'Promotion',
    subtitle: 'Marketing-Materialien, Kampagnen und Vorlagen',
    icon: 'star',
    href: '#promotion',
  },
];

export class HomeScreen {
  #container;
  #hierarchyService;
  #revenueService;
  #shell = null;
  #revenuePanel = null;

  constructor(container, hierarchyService, revenueService) {
    this.#container =
      typeof container === 'string' ? document.querySelector(container) : container;
    this.#hierarchyService = hierarchyService;
    this.#revenueService = revenueService;
  }

  async mount() {
    clearElement(this.#container);

    this.#revenuePanel = new RevenueOverviewPanel({
      revenueService: this.#revenueService,
      hierarchyService: this.#hierarchyService,
    });

    // One panel failing must not take the whole landing page down with it.
    try {
      await this.#revenuePanel.initialize();
      this.#revenuePanel.setActive(true);
    } catch (error) {
      Logger.error('Failed to initialize revenue overview:', error);
    }

    this.#shell = new PortalShell({
      active: 'home',
      title: `Willkommen zurück, ${this.#greetingName()}.`,
      subtitle: 'Ihr zentraler Zugang zu Wissen, Lernen und Vertrieb.',
    });

    this.#shell.contentElement.append(
      this.#createShortcutSection(),
      this.#createRevenueSection()
    );

    this.#container.appendChild(this.#shell.element);
  }

  #createShortcutSection() {
    const head = createElement('div', { className: 'portal-section-head' }, [
      createElement('h2', { className: 'portal-section-title' }, ['Schnellzugriffe']),
      createElement('span', { className: 'portal-section-hint' }, [
        'Direkter Zugriff auf alle Bereiche',
      ]),
    ]);

    const grid = createElement(
      'nav',
      { className: 'portal-shortcut-grid', 'aria-label': 'Bereiche des Portals' },
      PORTAL_AREAS.map((areaProps) => new PortalTile(areaProps).element)
    );

    return createElement('section', { className: 'portal-section' }, [head, grid]);
  }

  #createRevenueSection() {
    const head = createElement('div', { className: 'portal-section-head' }, [
      createElement('h2', { className: 'portal-section-title' }, ['Umsatz im Überblick']),
      createElement('span', { className: 'portal-section-hint' }, [
        'Monatliche Entwicklung und Kennzahlen',
      ]),
    ]);

    return createElement(
      'section',
      { className: 'portal-section', 'aria-label': 'Umsatz im Überblick' },
      [head, this.#revenuePanel.element]
    );
  }

  /** "alexander-knor" as a greeting reads like a login, not a welcome. */
  #greetingName() {
    const user = authService.getCurrentUser();

    if (user?.displayName) {
      return user.displayName;
    }

    const localPart = (user?.email || '').split('@')[0];

    if (!localPart) {
      return 'im Portal';
    }

    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  unmount() {
    this.#revenuePanel?.destroy();
    this.#shell?.destroy();
    this.#shell = null;
  }
}
