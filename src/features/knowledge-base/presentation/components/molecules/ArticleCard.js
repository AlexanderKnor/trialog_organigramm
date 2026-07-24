/**
 * Molecule: ArticleCard
 * One article in the library. Two named variants:
 *
 * `.default` — grid card: hero image (or tinted category emblem), category
 * chip, title, summary, reading meta.
 * `.feature` — the Aufmacher: a full-width navy editorial card for the leading
 * pinned article, content left, hero or category emblem right.
 *
 * Both are real buttons that open the reader.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getArticleCategory } from '../../../domain/value-objects/ArticleCategory.js';

export const ARTICLE_CARD_VARIANTS = Object.freeze({
  DEFAULT: 'default',
  FEATURE: 'feature',
});

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const metaLine = (article) =>
  `${article.readingMinutes} Min. Lesezeit · Stand ${formatDate(article.updatedAt)}`;

export class ArticleCard {
  #element;

  constructor(article, { onOpen = null, variant = ARTICLE_CARD_VARIANTS.DEFAULT } = {}) {
    const category = getArticleCategory(article.categoryType);

    this.#element =
      variant === ARTICLE_CARD_VARIANTS.FEATURE
        ? this.#renderFeature(article, category, onOpen)
        : this.#renderDefault(article, category, onOpen);
  }

  #renderDefault(article, category, onOpen) {
    const children = [
      this.#createMedia(article, category),
      createElement('span', { className: 'kbase-card-body' }, [
        createElement('span', { className: 'kbase-card-chips' }, [
          createElement('span', { className: `kbase-chip kbase-chip--${category?.tint || 'blue'}` }, [
            category?.label || 'Allgemein',
          ]),
          article.pinned
            ? createElement('span', { className: 'kbase-chip kbase-chip--pinned' }, ['Wichtig'])
            : null,
        ].filter(Boolean)),
        createElement('span', { className: 'kbase-card-title' }, [article.title]),
        article.summary
          ? createElement('span', { className: 'kbase-card-summary' }, [article.summary])
          : null,
        createElement('span', { className: 'kbase-card-meta' }, [metaLine(article)]),
      ].filter(Boolean)),
    ];

    return createElement(
      'button',
      {
        className: 'kbase-card',
        type: 'button',
        'aria-label': `Artikel öffnen: ${article.title}`,
        onclick: () => onOpen?.(article),
      },
      children
    );
  }

  #renderFeature(article, category, onOpen) {
    const media = article.heroImageUrl
      ? this.#createFeatureImage(article, category)
      : this.#createFeatureEmblem(category);

    return createElement(
      'button',
      {
        className: 'kbase-feature',
        type: 'button',
        'aria-label': `Artikel öffnen: ${article.title}`,
        onclick: () => onOpen?.(article),
      },
      [
        createElement('span', { className: 'kbase-feature-body' }, [
          createElement('span', { className: 'kbase-card-chips' }, [
            createElement('span', { className: 'kbase-chip kbase-chip--frost' }, [
              category?.label || 'Allgemein',
            ]),
            createElement('span', { className: 'kbase-chip kbase-chip--pinned' }, ['Wichtig']),
          ]),
          createElement('span', { className: 'kbase-feature-title' }, [article.title]),
          article.summary
            ? createElement('span', { className: 'kbase-feature-summary' }, [article.summary])
            : null,
          createElement('span', { className: 'kbase-feature-meta' }, [metaLine(article)]),
          createElement('span', { className: 'kbase-feature-cta' }, [
            createElement('span', {}, ['Artikel lesen']),
            new Icon({ name: 'arrowRight', size: 16 }).element,
          ]),
        ].filter(Boolean)),
        media,
      ]
    );
  }

  #createFeatureImage(article, category) {
    const image = createElement('img', {
      className: 'kbase-feature-image',
      src: article.heroImageUrl,
      alt: '',
      loading: 'lazy',
    });

    image.onerror = () => {
      image.closest('.kbase-feature-media')?.replaceWith(this.#createFeatureEmblem(category));
    };

    return createElement('span', { className: 'kbase-feature-media' }, [image]);
  }

  #createFeatureEmblem(category) {
    return createElement(
      'span',
      { className: 'kbase-feature-media kbase-feature-media--emblem', 'aria-hidden': 'true' },
      [new Icon({ name: category?.icon || 'fileText', size: 140 }).element]
    );
  }

  #createMedia(article, category) {
    if (article.heroImageUrl) {
      const image = createElement('img', {
        className: 'kbase-card-image',
        src: article.heroImageUrl,
        alt: '',
        loading: 'lazy',
      });

      // A dead URL must not leave a broken-image glyph on a premium card;
      // fall back to the tinted emblem instead.
      image.onerror = () => {
        image.replaceWith(this.#createEmblem(category));
      };

      return createElement('span', { className: 'kbase-card-media' }, [image]);
    }

    return createElement('span', { className: 'kbase-card-media' }, [this.#createEmblem(category)]);
  }

  #createEmblem(category) {
    return createElement(
      'span',
      { className: `kbase-card-emblem kbase-card-emblem--${category?.tint || 'blue'}` },
      [new Icon({ name: category?.icon || 'fileText', size: 30 }).element]
    );
  }

  get element() {
    return this.#element;
  }
}
