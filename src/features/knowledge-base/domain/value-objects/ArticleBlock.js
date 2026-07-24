/**
 * Value Object: ArticleBlock
 * One content block of an article. Articles are ordered lists of these; the
 * order in the array is the order on the page.
 *
 * Every type is described exactly once in BLOCK_SPECS: how its payload is
 * normalized, what makes it invalid and which of its text is searchable. A new
 * type is a new spec, not a new branch in the class.
 *
 * Video blocks reuse the learning library's VideoSource so an article accepts
 * exactly the links a video card accepts; a second parser would drift from it.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { VideoSource } from '../../../learning-library/domain/value-objects/VideoSource.js';

export const ARTICLE_BLOCK_TYPES = Object.freeze({
  TEXT: 'text',
  HEADING: 'heading',
  LIST: 'list',
  STEPS: 'steps',
  CALLOUT: 'callout',
  QUOTE: 'quote',
  IMAGE: 'image',
  VIDEO: 'video',
  LINK: 'link',
  DIVIDER: 'divider',
});

/** Callouts carry the message's weight, not a colour choice. */
export const CALLOUT_TONES = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
});

export const HEADING_LEVELS = Object.freeze([2, 3]);

const LIMITS = Object.freeze({
  text: 8000,
  heading: 140,
  listItem: 400,
  stepTitle: 140,
  stepText: 1200,
  calloutTitle: 140,
  calloutText: 2000,
  quote: 1000,
  attribution: 140,
  caption: 200,
  linkLabel: 140,
  linkDescription: 300,
  items: 20,
  url: 2048,
});

/** Only web-reachable URLs; anything else (javascript:, data: blobs) is refused. */
export function isValidWebUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > LIMITS.url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

function requireText(value, field, maxLength) {
  const text = asText(value);

  if (text.length === 0) {
    throw new ValidationError(`Block field "${field}" must not be empty`, field);
  }

  return optionalText(text, field, maxLength);
}

function optionalText(value, field, maxLength) {
  const text = asText(value);

  if (text.length > maxLength) {
    throw new ValidationError(
      `Block field "${field}" must not exceed ${maxLength} characters`,
      field
    );
  }

  return text;
}

function requireWebUrl(value, field) {
  const url = asText(value);

  if (!isValidWebUrl(url)) {
    throw new ValidationError(`Block field "${field}" must be a valid http(s) URL`, field);
  }

  return url;
}

function requireItems(value, field) {
  const items = Array.isArray(value) ? value : [];

  if (items.length === 0) {
    throw new ValidationError(`Block field "${field}" needs at least one entry`, field);
  }

  if (items.length > LIMITS.items) {
    throw new ValidationError(
      `Block field "${field}" must not exceed ${LIMITS.items} entries`,
      field
    );
  }

  return items;
}

const freezeData = (data) => Object.freeze(data);

const BLOCK_SPECS = Object.freeze({
  [ARTICLE_BLOCK_TYPES.TEXT]: {
    normalize: (raw) => freezeData({ text: requireText(raw.text, 'text', LIMITS.text) }),
    searchText: (data) => data.text,
  },

  [ARTICLE_BLOCK_TYPES.HEADING]: {
    normalize: (raw) =>
      freezeData({
        text: requireText(raw.text, 'text', LIMITS.heading),
        level: HEADING_LEVELS.includes(Number(raw.level)) ? Number(raw.level) : HEADING_LEVELS[0],
      }),
    searchText: (data) => data.text,
  },

  [ARTICLE_BLOCK_TYPES.LIST]: {
    normalize: (raw) => {
      const items = requireItems(
        (Array.isArray(raw.items) ? raw.items : []).map(asText).filter(Boolean),
        'items'
      ).map((item) => optionalText(item, 'items', LIMITS.listItem));

      return freezeData({ ordered: Boolean(raw.ordered), items: Object.freeze(items) });
    },
    searchText: (data) => data.items.join(' '),
  },

  [ARTICLE_BLOCK_TYPES.STEPS]: {
    normalize: (raw) => {
      const items = requireItems(
        (Array.isArray(raw.items) ? raw.items : []).filter(
          (item) => asText(item?.title) || asText(item?.text)
        ),
        'items'
      ).map((item) =>
        Object.freeze({
          title: requireText(item.title, 'title', LIMITS.stepTitle),
          text: optionalText(item.text, 'text', LIMITS.stepText),
        })
      );

      return freezeData({ items: Object.freeze(items) });
    },
    searchText: (data) => data.items.map((item) => `${item.title} ${item.text}`).join(' '),
  },

  [ARTICLE_BLOCK_TYPES.CALLOUT]: {
    normalize: (raw) =>
      freezeData({
        tone: Object.values(CALLOUT_TONES).includes(raw.tone) ? raw.tone : CALLOUT_TONES.INFO,
        title: optionalText(raw.title, 'title', LIMITS.calloutTitle),
        text: requireText(raw.text, 'text', LIMITS.calloutText),
      }),
    searchText: (data) => `${data.title} ${data.text}`,
  },

  [ARTICLE_BLOCK_TYPES.QUOTE]: {
    normalize: (raw) =>
      freezeData({
        text: requireText(raw.text, 'text', LIMITS.quote),
        attribution: optionalText(raw.attribution, 'attribution', LIMITS.attribution),
      }),
    searchText: (data) => `${data.text} ${data.attribution}`,
  },

  [ARTICLE_BLOCK_TYPES.IMAGE]: {
    normalize: (raw) =>
      freezeData({
        url: requireWebUrl(raw.url, 'url'),
        caption: optionalText(raw.caption, 'caption', LIMITS.caption),
      }),
    searchText: (data) => data.caption,
  },

  [ARTICLE_BLOCK_TYPES.VIDEO]: {
    normalize: (raw) =>
      freezeData({
        // Constructing the source is the validation: it throws on anything the
        // player could not render.
        url: new VideoSource(asText(raw.url)).shareUrl,
        caption: optionalText(raw.caption, 'caption', LIMITS.caption),
      }),
    searchText: (data) => data.caption,
  },

  [ARTICLE_BLOCK_TYPES.LINK]: {
    normalize: (raw) =>
      freezeData({
        url: requireWebUrl(raw.url, 'url'),
        label: requireText(raw.label, 'label', LIMITS.linkLabel),
        description: optionalText(raw.description, 'description', LIMITS.linkDescription),
      }),
    searchText: (data) => `${data.label} ${data.description}`,
  },

  [ARTICLE_BLOCK_TYPES.DIVIDER]: {
    normalize: () => freezeData({}),
    searchText: () => '',
  },
});

export class ArticleBlock {
  #type;
  #data;

  constructor(raw) {
    const type = raw?.type;
    const spec = BLOCK_SPECS[type];

    if (!spec) {
      throw new ValidationError(`Unknown article block type: ${type}`, 'type');
    }

    this.#type = type;
    this.#data = spec.normalize(raw);
  }

  get type() {
    return this.#type;
  }

  /** Frozen payload of the block; its shape is the type's spec. */
  get data() {
    return this.#data;
  }

  /** Everything a reader could search for, flattened — also feeds reading time. */
  get searchText() {
    return BLOCK_SPECS[this.#type].searchText(this.#data);
  }

  /** Parsed embed source for video blocks, null for every other type. */
  get videoSource() {
    return this.#type === ARTICLE_BLOCK_TYPES.VIDEO ? new VideoSource(this.#data.url) : null;
  }

  toJSON() {
    return { type: this.#type, ...this.#data };
  }

  static fromJSON(data) {
    return new ArticleBlock(data || {});
  }
}
