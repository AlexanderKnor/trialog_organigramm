/**
 * Molecule: TreeNodeItem
 * Single node item in the hierarchy tree view with modern UX
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../atoms/Icon.js';

export class TreeNodeItem {
  #element;
  #node;
  #props;
  #childrenContainer;
  #contentElement;

  constructor(node, props = {}) {
    this.#node = node;
    this.#props = {
      depth: props.depth || 0,
      isExpanded: props.isExpanded ?? true,
      isSelected: props.isSelected || false,
      isVisible: props.isVisible ?? true,
      revenueData: props.revenueData || null,
      onSelect: props.onSelect || null,
      onToggle: props.onToggle || null,
      onEdit: props.onEdit || null,
      onDelete: props.onDelete || null,
      onDragStart: props.onDragStart || null,
      onDragOver: props.onDragOver || null,
      onDragEnd: props.onDragEnd || null,
      onDrop: props.onDrop || null,
    };

    this.#element = this.#render();
  }

  #getNodeTypeIcon() {
    const typeIcons = {
      root: 'building',
      division: 'sitemap',
      department: 'briefcase',
      team: 'users',
      person: 'user',
      default: 'folder',
    };

    const typeName = this.#node.type?.name?.toLowerCase() || 'default';
    return typeIcons[typeName] || typeIcons.default;
  }

  #getNodeTypeClass() {
    const typeName = this.#node.type?.name?.toLowerCase() || 'default';
    return `type-${typeName}`;
  }

  #renderRevenueInfo() {
    const data = this.#props.revenueData;
    const typeName = this.#node.type?.name?.toLowerCase() || 'default';

    // Root/Company node doesn't track individual revenue
    if (typeName === 'root') {
      return null;
    }

    if (!data) return null;

    const hasRevenue = data.monthlyRevenue > 0 || data.entryCount > 0;

    if (!hasRevenue) {
      return createElement('div', { className: 'node-revenue-info node-revenue-empty' }, [
        createElement('span', { className: 'revenue-label' }, ['Kein Umsatz']),
      ]);
    }

    const formattedRevenue = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(data.monthlyRevenue);

    return createElement('div', { className: 'node-revenue-info' }, [
      createElement('span', { className: 'revenue-amount' }, [formattedRevenue]),
      createElement('span', { className: 'revenue-meta' }, [
        `${data.entryCount} ${data.entryCount === 1 ? 'Eintrag' : 'Einträge'}`,
      ]),
    ]);
  }

  #render() {
    const hasChildren = this.#node.hasChildren;

    const toggleIcon = new Icon({
      name: 'chevronRight',
      size: 14,
    });

    const toggleButton = createElement('button', {
      className: `node-toggle ${hasChildren ? '' : 'invisible'} ${this.#props.isExpanded ? 'expanded' : ''}`,
      type: 'button',
      'aria-label': this.#props.isExpanded ? 'Einklappen' : 'Ausklappen',
      'aria-expanded': hasChildren ? String(this.#props.isExpanded) : undefined,
      onClick: (e) => {
        e.stopPropagation();
        if (hasChildren && this.#props.onToggle) {
          this.#props.onToggle(this.#node.id);
        }
      },
    }, [toggleIcon.element]);

    const typeIconName = this.#getNodeTypeIcon();
    const typeIcon = new Icon({
      name: typeIconName,
      size: 18,
    });

    const typeIconContainer = createElement('span', {
      className: `node-type-icon ${this.#getNodeTypeClass()}`,
    }, [typeIcon.element]);

    // Revenue quick info
    const revenueInfo = this.#renderRevenueInfo();

    const nodeInfoWrapper = createElement('div', {
      className: 'node-info-wrapper',
    }, [
      createElement('div', { className: 'node-info-main' }, [
        createElement('span', {
          className: 'node-name',
          title: this.#node.name,
        }, [this.#node.name]),
        this.#node.description ? createElement('span', {
          className: 'node-subtitle',
          title: this.#node.description,
        }, [this.#node.description]) : null,
      ].filter(Boolean)),
      revenueInfo,
    ].filter(Boolean));

    const editBtn = createElement('button', {
      className: 'node-action-btn node-action-edit tooltip',
      type: 'button',
      'data-tooltip': 'Bearbeiten',
      onClick: (e) => {
        e.stopPropagation();
        if (this.#props.onEdit) {
          this.#props.onEdit(this.#node.id);
        }
      },
    }, [new Icon({ name: 'edit', size: 14 }).element]);

    const deleteBtn = createElement('button', {
      className: 'node-action-btn node-action-delete tooltip',
      type: 'button',
      'data-tooltip': 'Löschen',
      onClick: (e) => {
        e.stopPropagation();
        if (this.#props.onDelete) {
          this.#props.onDelete(this.#node.id);
        }
      },
    }, [new Icon({ name: 'delete', size: 14 }).element]);

    const nodeActions = createElement('div', {
      className: 'node-actions',
    }, [editBtn, deleteBtn]);

    this.#contentElement = createElement('div', {
      className: 'node-content',
      role: 'treeitem',
      'aria-selected': String(this.#props.isSelected),
      tabIndex: 0,
      onKeyDown: (e) => this.#handleKeyDown(e),
    }, [toggleButton, typeIconContainer, nodeInfoWrapper, nodeActions]);

    this.#childrenContainer = createElement('div', {
      className: `node-children ${this.#props.isExpanded ? '' : 'collapsed'}`,
      role: 'group',
    });

    const wrapper = createElement('div', {
      className: `tree-node-item ${this.#props.isSelected ? 'selected' : ''} ${this.#props.isVisible ? '' : 'hidden'}`,
      dataset: {
        nodeId: this.#node.id,
        level: String(this.#props.depth),
      },
      draggable: 'true',
      onClick: (e) => {
        if (e.target.closest('.node-actions')) return;
        if (this.#props.onSelect) {
          this.#props.onSelect(this.#node.id);
        }
      },
      onDragStart: (e) => {
        e.dataTransfer.setData('text/plain', this.#node.id);
        e.dataTransfer.effectAllowed = 'move';
        this.#element.classList.add('dragging');
        if (this.#props.onDragStart) {
          this.#props.onDragStart(this.#node.id, e);
        }
      },
      onDragEnd: (e) => {
        this.#element.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach((el) => {
          el.classList.remove('drag-over');
        });
        if (this.#props.onDragEnd) {
          this.#props.onDragEnd(this.#node.id, e);
        }
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.#element.classList.add('drag-over');
        if (this.#props.onDragOver) {
          this.#props.onDragOver(this.#node.id, e);
        }
      },
      onDragLeave: (e) => {
        if (!this.#element.contains(e.relatedTarget)) {
          this.#element.classList.remove('drag-over');
        }
      },
      onDrop: (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.#element.classList.remove('drag-over');
        const draggedNodeId = e.dataTransfer.getData('text/plain');
        if (draggedNodeId !== this.#node.id && this.#props.onDrop) {
          this.#props.onDrop(draggedNodeId, this.#node.id, e);
        }
      },
    }, [this.#contentElement, this.#childrenContainer]);

    return wrapper;
  }

  #handleKeyDown(e) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.#props.onSelect) {
          this.#props.onSelect(this.#node.id);
        }
        break;
      case 'ArrowRight':
        if (this.#node.hasChildren && !this.#props.isExpanded) {
          e.preventDefault();
          if (this.#props.onToggle) {
            this.#props.onToggle(this.#node.id);
          }
        }
        break;
      case 'ArrowLeft':
        if (this.#node.hasChildren && this.#props.isExpanded) {
          e.preventDefault();
          if (this.#props.onToggle) {
            this.#props.onToggle(this.#node.id);
          }
        }
        break;
    }
  }

  get element() {
    return this.#element;
  }

  get node() {
    return this.#node;
  }

  get childrenContainer() {
    return this.#childrenContainer;
  }

  setSelected(isSelected) {
    this.#props.isSelected = isSelected;
    this.#element.classList.toggle('selected', isSelected);
    this.#contentElement.setAttribute('aria-selected', String(isSelected));

    if (isSelected) {
      this.#element.classList.add('pulse');
      setTimeout(() => {
        this.#element.classList.remove('pulse');
      }, 1000);
    }
  }

  setExpanded(isExpanded) {
    this.#props.isExpanded = isExpanded;
    this.#childrenContainer.classList.toggle('collapsed', !isExpanded);

    const toggleBtn = this.#element.querySelector('.node-toggle');
    if (toggleBtn && this.#node.hasChildren) {
      toggleBtn.classList.toggle('expanded', isExpanded);
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.setAttribute('aria-label', isExpanded ? 'Einklappen' : 'Ausklappen');
    }
  }

  setVisible(isVisible) {
    this.#props.isVisible = isVisible;
    this.#element.classList.toggle('hidden', !isVisible);
  }

  setHighlight(isHighlight) {
    this.#element.classList.toggle('search-match', isHighlight);
  }

  appendChild(childElement) {
    this.#childrenContainer.appendChild(childElement);
  }

  focus() {
    this.#contentElement.focus();
  }

  scrollIntoView() {
    this.#element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}
