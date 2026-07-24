/**
 * Molecule: ArticleBlockEditor
 * The editing surface of a single block inside the composer.
 *
 * It mutates its draft object in place and reports only structural intent
 * (move, duplicate, remove, insert) upwards: the composer owns the block array,
 * this owns one block's fields. Item lists inside a block (list points, process
 * steps) are re-rendered locally, so typing in one block never rebuilds the
 * whole document and never steals the caret.
 */

import { autoGrowTextarea, createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import {
  ARTICLE_BLOCK_TYPES,
  CALLOUT_TONES,
  HEADING_LEVELS,
} from '../../../domain/value-objects/ArticleBlock.js';
import { getBlockPreset } from './blockPresets.js';

const CALLOUT_OPTIONS = Object.freeze([
  { value: CALLOUT_TONES.INFO, label: 'Hinweis' },
  { value: CALLOUT_TONES.SUCCESS, label: 'Empfehlung' },
  { value: CALLOUT_TONES.WARNING, label: 'Achtung' },
  { value: CALLOUT_TONES.DANGER, label: 'Kritisch' },
]);

const MAX_ITEMS = 20;

export class ArticleBlockEditor {
  #draft;
  #props;
  #element;

  constructor(draft, props = {}) {
    this.#draft = draft;
    this.#props = {
      index: props.index || 0,
      total: props.total || 1,
      onMove: props.onMove || null,
      onRemove: props.onRemove || null,
      onDuplicate: props.onDuplicate || null,
      onInsertAfter: props.onInsertAfter || null,
      onDirty: props.onDirty || null,
    };

    this.#element = this.#render();
  }

  #render() {
    const preset = getBlockPreset(this.#draft.type);

    return createElement('section', { className: 'kbcomp-block', dataset: { type: this.#draft.type } }, [
      createElement('header', { className: 'kbcomp-block-bar' }, [
        createElement('span', { className: 'kbcomp-block-kind' }, [
          new Icon({ name: preset.icon, size: 15 }).element,
          createElement('span', {}, [preset.label]),
        ]),
        createElement('span', { className: 'kbcomp-block-no' }, [`Block ${this.#props.index + 1}`]),
        this.#createTools(),
      ]),
      createElement('div', { className: 'kbcomp-block-fields' }, this.#createFields()),
      createElement('div', { className: 'kbcomp-block-foot' }, [
        this.#createGhostButton('plus', 'Block darunter einfügen', () =>
          this.#props.onInsertAfter?.(this.#props.index)
        ),
      ]),
    ]);
  }

  #createTools() {
    const { index, total } = this.#props;

    return createElement('div', { className: 'kbcomp-block-tools' }, [
      this.#createTool('chevronUp', 'Nach oben', () => this.#props.onMove?.(index, -1), {
        disabled: index === 0,
        tool: 'up',
      }),
      this.#createTool('chevronDown', 'Nach unten', () => this.#props.onMove?.(index, 1), {
        disabled: index === total - 1,
        tool: 'down',
      }),
      this.#createTool('copy', 'Duplizieren', () => this.#props.onDuplicate?.(index)),
      this.#createTool('trash', 'Entfernen', () => this.#props.onRemove?.(index)),
    ]);
  }

  #createTool(icon, label, onClick, { disabled = false, tool = null } = {}) {
    return createElement(
      'button',
      {
        className: 'kbcomp-tool',
        type: 'button',
        'aria-label': label,
        title: label,
        disabled,
        dataset: tool ? { tool } : {},
        onclick: onClick,
      },
      [new Icon({ name: icon, size: 15 }).element]
    );
  }

  #createGhostButton(icon, label, onClick) {
    return createElement('button', { className: 'kbcomp-ghost-btn', type: 'button', onclick: onClick }, [
      new Icon({ name: icon, size: 14 }).element,
      createElement('span', {}, [label]),
    ]);
  }

  #change() {
    this.#props.onDirty?.();
  }

  #createTextarea({ value, placeholder, rows = 3, onInput, className = '' }) {
    const textarea = createElement('textarea', {
      className: `kbcomp-field kbcomp-field--area ${className}`.trim(),
      rows,
      placeholder,
      oninput: (event) => {
        onInput(event.target.value);
        autoGrowTextarea(event.target);
        this.#change();
      },
    });
    textarea.value = value || '';

    return textarea;
  }

  #createInput({ value, placeholder, type = 'text', onInput, className = '', onEnter = null }) {
    return createElement('input', {
      className: `kbcomp-field ${className}`.trim(),
      type,
      placeholder,
      value: value || '',
      oninput: (event) => {
        onInput(event.target.value);
        this.#change();
      },
      onkeydown: (event) => {
        if (onEnter && event.key === 'Enter') {
          event.preventDefault();
          onEnter();
        }
      },
    });
  }

  #createSegmented(options, current, onPick) {
    const group = createElement('div', { className: 'kbcomp-segmented', role: 'group' });

    group.replaceChildren(
      ...options.map((option) =>
        createElement(
          'button',
          {
            className: `kbcomp-segment ${option.value === current ? 'is-active' : ''}`.trim(),
            type: 'button',
            'aria-pressed': String(option.value === current),
            onclick: () => {
              onPick(option.value);
              group
                .querySelectorAll('.kbcomp-segment')
                .forEach((button, position) => {
                  const active = options[position].value === option.value;
                  button.classList.toggle('is-active', active);
                  button.setAttribute('aria-pressed', String(active));
                });
              this.#change();
            },
          },
          [option.label]
        )
      )
    );

    return group;
  }

  #createLabelled(label, ...fields) {
    return createElement('label', { className: 'kbcomp-labelled' }, [
      createElement('span', { className: 'kbcomp-field-label' }, [label]),
      ...fields,
    ]);
  }

  /** A label wrapping exactly one control, which is what associates the two. */
  #labelledInput(label, options, hint = null) {
    return this.#createLabelled(
      label,
      this.#createInput(options),
      hint ? createElement('span', { className: 'kbcomp-field-hint' }, [hint]) : null
    );
  }

  #labelledArea(label, options) {
    return this.#createLabelled(label, this.#createTextarea(options));
  }

  /** Live preview so a wrong or dead URL is visible while typing, not after saving. */
  #createImagePreview() {
    const preview = createElement('img', { className: 'kbcomp-preview-image', alt: '', hidden: true });

    const update = (url) => {
      const trimmed = (url || '').trim();

      if (!trimmed) {
        preview.hidden = true;
        return;
      }

      preview.onerror = () => {
        preview.hidden = true;
      };
      preview.onload = () => {
        preview.hidden = false;
      };
      preview.src = trimmed;
    };

    update(this.#draft.url);

    return { preview, update };
  }

  #createFields() {
    const draft = this.#draft;

    switch (draft.type) {
      case ARTICLE_BLOCK_TYPES.HEADING:
        return [
          this.#createInput({
            value: draft.text,
            placeholder: 'Abschnittstitel',
            className: 'kbcomp-field--title',
            onInput: (value) => {
              draft.text = value;
            },
          }),
          this.#createLabelled(
            'Ebene',
            this.#createSegmented(
              HEADING_LEVELS.map((level) => ({ value: level, label: `H${level}` })),
              draft.level,
              (level) => {
                draft.level = level;
              }
            )
          ),
        ];

      case ARTICLE_BLOCK_TYPES.LIST:
        return [
          this.#createSegmented(
            [
              { value: false, label: 'Aufzählung' },
              { value: true, label: 'Nummeriert' },
            ],
            Boolean(draft.ordered),
            (ordered) => {
              draft.ordered = ordered;
            }
          ),
          this.#createItemsHost(),
        ];

      case ARTICLE_BLOCK_TYPES.STEPS:
        return [this.#createItemsHost()];

      case ARTICLE_BLOCK_TYPES.CALLOUT:
        return [
          this.#createSegmented(CALLOUT_OPTIONS, draft.tone, (tone) => {
            draft.tone = tone;
          }),
          this.#labelledInput('Titel (optional)', {
            value: draft.title,
            placeholder: 'Ohne Titel steht hier die Tonart, etwa Achtung',
            onInput: (value) => {
              draft.title = value;
            },
          }),
          this.#labelledArea('Text', {
            value: draft.text,
            placeholder: 'Worauf muss das Team achten?',
            onInput: (value) => {
              draft.text = value;
            },
          }),
        ];

      case ARTICLE_BLOCK_TYPES.QUOTE:
        return [
          this.#labelledArea('Zitat', {
            value: draft.text,
            placeholder: 'Zitierte Aussage',
            className: 'kbcomp-field--quote',
            onInput: (value) => {
              draft.text = value;
            },
          }),
          this.#labelledInput('Quelle (optional)', {
            value: draft.attribution,
            placeholder: 'z. B. Geschäftsführung',
            onInput: (value) => {
              draft.attribution = value;
            },
          }),
        ];

      case ARTICLE_BLOCK_TYPES.IMAGE: {
        const { preview, update } = this.#createImagePreview();

        return [
          this.#labelledInput('Bildadresse', {
            value: draft.url,
            type: 'url',
            placeholder: 'https://…',
            onInput: (value) => {
              draft.url = value;
              update(value);
            },
          }),
          preview,
          this.#labelledInput('Bildunterschrift (optional)', {
            value: draft.caption,
            placeholder: 'Was ist zu sehen?',
            onInput: (value) => {
              draft.caption = value;
            },
          }),
        ];
      }

      case ARTICLE_BLOCK_TYPES.VIDEO:
        return [
          this.#labelledInput(
            'Videolink',
            {
              value: draft.url,
              type: 'url',
              placeholder: 'https://www.loom.com/share/…',
              onInput: (value) => {
                draft.url = value;
              },
            },
            'Loom, YouTube und Vimeo werden erkannt. Das Video erscheint direkt im Artikel.'
          ),
          this.#labelledInput('Bildunterschrift (optional)', {
            value: draft.caption,
            placeholder: 'Worum geht es im Video?',
            onInput: (value) => {
              draft.caption = value;
            },
          }),
        ];

      case ARTICLE_BLOCK_TYPES.LINK:
        return [
          this.#labelledInput('Bezeichnung', {
            value: draft.label,
            placeholder: 'z. B. Antragsformular BU',
            className: 'kbcomp-field--title',
            onInput: (value) => {
              draft.label = value;
            },
          }),
          this.#labelledInput('Ziel', {
            value: draft.url,
            type: 'url',
            placeholder: 'https://…',
            onInput: (value) => {
              draft.url = value;
            },
          }),
          this.#labelledInput('Erläuterung (optional)', {
            value: draft.description,
            placeholder: 'Ein Satz, was den Nutzer dort erwartet',
            onInput: (value) => {
              draft.description = value;
            },
          }),
        ];

      case ARTICLE_BLOCK_TYPES.DIVIDER:
        return [
          createElement('p', { className: 'kbcomp-field-hint' }, [
            'Setzt eine sichtbare Zäsur zwischen zwei Abschnitten.',
          ]),
        ];

      default:
        return [
          this.#createTextarea({
            value: draft.text,
            placeholder: 'Absatztext. Zeilenumbrüche bleiben erhalten.',
            rows: 4,
            onInput: (value) => {
              draft.text = value;
            },
          }),
        ];
    }
  }

  #createItemsHost() {
    const host = createElement('div', { className: 'kbcomp-items' });
    const isSteps = this.#draft.type === ARTICLE_BLOCK_TYPES.STEPS;

    const addItem = () => {
      if (this.#draft.items.length >= MAX_ITEMS) {
        return;
      }

      this.#draft.items.push(isSteps ? { title: '', text: '' } : '');
      renderItems();
      this.#change();

      const inputs = host.querySelectorAll('.kbcomp-item input');
      inputs[inputs.length - 1]?.focus();
    };

    const renderItems = () => {
      host.replaceChildren(
        ...this.#draft.items.map((item, index) => this.#createItemRow(item, index, isSteps, renderItems, addItem)),
        this.#createGhostButton('plus', isSteps ? 'Schritt hinzufügen' : 'Punkt hinzufügen', addItem)
      );
    };

    renderItems();

    return host;
  }

  #createItemRow(item, index, isSteps, renderItems, addItem) {
    const remove = this.#createTool('close', 'Entfernen', () => {
      this.#draft.items.splice(index, 1);

      if (this.#draft.items.length === 0) {
        this.#draft.items.push(isSteps ? { title: '', text: '' } : '');
      }

      renderItems();
      this.#change();
    });

    if (!isSteps) {
      return createElement('div', { className: 'kbcomp-item' }, [
        createElement('span', { className: 'kbcomp-item-index' }, [String(index + 1)]),
        this.#createInput({
          value: item,
          placeholder: 'Listenpunkt',
          onEnter: addItem,
          onInput: (value) => {
            this.#draft.items[index] = value;
          },
        }),
        remove,
      ]);
    }

    return createElement('div', { className: 'kbcomp-item kbcomp-item--step' }, [
      createElement('span', { className: 'kbcomp-item-index' }, [String(index + 1)]),
      createElement('div', { className: 'kbcomp-item-body' }, [
        this.#createInput({
          value: item.title,
          placeholder: 'Was ist zu tun?',
          className: 'kbcomp-field--title',
          onInput: (value) => {
            item.title = value;
          },
        }),
        this.#createTextarea({
          value: item.text,
          rows: 2,
          placeholder: 'Erläuterung (optional)',
          onInput: (value) => {
            item.text = value;
          },
        }),
      ]),
      remove,
    ]);
  }

  /** Textareas can only be sized once they are in the document. */
  mounted() {
    this.#element.querySelectorAll('textarea').forEach(autoGrowTextarea);
  }

  focusFirstField() {
    this.#element.querySelector('input, textarea')?.focus();
  }

  /** After a move the row is a new element; the keyboard must not lose its place. */
  focusTool(tool) {
    const button = this.#element.querySelector(`[data-tool="${tool}"]`);
    (button?.disabled ? this.#element.querySelector('.kbcomp-tool:not(:disabled)') : button)?.focus();
  }

  markInvalid(isInvalid) {
    this.#element.classList.toggle('is-invalid', isInvalid);
  }

  get element() {
    return this.#element;
  }
}
