/**
 * Organism: TopicManagerDialog
 * Admin dialog for one area's topic catalog: create, rename, restyle (tint and
 * icon), reorder and delete topics. Works on plain draft objects; nothing is
 * persisted until Speichern hands the whole draft list to onSave.
 *
 * Topics still in use cannot be deleted: the filter chips and the composer
 * select are built from this catalog, and orphaning content silently would
 * make it unfindable by filter.
 */

import { createElement } from '../../../core/utils/index.js';
import { Button } from '../../../features/hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../features/hierarchy-tracking/presentation/components/atoms/Icon.js';
import { TOPIC_ICONS, TOPIC_TINTS, MAX_TOPIC_LABEL_LENGTH } from '../domain/Topic.js';
import { MAX_TOPICS } from '../domain/TopicCatalogService.js';

const CLOSE_MS = 200;

const TINT_LABELS = {
  blue: 'Blau',
  gold: 'Gold',
  green: 'Grün',
  purple: 'Violett',
  teal: 'Petrol',
  slate: 'Grau',
};

const ICON_LABELS = {
  fileText: 'Dokument',
  book: 'Buch',
  copy: 'Kopien',
  layers: 'Ebenen',
  refresh: 'Kreislauf',
  info: 'Info',
  lock: 'Schloss',
  userCheck: 'Person mit Haken',
  users: 'Gruppe',
  briefcase: 'Koffer',
  trendingUp: 'Aufwärtstrend',
  star: 'Stern',
  tag: 'Etikett',
  calendar: 'Kalender',
  video: 'Video',
  chart: 'Diagramm',
};

export class TopicManagerDialog {
  #props;
  #drafts;
  #expandedIndex = null;
  #dirty = false;
  #saving = false;
  #overlay = null;
  #listHost = null;
  #addButton = null;
  #errorHost = null;
  #onKeydown = null;
  #previousFocus = null;

  /**
   * @param {object} props
   * @param {import('../domain/Topic.js').Topic[]} props.topics  current catalog
   * @param {Map<string, number>} props.usage  content count per topic id
   * @param {(count: number) => string} props.formatUsage  e.g. 3 -> "3 Artikel"
   * @param {(drafts: object[]) => Promise<void>} props.onSave  throwing keeps the dialog open
   */
  constructor({ topics, usage, formatUsage, onSave }) {
    this.#props = { usage, formatUsage, onSave };
    this.#drafts = topics.map((topic) => ({ ...topic.toJSON() }));
  }

