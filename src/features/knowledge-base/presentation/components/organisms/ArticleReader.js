/**
 * Organism: ArticleReader
 * Full-screen editorial reading view for one article, shown as an overlay
 * (the reader is transient, not a route — closing it returns to the exact
 * scroll position and filter state of the library).
 *
 * The article itself is rendered by articleView, the same renderer the composer
 * previews with, so authors and readers never see two different articles.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getArticleCategory } from '../../../domain/value-objects/ArticleCategory.js';
import { renderArticleDocument } from '../molecules/articleView.js';

const CLOSE_ANIMATION_MS = 200;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export class ArticleReader {
  #overlay;
  #onKeydown;
  #previousFocus;
  #inertRoot;

  /**
   * @param article       the KnowledgeArticle to display
   * @param isAdmin       show edit/delete affordances (cosmetic only; rules enforce)
   * @param onEdit/onDelete/onClose  callbacks into the owning panel
   */
  open(article, { isAdmin = false, onEdit = null, onDelete = null, onClose = null } = {}) {
    this.#previousFocus = document.activeElement;

    const titleId = 'kbase-reader-title';

    this.#overlay = createElement('div', {
      className: 'kbase-reader-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      onclick: (event) => {
        if (event.target === this.#overlay) {
          this.close(onClose);
        }
      },
    });

    this.#onKeydown = (event) => {
      if (event.key === 'Escape') {
        this.close(onClose);
      }
    };

    const closeButton = createElement(
      'button',
      {
        className: 'kbase-reader-close',
        type: 'button',
        'aria-label': 'Artikel schließen',
        onclick: () => this.close(onClose),
      },
      [new Icon({ name: 'close', size: 18 }).element]
    );

    const document_ = renderArticleDocument({
      titleId,
      category: getArticleCategory(article.categoryType),
      title: article.title,
      summary: article.summary,
      metaLine: `${article.readingMinutes} Min. Lesezeit · Stand ${formatDate(article.updatedAt)}`,
      heroImageUrl: article.heroImageUrl,
      blocks: article.blocks,
      tags: article.tags,
      pinned: article.pinned,
      adminBar: isAdmin ? this.#createAdminBar(article, { onEdit, onDelete }) : null,
    });

    this.#overlay.appendChild(
      createElement('div', { className: 'kbase-reader' }, [closeButton, document_])
    );

    // Reading progress along the top edge. The overlay is the scroll container,
    // so the listener dies with it — no document-level cleanup needed. scaleX
    // instead of width keeps the update off the layout pass. Captured locally
    // because close() nulls #overlay before the close animation finishes.
    const overlay = this.#overlay;
    const progress = createElement('div', { className: 'kbase-reader-progress', 'aria-hidden': 'true' });
    overlay.appendChild(progress);
    overlay.addEventListener(
      'scroll',
      () => {
        const max = overlay.scrollHeight - overlay.clientHeight;
        progress.style.transform = `scaleX(${max > 0 ? overlay.scrollTop / max : 0})`;
      },
      { passive: true }
    );

    document.addEventListener('keydown', this.#onKeydown);
    document.body.appendChild(this.#overlay);

    // base.css locks html/body to overflow: hidden, so no scroll lock is needed.
    // The modal boundary is: aria-modal alone does not stop Tab from walking
    // into the library behind the overlay.
    this.#inertRoot = document.querySelector('#app');
    if (this.#inertRoot) {
      this.#inertRoot.inert = true;
    }

    requestAnimationFrame(() => this.#overlay.classList.add('is-open'));
    closeButton.focus();
  }

  #createAdminBar(article, { onEdit, onDelete }) {
    return createElement('div', { className: 'kbase-reader-admin' }, [
      new Button({
        label: 'Bearbeiten',
        variant: 'outline',
        size: 'sm',
        icon: new Icon({ name: 'edit', size: 14 }).element,
        onClick: () => onEdit?.(article),
      }).element,
      new Button({
        label: 'Löschen',
        variant: 'danger',
        size: 'sm',
        icon: new Icon({ name: 'trash', size: 14 }).element,
        onClick: () => onDelete?.(article),
      }).element,
    ]);
  }

  close(onClose = null) {
    if (!this.#overlay) {
      return;
    }

    const overlay = this.#overlay;
    this.#overlay = null;

    document.removeEventListener('keydown', this.#onKeydown);

    if (this.#inertRoot) {
      this.#inertRoot.inert = false;
      this.#inertRoot = null;
    }

    overlay.classList.remove('is-open');
    setTimeout(() => overlay.remove(), CLOSE_ANIMATION_MS);

    if (this.#previousFocus instanceof HTMLElement) {
      this.#previousFocus.focus();
    }

    onClose?.();
  }

  get isOpen() {
    return Boolean(this.#overlay);
  }
}
