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

    // Render shell with loading state
    this.#element = this.#renderShell();
    container.innerHTML = '';
    container.appendChild(this.#element);

    // Load initial panel with data
    const panelContainer = this.#element.querySelector('.catalog-panel-container');
    panelContainer.style.opacity = '0';
    this.#showLoadingState(panelContainer);

    await this.#wait(100);
    await this.#renderActivePanel(panelContainer);

    await this.#wait(50);
    panelContainer.style.opacity = '1';

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

  #renderShell() {
    const header = this.#createHeader();
    const tabs = this.#createTabs();
    const panelContainer = createElement('div', { className: 'catalog-panel-container' }, []);

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

  async #renderActivePanel(container) {
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

    // Initialize panel (loads data + renders)
    if (this.#currentPanel) {
      await this.#currentPanel.initialize();
    }

    // Mount panel (already fully initialized with data)
    container.innerHTML = '';
    if (this.#currentPanel && this.#currentPanel.element) {
      container.appendChild(this.#currentPanel.element);
    }
  }

  async #switchTab(tabId) {
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

    // Smooth transition: Fade out → Load → Fade in
    const panelContainer = this.#element.querySelector('.catalog-panel-container');

    // 1. Fade out current panel
    panelContainer.style.opacity = '0';
    await this.#wait(200);

    // 2. Show loading state
    this.#showLoadingState(panelContainer);
    await this.#wait(100);

    // 3. Re-render panel (data loads here)
    await this.#renderActivePanel(panelContainer);

    // 4. Fade in new panel
    await this.#wait(50);
    panelContainer.style.opacity = '1';
  }

  #showLoadingState(container) {
    container.innerHTML = '';
    const loader = createElement('div', { className: 'catalog-loading-state' }, [
      createElement('div', { className: 'loading-spinner' }),
      createElement('p', { className: 'loading-text' }, ['Lädt...']),
    ]);
    container.appendChild(loader);
  }

  #wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  #handleBack() {
    window.location.hash = '';
  }
}
