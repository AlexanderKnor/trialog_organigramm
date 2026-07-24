/**
 * Presentation catalog: the block types an author can insert.
 *
 * Label, hint and icon are UI copy and belong here, not in the domain. So does
 * the empty draft: a fresh block is deliberately invalid (empty text, no URL),
 * which the domain must never accept, so the composer works on plain draft
 * objects and only builds ArticleBlocks when it saves or previews.
 *
 * describeBlockProblem() is edge validation with German copy for the author.
 * The domain still validates on its own — this only makes the failure readable
 * instead of surfacing a developer message.
 */

import {
  ARTICLE_BLOCK_TYPES,
  CALLOUT_TONES,
  isValidWebUrl,
} from '../../../domain/value-objects/ArticleBlock.js';
import { VideoSource } from '../../../../learning-library/domain/value-objects/VideoSource.js';

export const BLOCK_PRESETS = Object.freeze([
  {
    type: ARTICLE_BLOCK_TYPES.TEXT,
    label: 'Absatz',
    hint: 'Fließtext mit Zeilenumbrüchen',
    icon: 'fileText',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.TEXT, text: '' }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.HEADING,
    label: 'Überschrift',
    hint: 'Gliedert lange Artikel',
    icon: 'heading',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.HEADING, text: '', level: 2 }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.LIST,
    label: 'Liste',
    hint: 'Aufzählung oder Nummerierung',
    icon: 'list',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.LIST, ordered: false, items: [''] }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.STEPS,
    label: 'Schritte',
    hint: 'Nummerierter Ablauf mit Titel je Schritt',
    icon: 'listOrdered',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.STEPS, items: [{ title: '', text: '' }] }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.CALLOUT,
    label: 'Hinweisbox',
    hint: 'Hebt Fristen, Regeln oder Warnungen hervor',
    icon: 'info',
    draft: () => ({
      type: ARTICLE_BLOCK_TYPES.CALLOUT,
      tone: CALLOUT_TONES.INFO,
      title: '',
      text: '',
    }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.QUOTE,
    label: 'Zitat',
    hint: 'Aussage mit Quelle',
    icon: 'quote',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.QUOTE, text: '', attribution: '' }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.IMAGE,
    label: 'Bild',
    hint: 'Screenshot oder Formularausschnitt',
    icon: 'image',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.IMAGE, url: '', caption: '' }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.VIDEO,
    label: 'Video',
    hint: 'Loom, YouTube oder Vimeo',
    icon: 'video',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.VIDEO, url: '', caption: '' }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.LINK,
    label: 'Verweis',
    hint: 'Karte zu Vorlage, Portal oder Dokument',
    icon: 'externalLink',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.LINK, url: '', label: '', description: '' }),
  },
  {
    type: ARTICLE_BLOCK_TYPES.DIVIDER,
    label: 'Trenner',
    hint: 'Setzt eine sichtbare Zäsur',
    icon: 'minus',
    draft: () => ({ type: ARTICLE_BLOCK_TYPES.DIVIDER }),
  },
]);

export function getBlockPreset(type) {
  return BLOCK_PRESETS.find((preset) => preset.type === type) || BLOCK_PRESETS[0];
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** A draft the author added but never filled. Dropped on save without a word. */
export function isBlankDraft(draft) {
  switch (draft.type) {
    case ARTICLE_BLOCK_TYPES.DIVIDER:
      return false;
    case ARTICLE_BLOCK_TYPES.LIST:
      return draft.items.every((item) => !text(item));
    case ARTICLE_BLOCK_TYPES.STEPS:
      return draft.items.every((item) => !text(item.title) && !text(item.text));
    case ARTICLE_BLOCK_TYPES.IMAGE:
    case ARTICLE_BLOCK_TYPES.VIDEO:
      return !text(draft.url) && !text(draft.caption);
    case ARTICLE_BLOCK_TYPES.LINK:
      return !text(draft.url) && !text(draft.label) && !text(draft.description);
    case ARTICLE_BLOCK_TYPES.QUOTE:
      return !text(draft.text) && !text(draft.attribution);
    case ARTICLE_BLOCK_TYPES.CALLOUT:
      return !text(draft.text) && !text(draft.title);
    default:
      return !text(draft.text);
  }
}

/** German reason why this draft cannot be saved, or null when it is fine. */
export function describeBlockProblem(draft) {
  switch (draft.type) {
    case ARTICLE_BLOCK_TYPES.DIVIDER:
      return null;

    case ARTICLE_BLOCK_TYPES.HEADING:
      return text(draft.text) ? null : 'Die Überschrift braucht einen Text.';

    case ARTICLE_BLOCK_TYPES.LIST:
      return draft.items.some((item) => text(item)) ? null : 'Die Liste braucht mindestens einen Punkt.';

    case ARTICLE_BLOCK_TYPES.STEPS:
      return draft.items.some((item) => text(item.title))
        ? null
        : 'Jeder Schritt braucht eine Überschrift.';

    case ARTICLE_BLOCK_TYPES.CALLOUT:
      return text(draft.text) ? null : 'Die Hinweisbox braucht einen Text.';

    case ARTICLE_BLOCK_TYPES.QUOTE:
      return text(draft.text) ? null : 'Das Zitat braucht einen Text.';

    case ARTICLE_BLOCK_TYPES.IMAGE:
      return isValidWebUrl(text(draft.url))
        ? null
        : 'Die Bildadresse muss eine vollständige URL sein und mit https:// beginnen.';

    case ARTICLE_BLOCK_TYPES.VIDEO:
      return VideoSource.isValid(text(draft.url))
        ? null
        : 'Der Videolink wird nicht erkannt. Möglich sind Loom, YouTube und Vimeo.';

    case ARTICLE_BLOCK_TYPES.LINK:
      if (!isValidWebUrl(text(draft.url))) {
        return 'Der Verweis braucht eine vollständige URL, die mit https:// beginnt.';
      }
      return text(draft.label) ? null : 'Der Verweis braucht eine Bezeichnung.';

    default:
      return text(draft.text) ? null : 'Der Absatz ist leer.';
  }
}

/**
 * Payload for the entity: trimmed, without the empty rows the editor keeps
 * around so an author can keep typing.
 */
export function toBlockPayload(draft) {
  switch (draft.type) {
    case ARTICLE_BLOCK_TYPES.LIST:
      return { type: draft.type, ordered: Boolean(draft.ordered), items: draft.items.map(text).filter(Boolean) };

    case ARTICLE_BLOCK_TYPES.STEPS:
      return {
        type: draft.type,
        items: draft.items
          .filter((item) => text(item.title))
          .map((item) => ({ title: text(item.title), text: text(item.text) })),
      };

    case ARTICLE_BLOCK_TYPES.DIVIDER:
      return { type: draft.type };

    default:
      return Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ])
      );
  }
}
