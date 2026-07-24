/**
 * Organism: ArticleComposer
 * The full-screen writing desk for knowledge base articles.
 *
 * A dialog was the wrong shape for this work: writing a guide is a task with
 * its own screen, not a form filled in over the library. The composer takes the
 * viewport, keeps the document column at reading width, moves everything that
 * is metadata into a side rail, and can switch to the exact reader view the
 * team will see — the same renderer, not a lookalike.
 *
 * State is plain draft objects, deliberately not entities: a block being
 * written is usually invalid (empty text, half-typed URL) and the domain must
 * never accept that. Drafts become ArticleBlocks at preview and at save.
 */

import { autoGrowTextarea, createElement } from '../../../../../core/utils/index.js';
import { Logger } from '../../../../../core/utils/logger.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { ArticleBlock } from '../../../domain/value-objects/ArticleBlock.js';
import {
  getAllArticleCategories,
  getArticleCategory,
} from '../../../domain/value-objects/ArticleCategory.js';
import { ArticleBlockEditor } from '../molecules/ArticleBlockEditor.js';
import { ArticleMetaRail } from '../molecules/ArticleMetaRail.js';
import { createBlockPalette } from '../molecules/BlockPalette.js';
import {
  BLOCK_PRESETS,
  describeBlockProblem,
  isBlankDraft,
  toBlockPayload,
} from '../molecules/blockPresets.js';
import { renderArticleDocument } from '../molecules/articleView.js';

const CLOSE_ANIMATION_MS = 200;
const MAX_BLOCKS = 40;
const MAX_TAGS = 15;

export class ArticleComposer {
  #article;
  #props;
  #state;
  #rail;
  #overlay = null;
  #onKeydown = null;
  #previousFocus = null;
  #inertRoot = null;
  #dirty = false;
  #sheet;
  #blockHost;
  #previewHost;
  #errorHost;
  #saveButton;
  #blockEditors = [];
  #insertIndex = null;

  /**
   * @param article  the KnowledgeArticle to edit, or null for a new one
   * @param onSave   async (data) => void; throwing keeps the composer open
   */
  constructor(article, { onSave = null } = {}) {
    this.#article = article;
    this.#props = { onSave };

    this.#state = {
      title: article?.title || '',
      summary: article?.summary || '',
      categoryType: article?.categoryType || getAllArticleCategories()[0].type,
      heroImageUrl: article?.heroImageUrl || '',
      tags: (article?.tags || []).join(', '),
      pinned: article?.pinned || false,
      // structuredClone: block payloads are frozen, the editor needs to mutate.
      blocks: (article?.blocks || []).map((block) => structuredClone(block.toJSON())),
    };

