/**
 * Molecule: MoveEmployeeDialog
 * Dialog for moving an employee to a different parent in the hierarchy tree
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../atoms/Button.js';
import { Icon } from '../atoms/Icon.js';

export class MoveEmployeeDialog {
  #element;
  #props;
  #selectedTargetId;
  #confirmButton;
  #summaryContainer;
  #listContainer;

  constructor(props = {}) {
    this.#props = {
      node: props.node,
      tree: props.tree,
      currentParent: props.currentParent,
      onConfirm: props.onConfirm || null,
      onCancel: props.onCancel || null,
    };

    this.#selectedTargetId = null;
    this.#element = this.#render();
  }

  #render() {
    const overlay = createElement('div', {
      className: 'dialog-overlay move-employee-dialog-overlay',
    });

    const dialogContent = createElement('div', {
      className: 'dialog-content move-employee-dialog',
    });

    const header = this.#renderHeader();
    const body = this.#renderBody();
    const footer = this.#renderFooter();

    dialogContent.appendChild(header);
    dialogContent.appendChild(body);
    dialogContent.appendChild(footer);

    overlay.appendChild(dialogContent);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.#handleCancel();
      }
    });

    return overlay;
  }

  #renderHeader() {
    const parentName = this.#props.currentParent
      ? this.#props.currentParent.name
      : 'Unbekannt';

    return createElement('div', { className: 'dialog-header-fixed' }, [
      createElement('h2', { className: 'dialog-title' }, ['Mitarbeiter versetzen']),
      createElement('p', { className: 'dialog-subtitle' }, [
        `${this.#props.node.name} — aktuell unter: ${parentName}`,
      ]),
    ]);
  }

  #renderBody() {
    const body = createElement('div', { className: 'move-employee-body' });

    this.#listContainer = createElement('div', { className: 'move-target-list' });
    this.#renderTreeList();

    this.#summaryContainer = createElement('div', {
      className: 'move-confirmation-summary hidden',
    });

    body.appendChild(this.#listContainer);
    body.appendChild(this.#summaryContainer);

    return body;
  }

  #renderTreeList() {
    const { node, tree } = this.#props;

    // Collect IDs that should be disabled
    const disabledIds = new Set();

    // The node itself
    disabledIds.add(node.id);

    // All descendants of the node (prevents cycles)
    const descendants = tree.getDescendants(node.id);
    for (const descendant of descendants) {
      disabledIds.add(descendant.id);
    }

    // Current parent (would be a no-op)
    if (node.parentId) {
      disabledIds.add(node.parentId);
    }

    tree.traverse((treeNode, depth) => {
      const isDisabled = disabledIds.has(treeNode.id);
      const isCurrentParent = treeNode.id === node.parentId;
      const isSelf = treeNode.id === node.id;

      const item = createElement('div', {
        className: `move-target-item${isDisabled ? ' disabled' : ''}`,
        style: `padding-left: ${depth * 20 + 12}px`,
      });

      const icon = new Icon({ name: 'user', size: 16 });
      const nameSpan = createElement('span', { className: 'move-target-name' }, [
        treeNode.name,
      ]);

      item.appendChild(icon.element);
      item.appendChild(nameSpan);

      // Show type badge for special cases
      if (isSelf) {
        item.appendChild(
          createElement('span', { className: 'move-target-badge' }, ['(selbst)']),
        );
      } else if (isCurrentParent) {
        item.appendChild(
          createElement('span', { className: 'move-target-badge' }, ['(aktuell)']),
        );
      } else if (treeNode.id === tree.rootId) {
        item.appendChild(
          createElement('span', { className: 'move-target-badge' }, ['(Unternehmen)']),
        );
      }

      if (!isDisabled) {
        item.addEventListener('click', () => this.#selectTarget(treeNode.id, item));
      }

      this.#listContainer.appendChild(item);
    });
  }

  #selectTarget(targetId, itemElement) {
    // Deselect previous
    const previousSelected = this.#listContainer.querySelector('.move-target-item.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }

    // Select new
    this.#selectedTargetId = targetId;
    itemElement.classList.add('selected');

    // Enable confirm button
    this.#confirmButton.element.disabled = false;

    // Update summary
    this.#updateSummary(targetId);
  }

  #updateSummary(targetId) {
    const { tree, currentParent } = this.#props;
    const targetNode = tree.getNode(targetId);

    const fromName = currentParent ? currentParent.name : 'Unbekannt';
    const toName = targetNode.name;

    this.#summaryContainer.innerHTML = '';
    this.#summaryContainer.classList.remove('hidden');

    this.#summaryContainer.appendChild(
      createElement('div', { className: 'move-summary-content' }, [
        createElement('span', { className: 'move-summary-label' }, ['Von:']),
        createElement('span', { className: 'move-summary-value' }, [fromName]),
        createElement('span', { className: 'move-summary-arrow' }, ['\u2192']),
        createElement('span', { className: 'move-summary-label' }, ['Zu:']),
        createElement('span', { className: 'move-summary-value' }, [toName]),
      ]),
    );
  }

  #renderFooter() {
    const footer = createElement('div', { className: 'move-employee-actions' });

    const cancelButton = new Button({
      label: 'Abbrechen',
      variant: 'ghost',
      onClick: () => this.#handleCancel(),
    });

    this.#confirmButton = new Button({
      label: 'Versetzen',
      variant: 'primary',
      onClick: () => this.#handleConfirm(),
    });

    // Disabled until a target is selected
    this.#confirmButton.element.disabled = true;

    footer.appendChild(cancelButton.element);
    footer.appendChild(this.#confirmButton.element);

    return footer;
  }

  #handleConfirm() {
    if (!this.#selectedTargetId) return;

    if (this.#props.onConfirm) {
      this.#props.onConfirm(this.#selectedTargetId);
    }

    this.hide();
  }

  #handleCancel() {
    if (this.#props.onCancel) {
      this.#props.onCancel();
    }

    this.hide();
  }

  show() {
    document.body.appendChild(this.#element);

    requestAnimationFrame(() => {
      this.#element.classList.add('visible');
    });
  }

  hide() {
    this.#element.classList.remove('visible');

    setTimeout(() => {
      if (this.#element.parentNode) {
        this.#element.parentNode.removeChild(this.#element);
      }
    }, 300);
  }

  get element() {
    return this.#element;
  }
}
