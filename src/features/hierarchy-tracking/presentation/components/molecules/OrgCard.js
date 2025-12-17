/**
 * Molecule: OrgCard
 * Organization chart card with revenue and provision display
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../atoms/Icon.js';

export class OrgCard {
  #element;
  #node;
  #props;

  constructor(node, props = {}) {
    this.#node = node;
    this.#props = {
      level: props.level || 0,
      isSelected: props.isSelected || false,
      isRoot: props.isRoot || false,
      revenueData: props.revenueData || null,
      onSelect: props.onSelect || null,
    };

    this.#element = this.#render();
  }

  #getInitials() {
    const name = this.#node.name || '';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  #formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  #renderRevenueInfo() {
    const data = this.#props.revenueData;
    const isRoot = this.#props.isRoot;

    // Root/Company node shows total company revenue and company provision
    if (isRoot) {
      if (!data || (!data.totalRevenue && !data.companyProvision)) {
        return createElement('div', {
          className: 'card-revenue card-revenue-root',
        }, [
          createElement('div', { className: 'card-revenue-row' }, [
            createElement('span', { className: 'revenue-label-root' }, ['Gesamt-Umsatz']),
            createElement('span', { className: 'revenue-amount-root' }, ['—']),
          ]),
        ]);
      }

      return createElement('div', {
        className: 'card-revenue card-revenue-root',
      }, [
        // Total revenue row
        createElement('div', { className: 'card-revenue-row' }, [
          createElement('span', { className: 'revenue-label-root' }, ['Gesamt-Umsatz']),
          createElement('span', { className: 'revenue-amount-root' }, [
            this.#formatCurrency(data.totalRevenue || 0),
          ]),
        ]),
        // Company provision row
        createElement('div', { className: 'card-revenue-row card-provision-row' }, [
          createElement('span', { className: 'provision-label-root' }, ['Unternehmensanteil']),
          createElement('span', { className: 'provision-amount-root' }, [
            this.#formatCurrency(data.companyProvision || 0),
          ]),
        ]),
      ]);
    }

    // Employee cards
    if (!data) {
      return createElement('div', {
        className: 'card-revenue card-revenue-empty',
      }, [
        createElement('span', { className: 'revenue-label' }, ['—']),
      ]);
    }

    const hasRevenue = data.monthlyRevenue > 0;

    if (!hasRevenue) {
      return createElement('div', {
        className: 'card-revenue card-revenue-empty',
      }, [
        createElement('span', { className: 'revenue-label' }, ['Kein Umsatz']),
      ]);
    }

    return createElement('div', {
      className: 'card-revenue',
    }, [
      // Revenue row
      createElement('div', { className: 'card-revenue-row' }, [
        createElement('span', { className: 'revenue-label' }, ['Umsatz']),
        createElement('span', { className: 'revenue-amount' }, [
          this.#formatCurrency(data.monthlyRevenue),
        ]),
      ]),
      // Provision row
      createElement('div', { className: 'card-revenue-row card-provision-row' }, [
        createElement('span', { className: 'provision-label' }, ['Provision']),
        createElement('span', { className: 'provision-amount' }, [
          this.#formatCurrency(data.employeeProvision || 0),
        ]),
      ]),
    ]);
  }

  #render() {
    const isRoot = this.#props.isRoot;
    const level = this.#props.level;

    // Avatar
    const avatarContent = isRoot
      ? new Icon({ name: 'building', size: 32, color: 'currentColor' }).element
      : createElement('span', { className: 'card-initials' }, [this.#getInitials()]);

    const avatar = createElement('div', {
      className: `card-avatar level-${level}`,
    }, [avatarContent]);

    // Info
    const name = createElement('div', { className: 'card-name' }, [this.#node.name]);

    const subtitle = this.#node.description
      ? createElement('div', { className: 'card-role' }, [this.#node.description])
      : null;

    const info = createElement('div', { className: 'card-info' }, [
      name,
      subtitle,
    ].filter(Boolean));

    // Header with avatar and info
    const header = createElement('div', { className: 'card-header' }, [
      avatar,
      info,
    ]);

    // Revenue info
    const revenueInfo = this.#renderRevenueInfo();

    // Badge for child/employee count
    // For root: show total employees from revenueData
    // For others: show direct child count
    const data = this.#props.revenueData;
    const badgeCount = isRoot && data?.totalEmployees
      ? data.totalEmployees
      : (this.#node.childCount || 0);
    const badge = badgeCount > 0
      ? createElement('div', { className: 'card-badge' }, [String(badgeCount)])
      : null;

    // Card element
    const card = createElement('div', {
      className: `org-card ${isRoot ? 'root' : ''} level-${level} ${this.#props.isSelected ? 'selected' : ''}`,
      onClick: () => {
        if (this.#props.onSelect) this.#props.onSelect(this.#node.id);
      },
    }, [
      badge,
      header,
      revenueInfo,
    ].filter(Boolean));

    return card;
  }

  get element() {
    return this.#element;
  }

  get node() {
    return this.#node;
  }

  setSelected(isSelected) {
    this.#props.isSelected = isSelected;
    this.#element.classList.toggle('selected', isSelected);
  }
}
