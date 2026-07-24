/**
 * Screen: HomeScreen
 * The dashboard everyone lands on after logging in, rendered inside the
 * persistent IntranetShell (the shell owns sidebar, topbar and page head):
 * quick-access cards into the areas, with the live revenue overview beneath
 * because it is the daily-use surface. The overview IS the revenue view;
 * there is no separate revenue page duplicating it.
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { Icon } from '../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { RevenueOverviewPanel } from '../components/organisms/RevenueOverviewPanel.js';

const QUICK_ACCESS = [
  {
    tone: 'blue',
    icon: 'network',
    title: 'Organigramm',
    description: 'Struktur, Teams und Hierarchie',
    href: '#org',
  },
  {
    tone: 'gold',
    icon: 'book',
    title: 'Trialog Wiki',
    description: 'Leitfäden, Prozesse und FAQs',
    href: '#knowledge',
  },
  {
    tone: 'purple',
    icon: 'video',
    title: 'Akademie',
    description: 'Lernvideos und Schulungen',
    href: '#videos',
  },
  {
    tone: 'teal',
    icon: 'star',
    title: 'Promotion',
    description: 'Kampagnen und Materialien',
    href: '#promotion',
  },
  {
    tone: 'green',
    icon: 'grid',
    title: 'Produktkatalog',
    description: 'Produkte und Anbieter verwalten',
    href: '#catalog',
    adminOnly: true,
  },
];

export class HomeScreen {
  #container;
  #hierarchyService;
  #revenueService;
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

    this.#container.append(
      this.#createQuickAccessSection(),
      this.#createRevenueSection()
    );
  }

  #createQuickAccessSection() {
    const isAdmin = authService.isAdmin();

    const cards = QUICK_ACCESS.filter((area) => !area.adminOnly || isAdmin).map(
      (area) => this.#createQuickAccessCard(area)
    );

    return createElement('section', { className: 'in-sec' }, [
      createElement('div', { className: 'in-sec-head' }, [
        createElement('h2', {}, ['Schnellzugriffe']),
        createElement('span', { className: 'in-sec-hint' }, [
          'Direkter Zugriff auf alle Bereiche',
        ]),
      ]),
      createElement(
        'nav',
        { className: 'in-qa-grid', 'aria-label': 'Bereiche des Intranets' },
        cards
      ),
    ]);
  }

  #createQuickAccessCard({ tone, icon, title, description, href }) {
    return createElement('a', { className: 'in-qa', href }, [
      createElement('span', { className: `in-qa-ic tone-${tone}`, 'aria-hidden': 'true' }, [
        new Icon({ name: icon, size: 20 }).element,
      ]),
      createElement('span', { className: 'in-qa-t' }, [title]),
      createElement('span', { className: 'in-qa-d' }, [description]),
    ]);
  }

  #createRevenueSection() {
    return createElement('section', { className: 'in-sec', 'aria-label': 'Umsatz im Überblick' }, [
      createElement('div', { className: 'in-sec-head' }, [
        createElement('h2', {}, ['Umsatz im Überblick']),
        createElement('span', { className: 'in-sec-hint' }, [
          'Monatliche Entwicklung und Kennzahlen',
        ]),
      ]),
      this.#revenuePanel.element,
    ]);
  }

  unmount() {
    this.#revenuePanel?.destroy();
    clearElement(this.#container);
  }
}
