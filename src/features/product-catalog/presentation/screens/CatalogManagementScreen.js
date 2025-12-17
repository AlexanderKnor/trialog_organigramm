/**
 * Screen: CatalogManagementScreen
 * Admin screen for managing product catalog
 */

import { authService } from '../../../../core/auth/index.js';
import { CategoryManagementPanel } from '../components/organisms/CategoryManagementPanel.js';
import { ProductManagementPanel } from '../components/organisms/ProductManagementPanel.js';
import { ProviderManagementPanel } from '../components/organisms/ProviderManagementPanel.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { createElement } from '../../../../core/utils/dom.js';

export class CatalogManagementScreen {
  #containerSelector;
  #catalogService;
  #element;
  #currentTab;
  #currentPanel;

  constructor(containerSelector, catalogService) {
    this.#containerSelector = containerSelector;
    this.#catalogService = catalogService;
    this.#currentTab = 'categories';
    this.#currentPanel = null;
  }

  async mount() {
    const container = document.querySelector(this.#containerSelector);
    if (!container) {
      throw new Error(`Container not found: ${this.#containerSelector}`);
    }

    this.#element = this.#render();
    container.innerHTML = '';
    container.appendChild(this.#element);

    console.log('✓ CatalogManagementScreen mounted');
  }

  unmount() {
    if (this.#currentPanel) {
      this.#currentPanel.destroy();
      this.#currentPanel = null;
    }

    if (this.#element) {
      this.#element.remove();
      this.#element = null;
    }

    console.log('✓ CatalogManagementScreen unmounted');
  }

  #render() {
    const header = this.#createHeader();
    const tabs = this.#createTabs();
    const panelContainer = this.#createPanelContainer();

    return createElement('div', { className: 'catalog-screen' }, [
      header,
      createElement('div', { className: 'catalog-content' }, [tabs, panelContainer]),
    ]);
  }

  #createHeader() {
    const backButton = createElement('button', {
      className: 'btn-back-to-org',
      onclick: () => this.#handleBack(),
      'aria-label': 'Zurück zum Organigramm',
    }, [
      createElement('svg', {
        width: '20',
        height: '20',
        viewBox: '0 0 20 20',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        style: 'display: block;',
      }, [
        createElement('path', { d: 'M13 5L7 10L13 15' }),
      ]),
    ]);

    return createElement('header', { className: 'app-header' }, [
      createElement('div', { className: 'header-date' }, [backButton]),
      createElement('div', { className: 'header-logo' }, [
        createElement('span', { className: 'logo-text' }, ['Trialog']),
        createElement('span', { className: 'logo-divider' }, ['·']),
        createElement('span', { className: 'logo-subtext' }, ['Katalog']),
      ]),
      createElement('nav', { className: 'header-nav' }),
    ]);
  }

  #createTabs() {
    const tabs = [
      { id: 'categories', label: 'Kategorien' },
      { id: 'products', label: 'Produkte' },
      { id: 'providers', label: 'Produktgeber' },
    ];

    const tabButtons = tabs.map((tab) => {
      const isActive = this.#currentTab === tab.id;
      const button = createElement(
        'button',
        {
          className: `catalog-tab ${isActive ? 'active' : ''}`,
          onclick: () => this.#switchTab(tab.id),
        },
        [tab.label]
      );

      return button;
    });

    return createElement('div', { className: 'catalog-tabs' }, tabButtons);
  }

  #createPanelContainer() {
    const panelContainer = createElement('div', { className: 'catalog-panel-container' }, []);

    // Render initial panel
    this.#renderActivePanel(panelContainer);

    return panelContainer;
  }

  #renderActivePanel(container) {
    // Destroy current panel if exists
    if (this.#currentPanel) {
      this.#currentPanel.destroy();
      this.#currentPanel = null;
    }

    // Create new panel based on active tab
    switch (this.#currentTab) {
      case 'categories':
        this.#currentPanel = new CategoryManagementPanel({
          catalogService: this.#catalogService,
        });
        break;
      case 'products':
        this.#currentPanel = new ProductManagementPanel({
          catalogService: this.#catalogService,
        });
        break;
      case 'providers':
        this.#currentPanel = new ProviderManagementPanel({
          catalogService: this.#catalogService,
        });
        break;
    }

    // Mount panel
    container.innerHTML = '';
    if (this.#currentPanel) {
      container.appendChild(this.#currentPanel.element);
    }
  }

  #switchTab(tabId) {
    if (this.#currentTab === tabId) return;

    this.#currentTab = tabId;

    // Update tab buttons
    const tabButtons = this.#element.querySelectorAll('.catalog-tab');
    tabButtons.forEach((button, index) => {
      const tabs = ['categories', 'products', 'providers'];
      if (tabs[index] === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Re-render panel
    const panelContainer = this.#element.querySelector('.catalog-panel-container');
    this.#renderActivePanel(panelContainer);
  }

  #handleBack() {
    window.location.hash = '';
  }
}