    if (this.#state.blocks.length === 0) {
      this.#state.blocks.push(BLOCK_PRESETS[0].draft());
    }
  }

  open() {
    this.#previousFocus = document.activeElement;
    this.#overlay = createElement('div', {
      className: 'kbcomp-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': this.#article ? 'Artikel bearbeiten' : 'Neuer Artikel',
    });

    this.#overlay.appendChild(
      createElement('div', { className: 'kbcomp' }, [
        this.#createBar(),
        this.#createErrorHost(),
        this.#createBody(),
      ])
    );

    // Escape is the way out of every overlay in the portal; here it must not
    // throw away written work without asking.
    this.#onKeydown = (event) => {
      if (event.key === 'Escape') {
        this.requestClose();
      }
    };

    document.addEventListener('keydown', this.#onKeydown);
    document.body.appendChild(this.#overlay);

    this.#inertRoot = document.querySelector('#app');
    if (this.#inertRoot) {
      this.#inertRoot.inert = true;
    }

    this.#renderBlocks();
    this.#sheet.querySelectorAll('textarea').forEach(autoGrowTextarea);

    requestAnimationFrame(() => this.#overlay?.classList.add('is-open'));
    this.#sheet.querySelector('.kbcomp-title-field')?.focus();
  }

  /* ====================================================================
     CHROME
     ==================================================================== */

  #createBar() {
    this.#saveButton = new Button({
      label: this.#article ? 'Speichern' : 'Artikel veröffentlichen',
      variant: 'primary',
      size: 'sm',
      icon: new Icon({ name: 'check', size: 15 }).element,
      onClick: () => this.#handleSave(),
    });

    const previewToggle = createElement(
      'button',
      {
        className: 'kbcomp-preview-toggle',
        type: 'button',
        'aria-pressed': 'false',
        onclick: (event) => this.#togglePreview(event.currentTarget),
      },
      [new Icon({ name: 'eye', size: 15 }).element, createElement('span', {}, ['Vorschau'])]
    );

    return createElement('header', { className: 'kbcomp-bar' }, [
      createElement('div', { className: 'kbcomp-bar-left' }, [
        createElement(
          'button',
          {
            className: 'kbcomp-close',
            type: 'button',
            'aria-label': 'Editor schließen',
            onclick: () => this.requestClose(),
          },
          [new Icon({ name: 'close', size: 18 }).element]
        ),
        createElement('div', { className: 'kbcomp-bar-text' }, [
          createElement('span', { className: 'kbcomp-eyebrow' }, ['Wissensdatenbank']),
          createElement('span', { className: 'kbcomp-bar-title' }, [
            this.#article ? 'Artikel bearbeiten' : 'Neuer Artikel',
          ]),
        ]),
      ]),
      createElement('div', { className: 'kbcomp-bar-actions' }, [
        previewToggle,
        new Button({
          label: 'Abbrechen',
          variant: 'ghost',
          size: 'sm',
          onClick: () => this.requestClose(),
        }).element,
        this.#saveButton.element,
      ]),
    ]);
  }

  #createErrorHost() {
    this.#errorHost = createElement('p', { className: 'kbcomp-error', role: 'alert', hidden: true });
    return this.#errorHost;
  }

  #createBody() {
    this.#blockHost = createElement('div', { className: 'kbcomp-blocks' });
    this.#previewHost = createElement('div', { className: 'kbcomp-preview', hidden: true });
    this.#rail = new ArticleMetaRail(this.#state, { onChange: () => this.#markDirty() });

    this.#sheet = createElement('div', { className: 'kbcomp-sheet' }, [
      this.#createTitleField(),
      this.#createSummaryField(),
      this.#blockHost,
    ]);

    return createElement('div', { className: 'kbcomp-body' }, [
      createElement('div', { className: 'kbcomp-canvas' }, [this.#sheet, this.#previewHost]),
      this.#rail.element,
    ]);
  }

  #createTitleField() {
    const field = createElement('textarea', {
      className: 'kbcomp-title-field',
      rows: 1,
      maxLength: 140,
      placeholder: 'Titel des Artikels',
      'aria-label': 'Titel des Artikels',
      oninput: (event) => {
        this.#state.title = event.target.value;
        autoGrowTextarea(event.target);
        this.#markDirty();
      },
    });
    field.value = this.#state.title;

    return field;
  }

  #createSummaryField() {
    const field = createElement('textarea', {
      className: 'kbcomp-summary-field',
      rows: 2,
      maxLength: 300,
      placeholder:
        'Kurzbeschreibung: ein bis zwei Sätze, die auf der Karte und über dem Artikel stehen.',
      'aria-label': 'Kurzbeschreibung',
      oninput: (event) => {
        this.#state.summary = event.target.value;
        autoGrowTextarea(event.target);
        this.#markDirty();
      },
    });
    field.value = this.#state.summary;

    return field;
  }

  /* ====================================================================
     BLOCKS
     ==================================================================== */

  #renderBlocks() {
    this.#blockEditors = [];

    const nodes = [];
    const paletteAtEnd =
      this.#insertIndex === null || this.#insertIndex >= this.#state.blocks.length;

    this.#state.blocks.forEach((draft, index) => {
      const editor = new ArticleBlockEditor(draft, {
        index,
        total: this.#state.blocks.length,
        onMove: (from, direction) => this.#moveBlock(from, direction),
        onRemove: (position) => this.#removeBlock(position),
        onDuplicate: (position) => this.#duplicateBlock(position),
        onInsertAfter: (position) => this.#openPaletteAt(position + 1),
        onDirty: () => this.#markDirty(),
      });

      this.#blockEditors.push(editor);
      nodes.push(editor.element);

      if (!paletteAtEnd && this.#insertIndex === index + 1) {
        nodes.push(this.#createPalette(true));
      }
    });

    if (paletteAtEnd) {
      nodes.push(this.#createPalette(false));
    }

    this.#blockHost.replaceChildren(...nodes);
    this.#blockEditors.forEach((editor) => editor.mounted());
    this.#rail.setBlockCount(this.#state.blocks.length, MAX_BLOCKS);
  }

  #createPalette(inline) {
    return createBlockPalette({
      inline,
      onPick: (preset) => this.#addBlock(preset),
      onCancel: () => this.#openPaletteAt(null),
    });
  }

  #openPaletteAt(index) {
    this.#insertIndex = index;
    this.#renderBlocks();

    if (index !== null) {
      this.#blockHost
        .querySelector('.kbcomp-palette.is-inline')
        ?.scrollIntoView({ block: 'nearest' });
    }
  }

  #addBlock(preset) {
    if (this.#state.blocks.length >= MAX_BLOCKS) {
      this.#showError(`Ein Artikel fasst höchstens ${MAX_BLOCKS} Blöcke.`);
      return;
    }

    const position = this.#insertIndex === null ? this.#state.blocks.length : this.#insertIndex;

    this.#state.blocks.splice(position, 0, preset.draft());
    this.#insertIndex = null;
    this.#markDirty();
    this.#renderBlocks();
    this.#blockEditors[position]?.focusFirstField();
  }

  #moveBlock(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= this.#state.blocks.length) {
      return;
    }

    [this.#state.blocks[index], this.#state.blocks[target]] = [
      this.#state.blocks[target],
      this.#state.blocks[index],
    ];
    this.#markDirty();
    this.#renderBlocks();
    this.#blockEditors[target]?.element.scrollIntoView({ block: 'nearest' });
    this.#blockEditors[target]?.focusTool(direction < 0 ? 'up' : 'down');
  }

  #duplicateBlock(index) {
    if (this.#state.blocks.length >= MAX_BLOCKS) {
      this.#showError(`Ein Artikel fasst höchstens ${MAX_BLOCKS} Blöcke.`);
      return;
    }

    this.#state.blocks.splice(index + 1, 0, structuredClone(this.#state.blocks[index]));
    this.#markDirty();
    this.#renderBlocks();
  }

  #removeBlock(index) {
    this.#state.blocks.splice(index, 1);

    if (this.#state.blocks.length === 0) {
      this.#state.blocks.push(BLOCK_PRESETS[0].draft());
    }

    this.#markDirty();
    this.#renderBlocks();
    this.#blockEditors[Math.min(index, this.#blockEditors.length - 1)]?.focusFirstField();
  }

  /* ====================================================================
     PREVIEW
     ==================================================================== */

  #togglePreview(toggle) {
    const active = this.#previewHost.hidden;

    if (active) {
      this.#previewHost.replaceChildren(this.#buildPreview());
    }

    this.#previewHost.hidden = !active;
    this.#sheet.hidden = active;
    toggle.classList.toggle('is-active', active);
    toggle.setAttribute('aria-pressed', String(active));
  }

  #buildPreview() {
    const blocks = [];

    this.#state.blocks.forEach((draft) => {
      if (isBlankDraft(draft) || describeBlockProblem(draft)) {
        return;
      }

      try {
        blocks.push(new ArticleBlock(toBlockPayload(draft)));
      } catch (error) {
        // A block the domain still refuses (an over-long text, say) is left out
        // of the preview; saving reports it properly instead of hiding it.
        Logger.warn('Block skipped in preview:', error);
      }
    });

    return renderArticleDocument({
      category: getArticleCategory(this.#state.categoryType),
      title: this.#state.title.trim() || 'Ohne Titel',
      summary: this.#state.summary.trim(),
      metaLine: 'Vorschau, noch nicht gespeichert',
      heroImageUrl: this.#state.heroImageUrl.trim(),
      blocks,
      tags: this.#parseTags(),
      pinned: this.#state.pinned,
    });
  }

  /* ====================================================================
     SAVE & CLOSE
     ==================================================================== */

  #parseTags() {
    return this.#state.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  /** German, field-level check before the entity sees the data. */
  #validate() {
    if (!this.#state.title.trim()) {
      return { message: 'Bitte geben Sie dem Artikel einen Titel.' };
    }

    if (this.#parseTags().length > MAX_TAGS) {
      return { message: `Bitte höchstens ${MAX_TAGS} Schlagwörter vergeben.` };
    }

    if (this.#state.blocks.every(isBlankDraft)) {
      return { message: 'Der Artikel braucht mindestens einen ausgefüllten Block.' };
    }

    for (let index = 0; index < this.#state.blocks.length; index += 1) {
      const draft = this.#state.blocks[index];
      const problem = isBlankDraft(draft) ? null : describeBlockProblem(draft);

      if (problem) {
        return { message: `Block ${index + 1}: ${problem}`, index };
      }
    }

    return null;
  }

  async #handleSave() {
    this.#errorHost.hidden = true;
    this.#blockEditors.forEach((editor) => editor.markInvalid(false));

    const problem = this.#validate();

    if (problem) {
      this.#showError(problem.message);

      if (problem.index !== undefined) {
        const editor = this.#blockEditors[problem.index];
        editor?.markInvalid(true);
        editor?.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }

      return;
    }

    const data = {
      title: this.#state.title.trim(),
      categoryType: this.#state.categoryType,
      summary: this.#state.summary.trim(),
      heroImageUrl: this.#state.heroImageUrl.trim(),
      blocks: this.#state.blocks.filter((draft) => !isBlankDraft(draft)).map(toBlockPayload),
      tags: this.#parseTags(),
      pinned: this.#state.pinned,
    };

    this.#setBusy(true);

    try {
      await this.#props.onSave?.(data);
      this.#dirty = false;
      this.close();
    } catch (error) {
      Logger.error('Failed to save article:', error);
      this.#showError('Der Artikel konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      this.#setBusy(false);
    }
  }

  #setBusy(isBusy) {
    this.#saveButton.element.disabled = isBusy;
    this.#saveButton.element.classList.toggle('is-busy', isBusy);
  }

  #showError(message) {
    this.#errorHost.textContent = message;
    this.#errorHost.hidden = false;
  }

  #markDirty() {
    this.#dirty = true;
  }

  requestClose() {
    if (this.#dirty && !window.confirm('Die Änderungen am Artikel verwerfen?')) {
      return;
    }

    this.close();
  }

  close() {
    if (!this.#overlay) {
      return;
    }

    const overlay = this.#overlay;
    this.#overlay = null;

    document.removeEventListener('keydown', this.#onKeydown);
    overlay.classList.remove('is-open');

    if (this.#inertRoot) {
      this.#inertRoot.inert = false;
      this.#inertRoot = null;
    }

    setTimeout(() => overlay.remove(), CLOSE_ANIMATION_MS);

    if (this.#previousFocus instanceof HTMLElement) {
      this.#previousFocus.focus();
    }
  }

  get isOpen() {
    return Boolean(this.#overlay);
  }
}
