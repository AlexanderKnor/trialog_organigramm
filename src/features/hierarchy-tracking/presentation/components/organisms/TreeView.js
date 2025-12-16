/**
 * Organism: TreeView
 * Complete tree view with nodes and interactions
 */

import { createElement, clearElement } from '../../../../../core/utils/index.js';
import { TreeNodeItem } from '../molecules/TreeNodeItem.js';
import { Icon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';

export class TreeView {
  #element;
  #container;
  #tree;
  #state;
  #nodeItems;
  #props;

  constructor(props = {}) {
    this.#tree = props.tree || null;
    this.#state = props.state || null;
    this.#nodeItems = new Map();
    this.#props = {
      onNodeSelect: props.onNodeSelect || null,
      onNodeToggle: props.onNodeToggle || null,
      onNodeEdit: props.onNodeEdit || null,
      onNodeDelete: props.onNodeDelete || null,
      onNodeMove: props.onNodeMove || null,
      onAddNode: props.onAddNode || null,
      className: props.className || '',
    };

    this.#element = this.#render();
  }

  #render() {
    this.#container = createElement('div', {
      className: 'tree-view-container',
    });

    if (this.#tree) {
      this.#renderNodes();
    } else {
      this.#renderEmptyState();
    }

    return createElement('div', {
      className: `tree-view ${this.#props.className}`,
    }, [this.#container]);
  }

  #renderNodes() {
    clearElement(this.#container);
    this.#nodeItems.clear();

    if (!this.#tree || !this.#tree.root) {
      this.#renderEmptyState();
      return;
    }

    const rootItem = this.#createNodeItem(this.#tree.root, 0);
    this.#container.appendChild(rootItem.element);
    this.#renderChildNodes(this.#tree.root, rootItem, 1);
  }

  #renderChildNodes(parentNode, parentItem, depth) {
    const children = this.#tree.getChildren(parentNode.id);
    children.sort((a, b) => a.order - b.order);

    for (const child of children) {
      const childItem = this.#createNodeItem(child, depth);
      parentItem.appendChild(childItem.element);
      this.#renderChildNodes(child, childItem, depth + 1);
    }
  }

  #createNodeItem(node, depth) {
    const isExpanded = this.#state?.isNodeExpanded(node.id) ?? true;
    const isSelected = this.#state?.selectedNodeId === node.id;
    const isVisible = this.#state?.isNodeVisible(node.id) ?? true;

    const item = new TreeNodeItem(node, {
      depth,
      isExpanded,
      isSelected,
      isVisible,
      onSelect: this.#props.onNodeSelect,
      onToggle: this.#props.onNodeToggle,
      onEdit: this.#props.onNodeEdit,
      onDelete: this.#props.onNodeDelete,
      onDragStart: (nodeId, e) => {
        if (this.#state) {
          this.#state.startDrag(nodeId);
        }
      },
      onDragOver: (nodeId, e) => {
        if (this.#state) {
          this.#state.setDropTarget(nodeId);
        }
      },
      onDrop: (draggedNodeId, targetNodeId, e) => {
        if (this.#props.onNodeMove) {
          this.#props.onNodeMove(draggedNodeId, targetNodeId);
        }
        if (this.#state) {
          this.#state.endDrag();
        }
      },
    });

    this.#nodeItems.set(node.id, item);
    return item;
  }

  #renderEmptyState() {
    clearElement(this.#container);

    // Create large icon for empty state
    const emptyIcon = new Icon({
      name: 'sitemap',
      size: 80,
      color: 'var(--color-gray-300)',
    });

    // Create call-to-action button
    const createButton = new Button({
      label: 'Strukturplan erstellen',
      variant: 'primary',
      size: 'lg',
      icon: new Icon({ name: 'plus', size: 18 }),
      onClick: () => {
        if (this.#props.onAddNode) {
          this.#props.onAddNode();
        }
      },
    });

    const emptyState = createElement('div', {
      className: 'tree-empty-state',
    }, [
      createElement('div', { className: 'empty-icon' }, [emptyIcon.element]),
      createElement('h2', { className: 'empty-message' }, [
        'Keine Hierarchie vorhanden',
      ]),
      createElement('p', { className: 'empty-hint' }, [
        'Erstellen Sie einen neuen Strukturplan, um Ihre Organisationsstruktur zu visualisieren.',
      ]),
      createElement('div', { className: 'empty-action' }, [createButton.element]),
    ]);

    this.#container.appendChild(emptyState);
  }

  get element() {
    return this.#element;
  }

  setTree(tree) {
    this.#tree = tree;
    this.#renderNodes();
  }

  setState(state) {
    this.#state = state;
  }

  refresh() {
    this.#renderNodes();
  }

  updateNodeSelection(nodeId) {
    for (const [id, item] of this.#nodeItems) {
      item.setSelected(id === nodeId);
    }
  }

  updateNodeExpansion(nodeId, isExpanded) {
    const item = this.#nodeItems.get(nodeId);
    if (item) {
      item.setExpanded(isExpanded);
    }
  }

  updateNodeVisibility() {
    if (!this.#state) return;

    for (const [nodeId, item] of this.#nodeItems) {
      item.setVisible(this.#state.isNodeVisible(nodeId));
    }
  }

  scrollToNode(nodeId) {
    const item = this.#nodeItems.get(nodeId);
    if (item) {
      item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
