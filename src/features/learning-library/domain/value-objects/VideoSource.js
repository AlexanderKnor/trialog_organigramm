/**
 * Value Object: VideoSource
 * Turns a pasted share URL (Loom first, YouTube/Vimeo as guests) into a
 * privacy-safe embed URL. Parsing lives in the domain so the entity can refuse
 * URLs no player will ever render.
 */

import { ValidationError } from '../../../../core/errors/index.js';

export const VIDEO_PROVIDERS = Object.freeze({
  LOOM: 'loom',
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
});

const MAX_URL_LENGTH = 2048;

/**
 * Loom's default embed stacks a top bar, owner, title, share affordance and a
 * duration badge over the picture, which collide with each other and with the
 * play button. These are Loom's documented embed parameters for suppressing
 * that chrome; the portal supplies title and category itself. Parameters Loom
 * does not know are ignored, so the URL stays valid either way. The "powered by
 * Loom" badge is tied to the workspace plan and cannot be turned off here.
 */
const LOOM_EMBED_PARAMS = 'hideEmbedTopBar=true&hide_owner=true&hide_share=true&hide_title=true';

/** Each provider spells autoplay its own way. */
const AUTOPLAY_PARAM = Object.freeze({
  [VIDEO_PROVIDERS.LOOM]: 'autoplay=true',
  [VIDEO_PROVIDERS.YOUTUBE]: 'autoplay=1',
  [VIDEO_PROVIDERS.VIMEO]: 'autoplay=1',
});

/** Loom/Vimeo ids are digits or hex-ish tokens, YouTube ids are 11 URL-safe chars. */
const PATTERNS = [
  {
    provider: VIDEO_PROVIDERS.LOOM,
    hosts: ['www.loom.com', 'loom.com'],
    extract: (url) => url.pathname.match(/^\/(?:share|embed)\/([a-f0-9]{16,})/)?.[1] || null,
    embed: (id) => `https://www.loom.com/embed/${id}?${LOOM_EMBED_PARAMS}`,
  },
  {
    provider: VIDEO_PROVIDERS.YOUTUBE,
    hosts: ['www.youtube.com', 'youtube.com', 'm.youtube.com'],
    extract: (url) =>
      url.searchParams.get('v') ||
      url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] ||
      null,
    embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  },
  {
    provider: VIDEO_PROVIDERS.YOUTUBE,
    hosts: ['youtu.be'],
    extract: (url) => url.pathname.match(/^\/([\w-]{11})/)?.[1] || null,
    embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  },
  {
    provider: VIDEO_PROVIDERS.VIMEO,
    hosts: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'],
    extract: (url) => url.pathname.match(/^\/(?:video\/)?(\d{6,})/)?.[1] || null,
    embed: (id) => `https://player.vimeo.com/video/${id}`,
  },
];

export class VideoSource {
  #provider;
  #videoId;
  #shareUrl;
  #embedUrl;

  constructor(shareUrl) {
    const parsed = VideoSource.#parse(shareUrl);

    if (!parsed) {
      throw new ValidationError(
        'Video-Link nicht erkannt. Unterstützt werden Loom, YouTube und Vimeo.',
        'shareUrl'
      );
    }

    this.#provider = parsed.provider;
    this.#videoId = parsed.videoId;
    this.#shareUrl = shareUrl.trim();
    this.#embedUrl = parsed.embedUrl;
  }

  static #parse(shareUrl) {
    if (typeof shareUrl !== 'string' || shareUrl.trim().length === 0 || shareUrl.length > MAX_URL_LENGTH) {
      return null;
    }

    let url;
    try {
      url = new URL(shareUrl.trim());
    } catch {
      return null;
    }

    if (url.protocol !== 'https:') {
      return null;
    }

    for (const pattern of PATTERNS) {
      if (!pattern.hosts.includes(url.hostname)) {
        continue;
      }

      const videoId = pattern.extract(url);

      if (videoId) {
        return {
          provider: pattern.provider,
          videoId,
          embedUrl: pattern.embed(videoId),
        };
      }
    }

    return null;
  }

  static isValid(shareUrl) {
    return VideoSource.#parse(shareUrl) !== null;
  }

  get provider() {
    return this.#provider;
  }

  get videoId() {
    return this.#videoId;
  }

  get shareUrl() {
    return this.#shareUrl;
  }

  get embedUrl() {
    return this.#embedUrl;
  }

  /**
   * Embed URL that starts playing as soon as it loads. Used only behind an
   * explicit click on the player's poster, so the click is the user activation
   * the browser requires and nothing ever starts by itself. Loading the player
   * this way also means the provider's idle poster, with its own stacked
   * branding and duration badges, is never on screen.
   */
  get autoplayEmbedUrl() {
    const separator = this.#embedUrl.includes('?') ? '&' : '?';
    return `${this.#embedUrl}${separator}${AUTOPLAY_PARAM[this.#provider]}`;
  }

  toJSON() {
    return this.#shareUrl;
  }
}
