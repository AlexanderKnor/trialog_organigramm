/**
 * Organism: KnowledgeBoardPanel
 * The knowledge board: partner and product information, searchable, grouped by
 * category, with a curated link tree alongside.
 *
 * SECURITY NOTE — read before changing the admin handling here.
 * This panel lives inside the shared entry point, not behind an admin route, so
 * unlike every other management surface in this app it cannot lean on a route
 * guard. The isAdmin checks below only hide affordances; they are cosmetic. The
 * real and only enforcement is firestore.rules, which grants write on
 * knowledge_board to admins alone. A non-admin calling knowledgeService.createEntry
 * from the console is refused by Firestore, not by this file. Do not "simplify"
 * those rules on the assumption that a guard exists here.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { authService } from '../../../../../core/auth/index.js';
import { Logger } from '../../../../../core/utils/logger.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { KnowledgeSearchService } from '../../../domain/services/KnowledgeSearchService.js';
import { KnowledgeEntryCard } from '../molecules/KnowledgeEntryCard.js';
import { KnowledgeSearchField } from '../molecules/KnowledgeSearchField.js';
import { KnowledgeCategoryEditor } from '../molecules/KnowledgeCategoryEditor.js';
import { KnowledgeEntryEditor } from '../molecules/KnowledgeEntryEditor.js';
import { LinkTreeNodeEditor } from '../molecules/LinkTreeNodeEditor.js';
import { LinkTreePanel } from './LinkTreePanel.js';

/** Matches the fade-out the shared dialog CSS runs before removal. */
const DIALOG_CLOSE_MS = 200;

export class KnowledgeBoardPanel {
  #knowledgeService;
  #element;
  #contentHost;
  #treeHost;
  #searchField;
  #treePanel = null;
  #categories = [];
  #entries = [];
  #linkTree = null;
  #query = '';
  #isAdmin = false;
  #loadFailed = false;

  constructor({ knowledgeService }) {
    this.#knowledgeService = knowledgeService;
  }

  async initialize() {
    this.#isAdmin = authService.isAdmin();

    await this.#loadAll();
    this.#element = this.#render();
  }

