/**
 * Organism: LinkTreePanel
 * The curated path from a broad heading down to a destination.
 *
 * Reordering uses up/down buttons rather than drag and drop: keyboard-operable
 * by construction, and a fraction of the code for the same result.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';

export class LinkTreePanel {
  #props;
  #element;
  #listHost;
  #expanded = new Set();

  constructor(props = {}) {
    this.#props = {
      linkTree: props.linkTree,
      isAdmin: props.isAdmin || false,
      onAdd: props.onAdd || null,
      onEdit: props.onEdit || null,
      onRemove: props.onRemove || null,
      onMove: props.onMove || null,
    };

    // Top level starts open; anything deeper is opt-in, which is the point of
    // having a tree rather than a list.
    this.#props.linkTree.nodes.forEach((node) => this.#expanded.add(node.id));

    this.#element = this.#render();
  }

  #render() {
    this.#listHost = createElement('div', { className: 'kb-tree-host' }, [this.#createTree()]);

    return createElement('aside', { className: 'kb-tree', 'aria-labelledby': 'kb-tree-heading' }, [
      this.#createHeader(),
      this.#listHost,
    ]);
  }

  #createHeader() {
    const children = [
      createElement('h2', { className: 'kb-tree-title', id: 'kb-tree-heading' }, ['Wegweiser']),
    ];

    if (this.#props.isAdmin) {
      children.push(
        createElement(
          'button',
          {
            className: 'kb-tree-add',
            type: 'button',
            title: 'Eintrag hinzufügen',
            'aria-label': 'Eintrag zum Wegweiser hinzufügen',
            onclick: () => this.#props.onAdd?.(null),
          },
          [new Icon({ name: 'plus', size: 16 }).element]
        )
      );
    }

    return createElement('div', { className: 'kb-tree-header' }, children);
  }

  #createTree() {
    if (this.#props.linkTree.isEmpty) {
      return createElement('p', { className: 'kb-tree-empty' }, [
        this.#props.isAdmin
          ? 'Noch keine Einträge. Legen Sie den ersten an.'
          : 'Noch keine Einträge vorhanden.',
      ]);
    }

    return createElement(
      'ul',
      { className: 'kb-tree-list', role: 'tree', 'aria-label': 'Wegweiser' },
      this.#props.linkTree.nodes.map((node, index) =>
        this.#createNode(node, index, this.#props.linkTree.nodes.length)
      )
    );
  }

  #createNode(node, index, siblingCount) {
    const isExpanded = this.#expanded.has(node.id);
    const rowChildren = [];

    if (node.hasChildren) {
      rowChildren.push(this.#createToggle(node, isExpanded));
    } else {
      rowChildren.push(createElement('span', { className: 'kb-tree-toggle-spacer' }));
    }

    rowChildren.push(node.link ? this.#createLink(node) : this.#createLabel(node));

    if (this.#props.isAdmin) {
      rowChildren.push(this.#createNodeActions(node, index, siblingCount));
    }

    const children = [createElement('div', { className: 'kb-tree-row' }, rowChildren)];

    if (node.hasChildren && isExpanded) {
      children.push(
        createElement(
          'ul',
          { className: 'kb-tree-children', role: 'group' },
          node.children.map((child, childIndex) =>
            this.#createNode(child, childIndex, node.children.length)
          )
        )
      );
    }

    const attributes = {
      className: 'kb-tree-item',
      role: 'treeitem',
    };

    if (node.hasChildren) {
      attributes['aria-expanded'] = String(isExpanded);
    }

    return createElement('li', attributes, children);
  }

  #createToggle(node, isExpanded) {
    return createElement(
      'button',
      {
        className: 'kb-tree-toggle',
        type: 'button',
        'aria-label': isExpanded ? `${node.label} zuklappen` : `${node.label} aufklappen`,
        onclick: () => this.#toggle(node.id),
      },
      [new Icon({ name: isExpanded ? 'chevronDown' : 'chevronRight', size: 14 }).element]
    );
  }

  #createLabel(node) {
    const children = [];

    if (node.icon) {
      children.push(new Icon({ name: node.icon, size: 14 }).element);
    }

    children.push(createElement('span', {}, [node.label]));

    return createElement('span', { className: 'kb-tree-label' }, children);
  }

  #createLink(node) {
    const link = node.link;
    const attributes = { className: 'kb-tree-link', href: link.url };

    if (link.isExternal) {
      attributes.target = '_blank';
      attributes.rel = 'noopener noreferrer';
    }

    return createElement('a', attributes, [
      createElement('span', {}, [node.label]),
      new Icon({ name: link.isExternal ? 'externalLink' : 'link', size: 12 }).element,
    ]);
  }

  #createNodeActions(node, index, siblingCount) {
    return createElement('div', { className: 'kb-tree-actions' }, [
      this.#createNodeAction({
        icon: 'arrowUp',
        label: `${node.label} nach oben`,
        disabled: index === 0,
        onClick: () => this.#props.onMove?.(node, 'up'),
      }),
      this.#createNodeAction({
        icon: 'arrowDown',
        label: `${node.label} nach unten`,
        disabled: index === siblingCount - 1,
        onClick: () => this.#props.onMove?.(node, 'down'),
      }),
      this.#createNodeAction({
        icon: 'plus',
        label: `Untereintrag zu ${node.label}`,
        onClick: () => this.#props.onAdd?.(node.id),
      }),
      this.#createNodeAction({
        icon: 'edit',
        label: `${node.label} bearbeiten`,
        onClick: () => this.#props.onEdit?.(node),
      }),
      this.#createNodeAction({
        icon: 'delete',
        label: `${node.label} löschen`,
        className: 'kb-tree-action-danger',
        onClick: () => this.#props.onRemove?.(node),
      }),
    ]);
  }

  #createNodeAction({ icon, label, onClick, disabled = false, className = '' }) {
    return createElement(
      'button',
      {
        className: `kb-tree-action ${className}`.trim(),
        type: 'button',
        title: label,
        'aria-label': label,
        disabled,
        onclick: onClick,
      },
      [new Icon({ name: icon, size: 13 }).element]
    );
  }

  #toggle(nodeId) {
    if (this.#expanded.has(nodeId)) {
      this.#expanded.delete(nodeId);
    } else {
      this.#expanded.add(nodeId);
    }

    this.#refresh();
  }

  #refresh() {
    this.#listHost.replaceChildren(this.#createTree());
  }

  /** Re-renders against a new tree while keeping what the user had open. */
  update(linkTree) {
    this.#props.linkTree = linkTree;
    this.#refresh();
  }

  get element() {
    return this.#element;
  }
}
