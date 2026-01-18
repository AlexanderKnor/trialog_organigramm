/**
 * Molecule: ProvisionCascade
 * Visualizes the provision flow through the hierarchy
 * Vertical flow (bottom to top) with full-width elegant design
 */

import { createElement } from '../../../../../core/utils/index.js';

export class ProvisionCascade {
  #element;
  #entry;
  #props;

  constructor(entry, props = {}) {
    this.#entry = entry;
    this.#props = {
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    const hierarchyPath = this.#entry.hierarchyPath;
    const categoryType = this.#entry.originalEntry.category.type;
    const baseAmount = this.#entry.originalEntry.provisionAmount;

    // Build cascade items (employee → managers → company)
    const cascadeItems = [];

    // Start with the entry owner (employee who made the sale)
    const entryOwner = this.#entry.entryOwner;
    const originalEntry = this.#entry.originalEntry;
    const ownerBaseProvision = this.#getProvisionForCategory(entryOwner, categoryType);

    // Tip provider provision is deducted from owner's share
    const tipProviderPercentage = originalEntry.tipProviderProvisionPercentage || 0;
    const ownerEffectiveProvision = Math.max(0, ownerBaseProvision - tipProviderPercentage);
    const ownerAmount = baseAmount * (ownerEffectiveProvision / 100);

    cascadeItems.push({
      name: entryOwner.name,
      role: 'Erfasser',
      provision: ownerEffectiveProvision,
      baseProvision: ownerBaseProvision, // Store base for cascade calculations
      amount: ownerAmount,
      isOwner: true,
      isCompany: false,
      level: 0,
    });

    // Add tip provider directly above owner (if present)
    let level = 1;

    if (originalEntry.hasTipProvider) {
      const tipProviderAmount = originalEntry.tipProviderProvisionAmount || 0;

      cascadeItems.push({
        name: originalEntry.tipProviderName || 'Tippgeber',
        role: 'Tippgeber',
        provision: tipProviderPercentage,
        amount: tipProviderAmount,
        isOwner: false,
        isCompany: false,
        isTipProvider: true,
        level: level++,
      });
    }

    // Add intermediate managers (skip first = company, skip last = entry owner)
    // Use BASE provision for cascade calculations (not reduced by tip provider)
    let previousProvision = ownerBaseProvision;

    for (let i = hierarchyPath.length - 2; i > 0; i--) {
      const manager = hierarchyPath[i];
      const managerProvision = this.#getProvisionForCategory(manager, categoryType);
      const effectiveProvision = Math.max(0, managerProvision - previousProvision);
      const managerAmount = baseAmount * (effectiveProvision / 100);

      if (managerProvision > 0) {
        cascadeItems.push({
          name: manager.name,
          role: 'Manager',
          provision: managerProvision,
          effectiveProvision,
          amount: managerAmount,
          isOwner: false,
          isCompany: false,
          isDelta: true,
          level: level++,
        });
        previousProvision = Math.max(previousProvision, managerProvision);
      }
    }

    // Add company (gets remainder after tip provider deduction)
    const company = hierarchyPath[0];
    const companyProvision = this.#entry.companyProvisionPercentage;
    const companyAmount = this.#entry.companyProvisionAmount;

    cascadeItems.push({
      name: company.name,
      role: 'Unternehmen',
      provision: companyProvision,
      amount: companyAmount,
      isOwner: false,
      isCompany: true,
      level: level,
    });

    // Calculate totals (includes tip provider)
    const totalDistributed = cascadeItems.reduce((sum, item) => sum + item.amount, 0);

    // Create main container
    const cascadeWrapper = createElement('div', { className: 'cascade-elegant' });

    // Revenue header bar
    const headerBar = this.#renderHeaderBar(baseAmount, totalDistributed);
    cascadeWrapper.appendChild(headerBar);

    // Cascade flow container (items flow bottom to top visually)
    const flowContainer = createElement('div', { className: 'cascade-flow-vertical' });

    // Render items in reverse order for visual bottom-to-top flow
    // (employee at bottom, company at top)
    const reversedItems = [...cascadeItems].reverse();

    reversedItems.forEach((item, index) => {
      const isFirst = index === 0; // Company (top)
      const isLast = index === reversedItems.length - 1; // Employee (bottom)

      // Add connector above item (except for first/top item)
      if (!isFirst) {
        const connector = this.#createVerticalConnector();
        flowContainer.appendChild(connector);
      }

      const card = this.#renderParticipantCard(item, isFirst, isLast, reversedItems.length);
      flowContainer.appendChild(card);
    });

    cascadeWrapper.appendChild(flowContainer);

    return createElement('div', {
      className: `provision-cascade provision-cascade-elegant ${this.#props.className}`,
    }, [cascadeWrapper]);
  }

