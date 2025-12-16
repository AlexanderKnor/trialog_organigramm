/**
 * Molecule: ProvisionCascade
 * Visualizes the provision flow through the hierarchy
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

    // Build cascade items (reverse order: employee → company)
    const cascadeItems = [];

    // Start with the entry owner (employee who made the sale)
    const entryOwner = this.#entry.entryOwner;
    const ownerProvision = this.#getProvisionForCategory(entryOwner, categoryType);
    const ownerAmount = baseAmount * (ownerProvision / 100);

    cascadeItems.push({
      name: entryOwner.name,
      role: 'Erfasser',
      provision: ownerProvision,
      amount: ownerAmount,
      isOwner: true,
      isCompany: false,
    });

    // Add intermediate managers (skip first = company, skip last = entry owner)
    // hierarchyPath is [company, ..., employee]
    let previousProvision = ownerProvision;

    for (let i = hierarchyPath.length - 2; i > 0; i--) {
      const manager = hierarchyPath[i];
      const managerProvision = this.#getProvisionForCategory(manager, categoryType);

      // Manager gets the difference between their provision and the previous level
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
        });

        previousProvision = Math.max(previousProvision, managerProvision);
      }
    }

    // Add company (gets remainder)
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
    });

    // Render cascade flow (bottom to top: company at top, employee at bottom)
    const cascadeFlow = createElement('div', { className: 'cascade-flow' });

    // Reverse the order: company first, then managers, then employee
    const reversedItems = [...cascadeItems].reverse();

    // Cascade items (company → managers → employee)
    reversedItems.forEach((item, index) => {
      const isFirst = index === 0;
      const cascadeItem = this.#renderCascadeItem(item, isFirst, index === reversedItems.length - 1);
      cascadeFlow.appendChild(cascadeItem);
    });

    // Base amount footer (at the bottom)
    const baseFooter = createElement('div', { className: 'cascade-base cascade-base-bottom' }, [
      createElement('span', { className: 'cascade-base-label' }, ['Umsatz']),
      createElement('span', { className: 'cascade-base-amount' }, [
        this.#formatCurrency(baseAmount),
      ]),
    ]);

    cascadeFlow.appendChild(baseFooter);

    return createElement('div', {
      className: `provision-cascade ${this.#props.className}`,
    }, [cascadeFlow]);
  }

  #renderCascadeItem(item, isFirst, isLast) {
    const itemClass = [
      'cascade-item',
      item.isOwner ? 'cascade-item-owner' : '',
      item.isCompany ? 'cascade-item-company' : '',
      isFirst ? 'cascade-item-first' : '',
      isLast ? 'cascade-item-last' : '',
    ].filter(Boolean).join(' ');

    // Provision display
    let provisionText;
    if (item.isDelta && item.effectiveProvision !== item.provision) {
      provisionText = `${item.provision}% (Δ ${item.effectiveProvision}%)`;
    } else {
      provisionText = `${item.provision}%`;
    }

    const itemContent = createElement('div', { className: 'cascade-item-content' }, [
      createElement('div', { className: 'cascade-item-left' }, [
        createElement('div', { className: 'cascade-item-icon' }, [
          item.isCompany ? '🏢' : item.isOwner ? '👤' : '👔',
        ]),
        createElement('div', { className: 'cascade-item-info' }, [
          createElement('span', { className: 'cascade-item-name' }, [item.name]),
          createElement('span', { className: 'cascade-item-role' }, [item.role]),
        ]),
      ]),
      createElement('div', { className: 'cascade-item-right' }, [
        createElement('span', { className: 'cascade-item-percent' }, [provisionText]),
        createElement('span', { className: 'cascade-item-amount' }, [
          this.#formatCurrency(item.amount),
        ]),
      ]),
    ]);

    // Connector line (arrow pointing up - from employee to company)
    const connector = !isLast
      ? createElement('div', { className: 'cascade-connector' }, [
          createElement('div', { className: 'connector-arrow-wrapper' }, [
            this.#createArrowSVG(),
          ]),
          createElement('div', { className: 'connector-line' }),
        ])
      : null;

    return createElement('div', { className: itemClass }, [
      itemContent,
      connector,
    ].filter(Boolean));
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

  #createArrowSVG() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'connector-arrow-svg');

    // Arrow path (chevron up)
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M12 4L12 20M12 4L6 10M12 4L18 10');
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
