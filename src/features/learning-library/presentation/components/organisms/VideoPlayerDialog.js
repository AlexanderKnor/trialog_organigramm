/**
 * Organism: VideoPlayerDialog
 * Cinema overlay for one video: title and category in the header, a 16:9 frame
 * below it. The frame opens on our own poster and the embed (Loom/YouTube/
 * Vimeo) is created on the press, then torn down on close so nothing keeps
 * streaming in the background. Providers stack their own branding, duration
 * and share badges over the idle poster, where they overlap each other and the
 * play button; loading the embed straight into the playing state means that
 * state is never on screen.
 *
 * Layout is a solid card: header with title, category and close button, the
 * frame below it, admin actions in the footer. Nothing floats over the video
 * and nothing sits on the bare scrim, because once the viewer clicks into the
 * player the focus lives in a cross-origin iframe where our Escape handler
 * never sees a keydown. The close button in the header is then the only way
 * out, so it must be permanently visible and never overlap the picture.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getVideoCategory } from '../../../domain/value-objects/VideoCategory.js';
import { createPlayGlyph } from '../atoms/playGlyph.js';

const CLOSE_ANIMATION_MS = 200;
const POSTER_FADE_MS = 300;

/** The provider paints its idle poster for a moment before playback begins.
 *  Cross-origin we cannot observe when it actually starts, so the cover is held
 *  for a short grace after load rather than on a signal we do not get. */
const PLAYER_REVEAL_GRACE_MS = 450;

/** A load event that never arrives must not leave the cover up for good. */
const EMBED_LOAD_TIMEOUT_MS = 6000;

export class VideoPlayerDialog {
  #overlay;
  #onKeydown;
  #onFullscreenChange;
  #previousFocus;
  #inertRoot;

  open(video, { isAdmin = false, onEdit = null, onDelete = null } = {}) {
    this.#previousFocus = document.activeElement;

    const titleId = 'vlib-player-title';
    const category = getVideoCategory(video.categoryType);

    this.#overlay = createElement('div', {
      className: 'vlib-player-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      onclick: (event) => {
        if (event.target === this.#overlay) {
          this.close();
        }
      },
    });

    this.#onKeydown = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    const closeButton = createElement(
      'button',
      {
        className: 'vlib-player-close',
        type: 'button',
        'aria-label': 'Video schließen',
        onclick: () => this.close(),
      },
      [new Icon({ name: 'close', size: 18 }).element]
    );

    const head = createElement('div', { className: 'vlib-player-head' }, [
      createElement('div', { className: 'vlib-player-headtext' }, [
        createElement('h2', { className: 'vlib-player-title', id: titleId }, [video.title]),
        createElement('p', { className: 'vlib-player-sub' }, [category?.label || '']),
      ]),
      closeButton,
    ]);

    const frame = createElement('div', { className: 'vlib-player-frame' });

    const poster = createElement(
      'button',
      {
        className: `vlib-player-poster vlib-card-thumb--${category?.tint || 'blue'}`,
        type: 'button',
        'aria-label': `Video abspielen: ${video.title}`,
        onclick: () => mountEmbed(),
      },
      [
        createElement('span', { className: 'vlib-player-poster-emblem', 'aria-hidden': 'true' }, [
          new Icon({ name: category?.icon || 'layers', size: 72 }).element,
        ]),
        createElement('span', { className: 'vlib-player-poster-play' }, [createPlayGlyph(22)]),
      ]
    );

    frame.appendChild(poster);

    /**
     * The embed is mounted BEHIND the poster and the poster stays up as a cover
     * until the player is running. Loading it into the visible frame shows the
     * provider's idle state, with its branding and duration badges stacked over
     * each other, for as long as the embed takes to render.
     */
    function mountEmbed() {
      if (frame.querySelector('iframe')) {
        return;
      }

      const iframe = createElement('iframe', {
        src: video.source.autoplayEmbedUrl,
        title: video.title,
        allow: 'autoplay; fullscreen; picture-in-picture',
        allowFullscreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
      });

      frame.insertBefore(iframe, poster);
      poster.disabled = true;
      poster.classList.add('is-busy');

      const reveal = () => {
        if (!poster.isConnected || poster.classList.contains('is-gone')) {
          return;
        }

        poster.classList.add('is-gone');
        setTimeout(() => poster.remove(), POSTER_FADE_MS);
      };

      iframe.addEventListener(
        'load',
        () => setTimeout(reveal, PLAYER_REVEAL_GRACE_MS),
        { once: true }
      );
      setTimeout(reveal, EMBED_LOAD_TIMEOUT_MS);
    }

    const admin = isAdmin
      ? createElement('div', { className: 'vlib-player-admin' }, [
          new Button({
            label: 'Bearbeiten',
            variant: 'outline',
            size: 'sm',
            icon: new Icon({ name: 'edit', size: 14 }).element,
            onClick: () => onEdit?.(video),
          }).element,
          new Button({
            label: 'Löschen',
            variant: 'danger',
            size: 'sm',
            icon: new Icon({ name: 'trash', size: 14 }).element,
            onClick: () => onDelete?.(video),
          }).element,
        ])
      : null;

    const card = createElement(
      'div',
      { className: 'vlib-player' },
      [head, frame, admin].filter(Boolean)
    );

    this.#overlay.appendChild(card);

    // Going fullscreen resizes the viewport. Our card is centered and its width
    // follows the viewport height, so it would visibly reflow during the
    // transition, while the browser's backdrop has not covered it yet.
    this.#onFullscreenChange = () => {
      const active =
        Boolean(document.fullscreenElement) && frame.contains(document.fullscreenElement);
      this.#overlay?.classList.toggle('is-fullscreen', active);
    };

    document.addEventListener('fullscreenchange', this.#onFullscreenChange);
    document.addEventListener('keydown', this.#onKeydown);
    document.body.appendChild(this.#overlay);

    // base.css already locks html/body to overflow: hidden, so no scroll lock is
    // needed. What IS missing is the modal boundary: aria-modal alone does not
    // stop Tab from walking into the portal behind the overlay.
    this.#inertRoot = document.querySelector('#app');
    if (this.#inertRoot) {
      this.#inertRoot.inert = true;
    }

    requestAnimationFrame(() => this.#overlay.classList.add('is-open'));
    closeButton.focus();
  }

  close() {
    if (!this.#overlay) {
      return;
    }

    const overlay = this.#overlay;
    this.#overlay = null;

    document.removeEventListener('keydown', this.#onKeydown);
    document.removeEventListener('fullscreenchange', this.#onFullscreenChange);
    overlay.classList.remove('is-open');

    if (this.#inertRoot) {
      this.#inertRoot.inert = false;
      this.#inertRoot = null;
    }

    // Remove the iframe immediately so audio stops with the overlay,
    // not CLOSE_ANIMATION_MS later.
    overlay.querySelector('iframe')?.remove();
    setTimeout(() => overlay.remove(), CLOSE_ANIMATION_MS);

    if (this.#previousFocus instanceof HTMLElement) {
      this.#previousFocus.focus();
    }
  }

  get isOpen() {
    return Boolean(this.#overlay);
  }
}
