/**
 * Molecule: articleView
 * How a finished article looks. One renderer for both places an article is
 * shown: the reader overlay and the composer's preview. Anything else would let
 * the two drift, and the composer's whole promise is that what an author sees
 * while writing is what the team sees when reading.
 *
 * Text is set through text nodes, never innerHTML: article content is authored
 * by admins, but it is still stored data and must not be able to inject markup.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { ARTICLE_BLOCK_TYPES, CALLOUT_TONES } from '../../../domain/value-objects/ArticleBlock.js';

const CALLOUT_CHROME = Object.freeze({
  [CALLOUT_TONES.INFO]: { icon: 'info', label: 'Hinweis' },
  [CALLOUT_TONES.SUCCESS]: { icon: 'checkCircle', label: 'Empfehlung' },
  [CALLOUT_TONES.WARNING]: { icon: 'alertTriangle', label: 'Achtung' },
  [CALLOUT_TONES.DANGER]: { icon: 'alertCircle', label: 'Kritisch' },
});

/** Shown on link cards so the target is readable before the click. */
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const figure = (className, media, caption) =>
  createElement(
    'figure',
    { className },
    [media, caption ? createElement('figcaption', {}, [caption]) : null].filter(Boolean)
  );

const RENDERERS = Object.freeze({
  [ARTICLE_BLOCK_TYPES.TEXT]: (data) =>
    createElement('p', { className: 'kbase-block-text' }, [data.text]),

  [ARTICLE_BLOCK_TYPES.HEADING]: (data) =>
    createElement(`h${data.level}`, { className: `kbase-block-heading kbase-block-heading--h${data.level}` }, [
      data.text,
    ]),

  [ARTICLE_BLOCK_TYPES.LIST]: (data) =>
    createElement(
      data.ordered ? 'ol' : 'ul',
      { className: `kbase-block-list ${data.ordered ? 'is-ordered' : 'is-bulleted'}` },
      data.items.map((item) => createElement('li', {}, [item]))
    ),

  [ARTICLE_BLOCK_TYPES.STEPS]: (data) =>
    createElement(
      'ol',
      { className: 'kbase-block-steps' },
      data.items.map((item, index) =>
        createElement('li', { className: 'kbase-block-step' }, [
          createElement('span', { className: 'kbase-block-step-index', 'aria-hidden': 'true' }, [
            String(index + 1),
          ]),
          createElement(
            'div',
            { className: 'kbase-block-step-body' },
            [
              createElement('h4', { className: 'kbase-block-step-title' }, [item.title]),
              item.text
                ? createElement('p', { className: 'kbase-block-step-text' }, [item.text])
                : null,
            ].filter(Boolean)
          ),
        ])
      )
    ),

  [ARTICLE_BLOCK_TYPES.CALLOUT]: (data) => {
    const chrome = CALLOUT_CHROME[data.tone];

    return createElement('aside', { className: `kbase-block-callout kbase-block-callout--${data.tone}` }, [
      createElement('span', { className: 'kbase-block-callout-icon' }, [
        new Icon({ name: chrome.icon, size: 18 }).element,
      ]),
      createElement('div', { className: 'kbase-block-callout-body' }, [
        createElement('span', { className: 'kbase-block-callout-label' }, [data.title || chrome.label]),
        createElement('p', { className: 'kbase-block-callout-text' }, [data.text]),
      ]),
    ]);
  },

  [ARTICLE_BLOCK_TYPES.QUOTE]: (data) =>
    createElement(
      'figure',
      { className: 'kbase-block-quote' },
      [
        createElement('blockquote', {}, [data.text]),
        data.attribution ? createElement('figcaption', {}, [data.attribution]) : null,
      ].filter(Boolean)
    ),

  [ARTICLE_BLOCK_TYPES.IMAGE]: (data) =>
    figure(
      'kbase-block-figure',
      createElement('img', { src: data.url, alt: data.caption || '', loading: 'lazy' }),
      data.caption
    ),

  [ARTICLE_BLOCK_TYPES.VIDEO]: (data, block) =>
    figure(
      'kbase-block-video',
      createElement('div', { className: 'kbase-block-video-frame' }, [
        createElement('iframe', {
          src: block.videoSource.embedUrl,
          title: data.caption || 'Video',
          loading: 'lazy',
          allow: 'fullscreen; picture-in-picture',
          allowFullscreen: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
        }),
      ]),
      data.caption
    ),

  [ARTICLE_BLOCK_TYPES.LINK]: (data) =>
    createElement(
      'a',
      {
        className: 'kbase-block-link',
        href: data.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [
        createElement('span', { className: 'kbase-block-link-icon' }, [
          new Icon({ name: 'externalLink', size: 18 }).element,
        ]),
        createElement(
          'span',
          { className: 'kbase-block-link-body' },
          [
            createElement('span', { className: 'kbase-block-link-label' }, [data.label]),
            data.description
              ? createElement('span', { className: 'kbase-block-link-desc' }, [data.description])
              : null,
            createElement('span', { className: 'kbase-block-link-host' }, [hostOf(data.url)]),
          ].filter(Boolean)
        ),
      ]
    ),

  [ARTICLE_BLOCK_TYPES.DIVIDER]: () =>
    createElement('div', { className: 'kbase-block-divider', role: 'separator' }),
});

/** @param block an ArticleBlock instance (never a draft) */
export function renderArticleBlock(block) {
  return RENDERERS[block.type](block.data, block);
}

/**
 * Auto-generated "Inhalt" strip from the article's H2 headings. Only shown
 * once there are at least two chapters — a single entry is not a table of
 * contents. Buttons scroll to the live heading elements instead of anchor
 * links, because the SPA owns the URL hash for routing.
 */
function createContentsNav(targets) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return createElement('nav', { className: 'kbase-reader-toc', 'aria-label': 'Inhalt' }, [
    createElement('span', { className: 'kbase-reader-toc-label' }, ['Inhalt']),
    createElement(
      'div',
      { className: 'kbase-reader-toc-list' },
      targets.map((target, index) =>
        createElement(
          'button',
          {
            className: 'kbase-reader-toc-link',
            type: 'button',
            onclick: () =>
              target.el.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'start',
              }),
          },
          [
            createElement('span', { className: 'kbase-reader-toc-no', 'aria-hidden': 'true' }, [
              String(index + 1).padStart(2, '0'),
            ]),
            createElement('span', { className: 'kbase-reader-toc-text' }, [target.label]),
          ]
        )
      )
    ),
  ]);
}

