/**
 * Molecule: VideoCard
 * One video in the library grid: tinted cinematic thumb with play affordance
 * and category tag, then the title. The whole card is a real button that
 * opens the player.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getVideoCategory } from '../../../domain/value-objects/VideoCategory.js';
import { createPlayGlyph } from '../atoms/playGlyph.js';

export class VideoCard {
  #element;

  constructor(video, { onPlay = null } = {}) {
    this.#element = this.#render(video, onPlay);
  }

  #render(video, onPlay) {
    const category = getVideoCategory(video.categoryType);

    const thumb = createElement(
      'span',
      { className: `vlib-card-thumb vlib-card-thumb--${category?.tint || 'blue'}` },
      [
        createElement('span', { className: 'vlib-card-cat' }, [category?.label || '']),
        createElement('span', { className: 'vlib-card-play' }, [createPlayGlyph(16)]),
        createElement('span', { className: `vlib-card-emblem` }, [
          new Icon({ name: category?.icon || 'layers', size: 64 }).element,
        ]),
      ].filter(Boolean)
    );

    const info = createElement('span', { className: 'vlib-card-info' }, [
      createElement('span', { className: 'vlib-card-title' }, [video.title]),
      createElement('span', { className: 'vlib-card-meta' }, [category?.label || '']),
    ]);

    return createElement(
      'button',
      {
        className: 'vlib-card',
        type: 'button',
        'aria-label': `Video abspielen: ${video.title}`,
        onclick: () => onPlay?.(video),
      },
      [thumb, info]
    );
  }

  get element() {
    return this.#element;
  }
}