  open() {
    this.#previousFocus = document.activeElement;

    const titleId = 'topicmgr-title';

    this.#listHost = createElement('div', { className: 'topicmgr-list' });
    this.#errorHost = createElement('p', {
      className: 'portal-editor-error',
      role: 'alert',
      hidden: true,
    });

    this.#addButton = createElement(
      'button',
      { className: 'topicmgr-add', type: 'button', onclick: () => this.#addTopic() },
      [
        new Icon({ name: 'plus', size: 15 }).element,
        createElement('span', {}, ['Neues Thema']),
      ]
    );

    this.#overlay = createElement(
      'div',
      {
        className: 'dialog-overlay',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
      },
      [
        createElement('div', { className: 'dialog-content portal-dialog-wide topicmgr' }, [
          createElement('h2', { className: 'dialog-title', id: titleId }, ['Themen verwalten']),
          createElement('p', { className: 'topicmgr-intro' }, [
            'Themen ordnen die Inhalte und erscheinen als Filter. Farbe und Symbol prägen Chips und Karten.',
          ]),
          this.#listHost,
          this.#addButton,
          this.#errorHost,
          createElement('div', { className: 'editor-actions-bar topicmgr-actions' }, [
            new Button({
              label: 'Abbrechen',
              variant: 'ghost',
              onClick: () => this.#requestClose(),
            }).element,
            new Button({
              label: 'Speichern',
              variant: 'primary',
              icon: new Icon({ name: 'check', size: 15 }).element,
              onClick: () => this.#save(),
            }).element,
          ]),
        ]),
      ]
    );

    this.#onKeydown = (event) => {
      if (event.key === 'Escape') {
        this.#requestClose();
      }
    };

    document.addEventListener('keydown', this.#onKeydown);
    document.body.appendChild(this.#overlay);

    this.#renderList();
    this.#listHost.querySelector('button, input')?.focus();
  }

  #requestClose() {
    if (this.#saving) {
      return;
    }

    if (this.#dirty && !window.confirm('Die Änderungen an den Themen verwerfen?')) {
      return;
    }

    this.close();
  }

  close() {
    if (!this.#overlay) {
      return;
    }

    document.removeEventListener('keydown', this.#onKeydown);

    const overlay = this.#overlay;
    this.#overlay = null;
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), CLOSE_MS);

    this.#previousFocus?.focus?.();
  }

  get isOpen() {
    return this.#overlay !== null;
  }

  // ── list rendering ──

  #renderList() {
    this.#listHost.replaceChildren(
      ...this.#drafts.map((draft, index) =>
        index === this.#expandedIndex ? this.#renderEditor(draft, index) : this.#renderRow(draft, index)
      )
    );

    const full = this.#drafts.length >= MAX_TOPICS;
    this.#addButton.disabled = full;
    this.#addButton.title = full ? `Höchstens ${MAX_TOPICS} Themen möglich.` : '';
  }

  #renderRow(draft, index) {
    const count = draft.id ? this.#props.usage.get(draft.id) || 0 : 0;
    const name = draft.label.trim() || 'Neues Thema';

    return createElement(
      'div',
      { className: 'topicmgr-row', 'data-row': String(index) },
      [
        this.#createReorderTools(index),
        this.#createDisc(draft),
        createElement('div', { className: 'topicmgr-rowmain' }, [
          createElement('span', { className: 'topicmgr-rowlabel' }, [name]),
          createElement('span', { className: 'topicmgr-rowmeta' }, [
            count > 0 ? this.#props.formatUsage(count) : 'Ohne Inhalte',
          ]),
        ]),
        createElement('div', { className: 'topicmgr-rowactions' }, [
          this.#createIconButton('edit', `Thema „${name}" bearbeiten`, () => {
            this.#expandedIndex = index;
            this.#renderList();
            this.#listHost.querySelector('.topicmgr-editor input')?.focus();
          }),
          this.#createDeleteButton(draft, index, count, name),
        ]),
      ]
    );
  }

  #createReorderTools(index) {
    const move = (delta) => {
      const target = index + delta;
      [this.#drafts[index], this.#drafts[target]] = [this.#drafts[target], this.#drafts[index]];

      if (this.#expandedIndex === index) {
        this.#expandedIndex = target;
      } else if (this.#expandedIndex === target) {
        this.#expandedIndex = index;
      }

      this.#markDirty();
      this.#renderList();

      // Keyboard continuity: keep focus on the tool that was just used.
      const tool = delta < 0 ? 'up' : 'down';
      const row = this.#listHost.querySelector(`[data-row="${target}"]`);
      const button = row?.querySelector(`[data-tool="${tool}"]`);
      (button?.disabled ? row?.querySelector('[data-tool]:not(:disabled)') : button)?.focus();
    };

    return createElement('div', { className: 'topicmgr-reorder' }, [
      this.#createIconButton('chevronUp', 'Nach oben schieben', () => move(-1), {
        'data-tool': 'up',
        disabled: index === 0,
      }),
      this.#createIconButton('chevronDown', 'Nach unten schieben', () => move(1), {
        'data-tool': 'down',
        disabled: index === this.#drafts.length - 1,
      }),
    ]);
  }

  #createDeleteButton(draft, index, count, name) {
    const lastTopic = this.#drafts.length === 1;
    const blocked = count > 0 || lastTopic;

    const button = this.#createIconButton('trash', `Thema „${name}" löschen`, () => {
      this.#drafts.splice(index, 1);

      if (this.#expandedIndex !== null && this.#expandedIndex >= index) {
        this.#expandedIndex = this.#expandedIndex === index ? null : this.#expandedIndex - 1;
      }

      this.#markDirty();
      this.#renderList();
    });

    if (blocked) {
      button.disabled = true;
      button.title = lastTopic
        ? 'Mindestens ein Thema muss bestehen bleiben.'
        : `Wird noch verwendet (${this.#props.formatUsage(count)}). Weisen Sie die Inhalte zuerst einem anderen Thema zu.`;
    }

    return button;
  }

  // ── inline editor ──

  #renderEditor(draft, index) {
    const input = createElement('input', {
      className: 'topicmgr-field',
      type: 'text',
      value: draft.label,
      maxlength: String(MAX_TOPIC_LABEL_LENGTH),
      placeholder: 'z. B. Onboarding',
      'aria-label': 'Name des Themas',
      oninput: (event) => {
        draft.label = event.target.value;
        this.#markDirty();
      },
    });

    return createElement(
      'div',
      { className: 'topicmgr-row topicmgr-editor', 'data-row': String(index) },
      [
        createElement('div', { className: 'topicmgr-editor-head' }, [
          this.#createDisc(draft),
          input,
          new Button({
            label: 'Fertig',
            variant: 'secondary',
            size: 'sm',
            onClick: () => {
              this.#expandedIndex = null;
              this.#renderList();
              this.#listHost
                .querySelector(`[data-row="${index}"] .topicmgr-rowactions button`)
                ?.focus();
            },
          }).element,
        ]),
        this.#createChoiceGroup(
          'Farbe',
          TOPIC_TINTS.map((tint) =>
            this.#createChoice({
              className: `topicmgr-swatch topicmgr-swatch--${tint}`,
              label: TINT_LABELS[tint],
              pressed: () => draft.tint === tint,
              onPick: () => {
                draft.tint = tint;
              },
            })
          )
        ),
        this.#createChoiceGroup(
          'Symbol',
          TOPIC_ICONS.map((icon) =>
            this.#createChoice({
              className: 'topicmgr-iconchoice',
              label: ICON_LABELS[icon],
              child: new Icon({ name: icon, size: 18 }).element,
              pressed: () => draft.icon === icon,
              onPick: () => {
                draft.icon = icon;
              },
            })
          )
        ),
      ]
    );
  }

  #createChoiceGroup(title, choices) {
    return createElement('div', { className: 'topicmgr-choicegroup', role: 'group', 'aria-label': title }, [
      createElement('span', { className: 'topicmgr-choicetitle' }, [title]),
      createElement('div', { className: 'topicmgr-choices' }, choices),
    ]);
  }

  /**
   * A pressable choice inside a group. Selection is exclusive within the
   * group's host element; the disc preview repaints via the editor rerender.
   */
  #createChoice({ className, label, child = null, pressed, onPick }) {
    const button = createElement(
      'button',
      {
        className: `${className} ${pressed() ? 'is-selected' : ''}`.trim(),
        type: 'button',
        title: label,
        'aria-label': label,
        'aria-pressed': String(pressed()),
        onclick: () => {
          onPick();
          this.#markDirty();
          this.#repaintEditor(button);
        },
      },
      child ? [child] : []
    );

    return button;
  }

  /** Re-renders the expanded editor in place, keeping focus on the used control. */
  #repaintEditor(usedButton) {
    const label = usedButton.getAttribute('aria-label');
    this.#renderList();

    this.#listHost
      .querySelector(`.topicmgr-editor [aria-label="${label}"]`)
      ?.focus();
  }

  // ── shared pieces ──

  #createDisc(draft) {
    return createElement(
      'span',
      { className: `topicmgr-disc topicmgr-disc--${draft.tint}`, 'aria-hidden': 'true' },
      [new Icon({ name: draft.icon, size: 18 }).element]
    );
  }

  #createIconButton(icon, label, onClick, extra = {}) {
    return createElement(
      'button',
      {
        className: 'topicmgr-tool',
        type: 'button',
        'aria-label': label,
        onclick: onClick,
        ...extra,
      },
      [new Icon({ name: icon, size: 15 }).element]
    );
  }

  #addTopic() {
    this.#drafts.push({ id: null, label: '', icon: 'tag', tint: 'blue' });
    this.#expandedIndex = this.#drafts.length - 1;
    this.#markDirty();
    this.#renderList();
    this.#listHost.querySelector('.topicmgr-editor input')?.focus();
  }

  #markDirty() {
    this.#dirty = true;
    this.#errorHost.hidden = true;
    this.#listHost.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  }

  // ── saving ──

  #validate() {
    const seen = new Map();

    for (let index = 0; index < this.#drafts.length; index += 1) {
      const label = this.#drafts[index].label.trim();

      if (!label) {
        return { index, message: `Thema ${index + 1} braucht noch einen Namen.` };
      }

      const key = label.toLowerCase();
      if (seen.has(key)) {
        return { index, message: `Zwei Themen heißen „${label}". Bitte eindeutige Namen vergeben.` };
      }
      seen.set(key, index);
    }

    return null;
  }

  async #save() {
    if (this.#saving) {
      return;
    }

    const problem = this.#validate();

    if (problem) {
      this.#expandedIndex = problem.index;
      this.#renderList();

      const row = this.#listHost.querySelector(`[data-row="${problem.index}"]`);
      row?.classList.add('is-invalid');
      row?.querySelector('input')?.focus();

      this.#errorHost.textContent = problem.message;
      this.#errorHost.hidden = false;
      return;
    }

    this.#saving = true;
    this.#errorHost.hidden = true;

    try {
      await this.#props.onSave(
        this.#drafts.map((draft) => ({ ...draft, label: draft.label.trim() }))
      );
      this.#saving = false;
      this.#dirty = false;
      this.close();
    } catch (error) {
      this.#saving = false;
      this.#errorHost.textContent =
        'Die Themen konnten nicht gespeichert werden. Bitte erneut versuchen.';
      this.#errorHost.hidden = false;
    }
  }
}
