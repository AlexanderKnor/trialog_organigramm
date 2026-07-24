/**
 * Molecule: BlockPalette
 * The insert menu of the composer, as a card grid rather than a dropdown: an
 * author picks a block by what it looks like and what it is for, so label and
 * purpose are both on the card.
 *
 * Appears in two places with the same markup — parked at the end of the
 * document, or wedged between two blocks after "Block darunter einfügen".
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { BLOCK_PRESETS } from './blockPresets.js';

export function createBlockPalette({ inline = false, onPick, onCancel = null }) {
  const head = createElement(
    'div',
    { className: 'kbcomp-palette-head' },
    [
      createElement('span', {}, [inline ? 'Hier einfügen' : 'Block hinzufügen']),
      inline
        ? createElement(
            'button',
            {
              className: 'kbcomp-tool',
              type: 'button',
              'aria-label': 'Einfügen abbrechen',
              title: 'Einfügen abbrechen',
              onclick: () => onCancel?.(),
            },
            [new Icon({ name: 'close', size: 15 }).element]
          )
        : null,
    ].filter(Boolean)
  );

  const grid = createElement(
    'div',
    { className: 'kbcomp-palette-grid' },
    BLOCK_PRESETS.map((preset) =>
      createElement(
        'button',
        {
          className: 'kbcomp-palette-card',
          type: 'button',
          onclick: () => onPick(preset),
        },
        [
          createElement('span', { className: 'kbcomp-palette-icon' }, [
            new Icon({ name: preset.icon, size: 18 }).element,
          ]),
          createElement('span', { className: 'kbcomp-palette-label' }, [preset.label]),
          createElement('span', { className: 'kbcomp-palette-hint' }, [preset.hint]),
        ]
      )
    )
  );

  return createElement('div', { className: `kbcomp-palette ${inline ? 'is-inline' : ''}`.trim() }, [
    head,
    grid,
  ]);
}
