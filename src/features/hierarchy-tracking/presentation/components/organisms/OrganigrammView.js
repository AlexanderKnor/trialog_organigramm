/**
 * Organism: OrganigrammView
 * Premium organizational chart with elegant connector lines
 */

import { createElement, clearElement } from '../../../../../core/utils/index.js';
import { OrgCard } from '../molecules/OrgCard.js';
import { Icon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';

export class OrganigrammView {
  #element;
  #container;
  #tree;
  #state;
  #cardMap;
  #props;
  #geschaeftsfuehrerNodes;

  constructor(props = {}) {
    this.#tree = props.tree || null;
    this.#state = props.state || null;
    this.#cardMap = new Map();
    this.#geschaeftsfuehrerNodes = new Map();
    this.#props = {
      onNodeSelect: props.onNodeSelect || null,
      onAddChild: props.onAddChild || null,
      className: props.className || '',
      revenueDataMap: props.revenueDataMap || new Map(),
    };

    this.#element = this.#render();
  }

  #render() {
    this.#container = createElement('div', {
      className: 'organigramm-container',
    });

    if (this.#tree) {
      this.#renderOrganigramm();
    } else {
      this.#renderEmptyState();
    }

    const view = createElement('div', {
      className: `organigramm-view ${this.#props.className}`,
    }, [this.#container]);

    // Add scroll hint detection
    setTimeout(() => this.#checkScrollHint(view), 100);

    return view;
  }

  #renderOrganigramm() {
    clearElement(this.#container);
    this.#cardMap.clear();

    console.log('🎨 Rendering organigramm, tree:', this.#tree?.name);

    if (!this.#tree || !this.#tree.root) {
      this.#renderEmptyState();
      return;
    }

    // Check if this is an employee view (filtered subtree)
    const isEmployeeView = this.#tree._isEmployeeView || false;
    const employeeRootId = this.#tree._employeeRootNodeId;

    console.log(`  Is Employee View: ${isEmployeeView}, Employee Root: ${employeeRootId}`);

    const orgChart = createElement('div', { className: 'org-chart' });

    if (isEmployeeView && employeeRootId) {
      // Employee view: render only from their node (no Geschäftsführer cards)
      const employeeNode = this.#tree.getNode(employeeRootId);

      // Debug: Check revenue data
      const revenueData = this.#props.revenueDataMap?.get(employeeRootId);
      console.log(`  Employee node revenue data:`, JSON.stringify(revenueData));
      console.log(`  RevenueDataMap keys:`, Array.from(this.#props.revenueDataMap?.keys() || []));
      console.log(`  Looking for nodeId: ${employeeRootId}`);

      // Render employee's own card with special styling (like a mini-root)
      const employeeRootElement = this.#renderEmployeeOwnCard(employeeNode);
      orgChart.appendChild(employeeRootElement);
      console.log('✓ Rendered employee view starting from:', employeeNode.name);
    } else {
      // Admin view: render full tree with Geschäftsführer
      const root = this.#tree.root;
      const topLevelContainer = createElement('div', { className: 'org-top-level' });

      // Left Geschäftsführer: Marcel Liebetrau
      const marcelNode = this.#createGeschaeftsfuehrerNode('marcel-liebetrau', 'Marcel Liebetrau');
      const marcelCard = this.#renderGeschaeftsfuehrerCard(marcelNode, 'left');
      topLevelContainer.appendChild(marcelCard);

      // Render tree recursively starting from root (Trialog)
      const rootNode = this.#renderNode(root, 0, true);
      topLevelContainer.appendChild(rootNode);

      // Right Geschäftsführer: Daniel Lippa
      const danielNode = this.#createGeschaeftsfuehrerNode('daniel-lippa', 'Daniel Lippa');
      const danielCard = this.#renderGeschaeftsfuehrerCard(danielNode, 'right');
      topLevelContainer.appendChild(danielCard);

      orgChart.appendChild(topLevelContainer);
    }

    this.#container.appendChild(orgChart);

    // Center on root card after render
    setTimeout(() => this.#centerOnRootCard(), 150);
  }

  #createGeschaeftsfuehrerNode(id, name) {
    const node = {
      id,
      name,
      description: 'Geschäftsführer',
      bankProvision: 90,
      insuranceProvision: 90,
      realEstateProvision: 90,
      childCount: 0,
      isGeschaeftsfuehrer: true,
      email: null,
      phone: null,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Store the node for later retrieval
    this.#geschaeftsfuehrerNodes.set(id, node);

    return node;
  }

  #renderGeschaeftsfuehrerCard(node, position) {
    const wrapper = createElement('div', {
      className: `org-node org-geschaeftsfuehrer org-geschaeftsfuehrer-${position}`,
      dataset: { nodeId: node.id, level: '0' },
    });

    const card = new OrgCard(node, {
      level: 0,
      isRoot: false,
      isSelected: this.#state?.selectedNodeId === node.id,
      revenueData: this.#props.revenueDataMap.get(node.id) || null,
      onSelect: this.#props.onNodeSelect,
    });

    this.#cardMap.set(node.id, card);
    wrapper.appendChild(card.element);

    return wrapper;
  }

  #renderEmployeeOwnCard(employeeNode) {
    // Render employee's own card with special "featured" styling
    const children = this.#tree.getChildren(employeeNode.id);
    const hasChildren = children && children.length > 0;

    const nodeWrapper = createElement('div', {
      className: `org-node org-node-employee-featured ${hasChildren ? 'has-children' : ''}`,
      dataset: { nodeId: employeeNode.id, level: '0' },
    });

    const revenueData = this.#props.revenueDataMap.get(employeeNode.id) || null;

    const card = new OrgCard(employeeNode, {
      level: 0, // Level 0 for featured styling
      isRoot: false,
      isSelected: this.#state?.selectedNodeId === employeeNode.id,
      revenueData,
      onSelect: this.#props.onNodeSelect,
    });

    this.#cardMap.set(employeeNode.id, card);
    nodeWrapper.appendChild(card.element);

    // Render children if any
    if (hasChildren) {
      children.sort((a, b) => a.order - b.order);

      const verticalLine = createElement('div', { className: 'org-line-down' });
      nodeWrapper.appendChild(verticalLine);

      const childrenWrapper = createElement('div', { className: 'org-children-wrapper' });
      const horizontalLine = createElement('div', { className: 'org-line-horizontal' });
      childrenWrapper.appendChild(horizontalLine);

      const childrenContainer = createElement('div', { className: 'org-children' });

      children.forEach((child, index) => {
        const childNode = this.#renderChildNode(child, 2, index, children.length);
        childrenContainer.appendChild(childNode);
      });

      childrenWrapper.appendChild(childrenContainer);
      nodeWrapper.appendChild(childrenWrapper);
    }

    return nodeWrapper;
  }

  #renderNode(node, level, isRoot = false) {
    const children = this.#tree.getChildren(node.id);
    const hasChildren = children && children.length > 0;

    console.log(`Rendering node: ${node.name}, level: ${level}, children: ${children?.length || 0}`);

    // Create the node wrapper
    const nodeWrapper = createElement('div', {
      className: `org-node ${hasChildren ? 'has-children' : ''}`,
      dataset: { nodeId: node.id, level: String(level) },
    });

    // Create card
    const revenueData = this.#props.revenueDataMap.get(node.id) || null;
    console.log(`    Card for ${node.name}: revenueData =`, JSON.stringify(revenueData));

    const card = new OrgCard(node, {
      level,
      isRoot,
      isSelected: this.#state?.selectedNodeId === node.id,
      revenueData,
      onSelect: this.#props.onNodeSelect,
    });

    this.#cardMap.set(node.id, card);
    nodeWrapper.appendChild(card.element);

    // Render children if any
    if (hasChildren) {
      console.log(`  → Rendering ${children.length} children for ${node.name}`);
      children.sort((a, b) => a.order - b.order);

      // Add vertical connector line down from this node
      const verticalLine = createElement('div', { className: 'org-line-down' });
      nodeWrapper.appendChild(verticalLine);

      // Create children wrapper with horizontal line
      const childrenWrapper = createElement('div', {
        className: 'org-children-wrapper',
      });

      // Horizontal connector line
      const horizontalLine = createElement('div', { className: 'org-line-horizontal' });
      childrenWrapper.appendChild(horizontalLine);

      // Children container
      const childrenContainer = createElement('div', {
        className: 'org-children',
      });

      children.forEach((child, index) => {
        console.log(`     Child ${index}: ${child.name}`);
        const childNode = this.#renderChildNode(child, level + 1, index, children.length);
        childrenContainer.appendChild(childNode);
      });

      childrenWrapper.appendChild(childrenContainer);
      nodeWrapper.appendChild(childrenWrapper);
    }

    return nodeWrapper;
  }

  #renderChildNode(node, level, index, totalSiblings) {
    const children = this.#tree.getChildren(node.id);
    const hasChildren = children && children.length > 0;
    const isFirst = index === 0;
    const isLast = index === totalSiblings - 1;
    const isOnly = totalSiblings === 1;

    // Create child wrapper
    const childWrapper = createElement('div', {
      className: `org-child ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''} ${isOnly ? 'only' : ''} ${hasChildren ? 'has-children' : ''}`,
      dataset: { nodeId: node.id, level: String(level) },
    });

    // Vertical line up to horizontal connector
    const lineUp = createElement('div', { className: 'org-line-up' });
    childWrapper.appendChild(lineUp);

    // Create card
    const card = new OrgCard(node, {
      level,
      isRoot: false,
      isSelected: this.#state?.selectedNodeId === node.id,
      revenueData: this.#props.revenueDataMap.get(node.id) || null,
      onSelect: this.#props.onNodeSelect,
    });

    this.#cardMap.set(node.id, card);
    childWrapper.appendChild(card.element);

    // Recursively render grandchildren
    if (hasChildren) {
      children.sort((a, b) => a.order - b.order);

      const verticalLine = createElement('div', { className: 'org-line-down' });
      childWrapper.appendChild(verticalLine);

      const childrenWrapper = createElement('div', {
        className: 'org-children-wrapper',
      });

      const horizontalLine = createElement('div', { className: 'org-line-horizontal' });
      childrenWrapper.appendChild(horizontalLine);

      const childrenContainer = createElement('div', {
        className: 'org-children',
      });

      children.forEach((grandchild, idx) => {
        const grandchildNode = this.#renderChildNode(grandchild, level + 1, idx, children.length);
        childrenContainer.appendChild(grandchildNode);
      });

      childrenWrapper.appendChild(childrenContainer);
      childWrapper.appendChild(childrenWrapper);
    }

    return childWrapper;
  }

  #renderEmptyState() {
    // Just show loading spinner - tree will load momentarily
    clearElement(this.#container);

    const loadingState = createElement('div', {
      className: 'org-loading-state',
      style: 'display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 1rem;'
    }, [
      createElement('div', { className: 'loading-spinner' }),
      createElement('p', { style: 'color: #64748b; font-size: 0.9375rem;' }, ['Wird geladen...']),
    ]);

    this.#container.appendChild(loadingState);
  }

#centerOnRootCard() {
    if (!this.#element || !this.#tree || !this.#tree.root) return;

    // Find the root card element in the DOM
    const rootCardWrapper = this.#element.querySelector(`[data-node-id="${this.#tree.root.id}"]`);
    if (!rootCardWrapper) return;

    // Get the scrollable container
    const scrollContainer = this.#element;

    // Calculate center position
    const cardRect = rootCardWrapper.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    // Calculate scroll position to center the card
    const scrollLeft =
      rootCardWrapper.offsetLeft -
      (containerRect.width / 2) +
      (cardRect.width / 2);

    // Scroll to center (instant to avoid jump)
    scrollContainer.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'auto',
    });

    console.log('✓ Centered on root card');
  }

  #checkScrollHint(viewElement) {
    if (!viewElement) return;

    const checkScroll = () => {
      const isScrollable = viewElement.scrollWidth > viewElement.clientWidth;
      const isAtEnd = viewElement.scrollLeft >= viewElement.scrollWidth - viewElement.clientWidth - 10;

      if (isScrollable && !isAtEnd) {
        viewElement.setAttribute('data-scroll-hint', 'true');
      } else {
        viewElement.removeAttribute('data-scroll-hint');
      }
    };

    // Check initially
    checkScroll();

    // Check on scroll
    viewElement.addEventListener('scroll', checkScroll);

    // Check on resize
    window.addEventListener('resize', checkScroll);

    // Re-check after tree renders
    setTimeout(checkScroll, 500);
  }

  get element() {
    return this.#element;
  }

  setTree(tree) {
    this.#tree = tree;
    this.#renderOrganigramm();
  }

  setState(state) {
    this.#state = state;
  }

  setRevenueDataMap(revenueDataMap) {
    this.#props.revenueDataMap = revenueDataMap || new Map();
    // Trigger re-render to show updated revenue values
    this.refresh();
  }

  refresh() {
    this.#renderOrganigramm();
    // Re-check scroll hint after refresh
    setTimeout(() => this.#checkScrollHint(this.#element), 100);
  }

  updateNodeSelection(nodeId) {
    for (const [id, card] of this.#cardMap) {
      card.setSelected(id === nodeId);
    }
  }

  scrollToNode(nodeId) {
    const card = this.#cardMap.get(nodeId);
    if (card) {
      card.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Check if a node exists (tree or Geschäftsführer)
  hasNode(nodeId) {
    if (this.#geschaeftsfuehrerNodes.has(nodeId)) {
      return true;
    }
    return this.#tree && this.#tree.hasNode(nodeId);
  }

  // Get a node by ID (tree or Geschäftsführer)
  getNode(nodeId) {
    if (this.#geschaeftsfuehrerNodes.has(nodeId)) {
      return this.#geschaeftsfuehrerNodes.get(nodeId);
    }
    return this.#tree ? this.#tree.getNode(nodeId) : null;
  }
}