  #renderHeaderBar(baseAmount, totalDistributed) {
    return createElement('div', { className: 'cascade-header-bar' }, [
      createElement('div', { className: 'cascade-header-item' }, [
        createElement('span', { className: 'cascade-header-label' }, ['Umsatz']),
        createElement('span', { className: 'cascade-header-value' }, [
          this.#formatCurrency(baseAmount),
        ]),
      ]),
      createElement('div', { className: 'cascade-header-divider' }),
      createElement('div', { className: 'cascade-header-item cascade-header-item-success' }, [
        createElement('span', { className: 'cascade-header-label' }, ['Verteilt']),
        createElement('span', { className: 'cascade-header-value' }, [
          this.#formatCurrency(totalDistributed),
        ]),
      ]),
    ]);
  }

  #renderParticipantCard(item, isFirst, isLast, totalItems) {
    const cardClasses = [
      'cascade-participant',
      item.isCompany ? 'cascade-participant-company' : '',
      item.isOwner ? 'cascade-participant-owner' : '',
      item.isTipProvider ? 'cascade-participant-tipProvider' : '',
      !item.isCompany && !item.isOwner && !item.isTipProvider ? 'cascade-participant-manager' : '',
      isFirst ? 'cascade-participant-first' : '',
      isLast ? 'cascade-participant-last' : '',
    ].filter(Boolean).join(' ');

    // Provision text
    let provisionText;
    if (item.isDelta && item.effectiveProvision !== item.provision) {
      provisionText = `${item.effectiveProvision}%`;
    } else {
      provisionText = `${item.provision}%`;
    }

    // Role icon
    const icon = item.isCompany
      ? this.#createBuildingIcon()
      : item.isOwner
        ? this.#createUserIcon()
        : item.isTipProvider
          ? this.#createHandshakeIcon()
          : this.#createTieIcon();

    // Progress bar width (visual representation)
    const maxProvision = 100;
    const progressWidth = Math.min(100, (item.provision / maxProvision) * 100);

    return createElement('div', { className: cardClasses }, [
      // Left section: Icon + Info
      createElement('div', { className: 'cascade-participant-main' }, [
        createElement('div', { className: 'cascade-participant-icon' }, [icon]),
        createElement('div', { className: 'cascade-participant-info' }, [
          createElement('span', { className: 'cascade-participant-name' }, [item.name]),
          createElement('span', { className: 'cascade-participant-role' }, [item.role]),
        ]),
      ]),
      // Center section: Progress bar
      createElement('div', { className: 'cascade-participant-progress' }, [
        createElement('div', { className: 'cascade-progress-track' }, [
          createElement('div', {
            className: 'cascade-progress-fill',
            style: `width: ${progressWidth}%`,
          }),
        ]),
        createElement('span', { className: 'cascade-participant-percent' }, [provisionText]),
      ]),
      // Right section: Amount
      createElement('div', { className: 'cascade-participant-amount-wrapper' }, [
        createElement('span', { className: 'cascade-participant-amount' }, [
          this.#formatCurrency(item.amount),
        ]),
      ]),
    ]);
  }

  #createVerticalConnector() {
    return createElement('div', { className: 'cascade-connector-vertical' }, [
      createElement('div', { className: 'cascade-connector-line' }),
      createElement('div', { className: 'cascade-connector-arrow' }, [
        this.#createArrowUpIcon(),
      ]),
    ]);
  }

  #getProvisionForCategory(employee, categoryType) {
    switch (categoryType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
      case 'propertyManagement':
        return employee.realEstateProvision || 0;
      case 'energyContracts':
        return 0;
      default:
        return 0;
    }
  }

  #createEuroIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M17 9.5C16.2 7.5 14.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18C14.3 18 16.2 16.5 17 14.5M4 10H13M4 14H13');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createCheckIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createBuildingIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M3 21H21M5 21V7L13 3V21M13 21H19V11L13 7M9 9V9.01M9 12V12.01M9 15V15.01M9 18V18.01');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createUserIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21M16 7C16 9.21 14.21 11 12 11C9.79 11 8 9.21 8 7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7Z');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createTieIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createHandshakeIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M7 11L11 7L9.5 5.5L5 10L3 8V14H9L7 11ZM17 13L13 17L14.5 18.5L19 14L21 16V10H15L17 13ZM12 12L9 15L11 17L14 14L12 12Z');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #createArrowUpIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'cascade-svg-icon cascade-arrow-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M12 19V5M5 12L12 5L19 12');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  #formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  get element() {
    return this.#element;
  }
}