  async #loadAll() {
    try {
      const [categories, entries, linkTree] = await Promise.all([
        this.#knowledgeService.getAllCategories(),
        this.#knowledgeService.getAllEntries(),
        this.#knowledgeService.getLinkTree(),
      ]);

      this.#categories = categories;
      this.#entries = entries;
      this.#linkTree = linkTree;
      this.#loadFailed = false;
    } catch (error) {
      // A denied read looks exactly like an empty board, so say so explicitly
      // rather than rendering a convincing lie.
      Logger.error('Failed to load knowledge board:', error);
      this.#loadFailed = true;
    }
  }

  #render() {
    this.#contentHost = createElement('div', { className: 'kb-content' });
    this.#treeHost = createElement('div', { className: 'kb-tree-column' });

    this.#renderContent();
    this.#renderTree();

    return createElement('div', { className: 'kb-board' }, [
      this.#createToolbar(),
      createElement('div', { className: 'kb-body' }, [this.#treeHost, this.#contentHost]),
    ]);
  }

  #createToolbar() {
    this.#searchField = new KnowledgeSearchField({
      onSearch: (query) => {
        this.#query = query;
        this.#renderContent();
      },
    });

    const children = [this.#searchField.element];

    if (this.#isAdmin) {
      children.push(
        createElement('div', { className: 'kb-toolbar-actions' }, [
          new Button({
            label: 'Kategorie',
            variant: 'outline',
            size: 'sm',
            icon: new Icon({ name: 'folderPlus', size: 15 }).element,
            onClick: () => this.#showCategoryDialog(null),
          }).element,
          new Button({
            label: 'Eintrag',
            variant: 'primary',
            size: 'sm',
            icon: new Icon({ name: 'plus', size: 15 }).element,
            onClick: () => this.#showEntryDialog(null),
          }).element,
        ])
      );
    }

    return createElement('div', { className: 'kb-toolbar' }, children);
  }

  #renderTree() {
    this.#treePanel = new LinkTreePanel({
      linkTree: this.#linkTree,
      isAdmin: this.#isAdmin,
      onAdd: (parentId) => this.#showNodeDialog(null, parentId),
      onEdit: (node) => this.#showNodeDialog(node, null),
      onRemove: (node) => this.#removeNode(node),
      onMove: (node, direction) => this.#moveNode(node, direction),
    });

    this.#treeHost.replaceChildren(this.#treePanel.element);
  }

  #renderContent() {
    if (this.#loadFailed) {
      this.#contentHost.replaceChildren(
        this.#createState({
          icon: 'alertCircle',
          title: 'Knowledgeboard konnte nicht geladen werden',
          message: 'Die Inhalte sind derzeit nicht abrufbar. Bitte laden Sie die Seite neu.',
        })
      );
      return;
    }

    if (this.#categories.length === 0) {
      this.#contentHost.replaceChildren(
        this.#createState({
          icon: 'folder',
          title: 'Noch keine Einträge vorhanden',
          message: this.#isAdmin
            ? 'Legen Sie eine erste Kategorie an, um Produktinformationen zu hinterlegen.'
            : 'Sobald Produktinformationen hinterlegt sind, erscheinen sie hier.',
        })
      );
      return;
    }

    const matches = KnowledgeSearchService.search(this.#entries, this.#query);

    if (matches.length === 0 && this.#query) {
      this.#contentHost.replaceChildren(
        this.#createState({
          icon: 'search',
          title: 'Keine Treffer',
          message: `Für „${this.#query}" wurde nichts gefunden.`,
        })
      );
      return;
    }

    const sections = this.#categories
      .map((category) => this.#createCategorySection(category, matches))
      .filter(Boolean);

    this.#contentHost.replaceChildren(...sections);
  }

  /**
   * While searching, a category with no hits is dropped entirely — an empty
   * heading is noise. Unfiltered, every category shows so admins can see where
   * content is still missing.
   */
  #createCategorySection(category, matches) {
    const entries = matches.filter((entry) => entry.categoryType === category.type);

    if (entries.length === 0 && this.#query) {
      return null;
    }

    const children = [this.#createCategoryHeader(category, entries.length)];

    if (entries.length === 0) {
      children.push(
        createElement('p', { className: 'kb-category-empty' }, ['Noch keine Einträge.'])
      );
    } else {
      children.push(
        createElement(
          'div',
          { className: 'kb-entries' },
          entries.map(
            (entry) =>
              new KnowledgeEntryCard({
                entry,
                isAdmin: this.#isAdmin,
                onEdit: (target) => this.#showEntryDialog(target),
                onDelete: (target) => this.#deleteEntry(target),
                onMarkReviewed: (target) => this.#markReviewed(target),
              }).element
          )
        )
      );
    }

    return createElement('section', { className: 'kb-category' }, children);
  }

  #createCategoryHeader(category, count) {
    const heading = createElement('div', { className: 'kb-category-heading' }, [
      new Icon({ name: category.icon || 'folder', size: 18 }).element,
      createElement('h2', { className: 'kb-category-title' }, [category.displayName]),
      createElement('span', { className: 'kb-category-count' }, [String(count)]),
    ]);

    const children = [heading];

    if (this.#isAdmin) {
      children.push(
        createElement('div', { className: 'kb-category-actions' }, [
          this.#createIconButton({
            icon: 'edit',
            label: `Kategorie ${category.displayName} bearbeiten`,
            onClick: () => this.#showCategoryDialog(category),
          }),
          this.#createIconButton({
            icon: 'delete',
            label: `Kategorie ${category.displayName} löschen`,
            className: 'kb-category-action-danger',
            onClick: () => this.#deleteCategory(category),
          }),
        ])
      );
    }

    return createElement('div', { className: 'kb-category-header' }, children);
  }

  #createIconButton({ icon, label, onClick, className = '' }) {
    return createElement(
      'button',
      {
        className: `kb-category-action ${className}`.trim(),
        type: 'button',
        title: label,
        'aria-label': label,
        onclick: onClick,
      },
      [new Icon({ name: icon, size: 15 }).element]
    );
  }

  #createState({ icon, title, message }) {
    return createElement('div', { className: 'kb-state', role: 'status' }, [
      createElement('span', { className: 'kb-state-icon' }, [new Icon({ name: icon, size: 32 }).element]),
      createElement('h3', { className: 'kb-state-title' }, [title]),
      createElement('p', { className: 'kb-state-message' }, [message]),
    ]);
  }

  // ========================================
  // DIALOGS
  // ========================================

  /**
   * The app's dialog recipe, plus the ARIA it has always been missing. A full
   * focus trap belongs in a shared Dialog component rather than a tenth copy of
   * this block, so Escape and the labelling are as far as this goes.
   */
  #openDialog({ title, editor, wide = false }) {
    const titleId = 'kb-dialog-title';
    const overlay = createElement('div', {
      className: 'dialog-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    });

    const close = () => this.#closeDialog(overlay, onKeydown);

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    // portal-dialog-wide, NOT dialog-wide: the latter is AddRevenueDialog-specific
    // (overflow: visible, expects an inner .dialog-body-scroll) and leaves this
    // editor unscrollable when it grows past the viewport.
    const content = createElement(
      'div',
      { className: `dialog-content ${wide ? 'portal-dialog-wide' : ''}`.trim() },
      [createElement('h2', { className: 'dialog-title', id: titleId }, [title]), editor.element]
    );

    overlay.appendChild(content);
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    editor.focus();

    return close;
  }

  #closeDialog(overlay, onKeydown) {
    document.removeEventListener('keydown', onKeydown);
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), DIALOG_CLOSE_MS);
  }

  #showCategoryDialog(category) {
    let close;

    const editor = new KnowledgeCategoryEditor(category, {
      onSave: async (data) => {
        await this.#runWrite(async () => {
          if (category) {
            await this.#knowledgeService.updateCategory(category.type, data);
          } else {
            await this.#knowledgeService.createCategory(data);
          }
        });
        close();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: category ? 'Kategorie bearbeiten' : 'Neue Kategorie',
      editor,
    });
  }

  #showEntryDialog(entry) {
    if (this.#categories.length === 0) {
      alert('Bitte legen Sie zuerst eine Kategorie an.');
      return;
    }

    let close;

    const editor = new KnowledgeEntryEditor(entry, {
      categories: this.#categories,
      defaultCategoryType: this.#categories[0].type,
      onSave: async (data) => {
        await this.#runWrite(async () => {
          if (entry) {
            await this.#knowledgeService.updateEntry(entry.id, data);
          } else {
            await this.#knowledgeService.createEntry(data);
          }
        });
        close();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: entry ? 'Eintrag bearbeiten' : 'Neuer Eintrag',
      editor,
      wide: true,
    });
  }

  #showNodeDialog(node, parentId) {
    let close;

    const editor = new LinkTreeNodeEditor(node, {
      onSave: async (data) => {
        await this.#runWrite(async () => {
          if (node) {
            await this.#knowledgeService.updateLinkTreeNode(node.id, data);
          } else {
            await this.#knowledgeService.addLinkTreeNode(parentId, data);
          }
        });
        close();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: node ? 'Wegweiser-Eintrag bearbeiten' : 'Neuer Wegweiser-Eintrag',
      editor,
    });
  }

  // ========================================
  // WRITE ACTIONS
  // ========================================

  /**
   * Single catch site for the domain's typed exceptions. alert() follows the
   * house idiom; a toast component would be an improvement, but inventing one
   * inside this feature would leave the app with two error conventions.
   */
  async #runWrite(operation) {
    try {
      await operation();
      await this.#loadAll();
      this.#renderContent();
      this.#treePanel?.update(this.#linkTree);
      return true;
    } catch (error) {
      Logger.error('Knowledge board write failed:', error);
      alert(`Fehler:\n\n${error.message}`);
      return false;
    }
  }

  async #deleteEntry(entry) {
    if (!confirm(`Eintrag „${entry.title}" wirklich löschen?`)) {
      return;
    }

    await this.#runWrite(() => this.#knowledgeService.deleteEntry(entry.id));
  }

  async #deleteCategory(category) {
    const affected = this.#entries.filter((entry) => entry.categoryType === category.type).length;
    const suffix = affected > 0 ? `\n\n${affected} Eintrag/Einträge werden mitgelöscht.` : '';

    if (!confirm(`Kategorie „${category.displayName}" wirklich löschen?${suffix}`)) {
      return;
    }

    await this.#runWrite(() => this.#knowledgeService.deleteCategory(category.type));
  }

  async #markReviewed(entry) {
    await this.#runWrite(() => this.#knowledgeService.markEntryReviewed(entry.id));
  }

  async #removeNode(node) {
    const suffix = node.hasChildren ? '\n\nAlle Untereinträge werden mitgelöscht.' : '';

    if (!confirm(`„${node.label}" wirklich aus dem Wegweiser löschen?${suffix}`)) {
      return;
    }

    await this.#runWrite(() => this.#knowledgeService.removeLinkTreeNode(node.id));
  }

  async #moveNode(node, direction) {
    await this.#runWrite(() => this.#knowledgeService.moveLinkTreeNode(node.id, direction));
  }

  get element() {
    return this.#element;
  }

  destroy() {
    this.#searchField?.destroy();
    this.#element?.remove();
  }
}