/**
 * The whole reading surface: navy masthead with the category's emblem as a
 * watermark, an auto-generated contents strip, then the white document body.
 *
 * @param category  the resolved ArticleCategory (may be null)
 * @param blocks    ArticleBlock instances, already validated
 * @param adminBar  optional element rendered inside the masthead
 */
export function renderArticleDocument({
  titleId = null,
  category = null,
  title,
  summary = '',
  metaLine = '',
  heroImageUrl = '',
  blocks = [],
  tags = [],
  pinned = false,
  adminBar = null,
}) {
  const head = createElement(
    'header',
    { className: 'kbase-reader-head' },
    [
      createElement('span', { className: 'kbase-reader-watermark', 'aria-hidden': 'true' }, [
        new Icon({ name: category?.icon || 'layers', size: 220 }).element,
      ]),
      createElement(
        'div',
        { className: 'kbase-reader-chips' },
        [
          createElement('span', { className: 'kbase-chip kbase-chip--frost' }, [
            category?.label || 'Ohne Kategorie',
          ]),
          pinned ? createElement('span', { className: 'kbase-chip kbase-chip--pinned' }, ['Wichtig']) : null,
        ].filter(Boolean)
      ),
      createElement('h1', { className: 'kbase-reader-title', id: titleId }, [title]),
      summary ? createElement('p', { className: 'kbase-reader-lede' }, [summary]) : null,
      metaLine ? createElement('p', { className: 'kbase-reader-meta' }, [metaLine]) : null,
      adminBar,
    ].filter(Boolean)
  );

  // Blocks are rendered before the contents strip so its buttons can hold the
  // live heading elements — no ids, no hash anchors.
  const blockElements = blocks.map((block) => renderArticleBlock(block));

  const chapterTargets = blocks
    .map((block, index) =>
      block.type === ARTICLE_BLOCK_TYPES.HEADING && block.data.level === 2
        ? { label: block.data.text, el: blockElements[index] }
        : null
    )
    .filter(Boolean);

  const contents = chapterTargets.length >= 2 ? createContentsNav(chapterTargets) : null;

  const hero = heroImageUrl
    ? createElement('figure', { className: 'kbase-reader-hero' }, [
        createElement('img', { src: heroImageUrl, alt: '', loading: 'lazy' }),
      ])
    : null;

  const body = createElement('div', { className: 'kbase-reader-body' }, blockElements);

  const footer =
    tags.length > 0
      ? createElement(
          'footer',
          { className: 'kbase-reader-tags' },
          tags.map((tag) => createElement('span', { className: 'kbase-tag' }, [tag]))
        )
      : null;

  return createElement(
    'article',
    { className: 'kbase-reader-article' },
    [head, contents, hero, body, footer].filter(Boolean)
  );
}
