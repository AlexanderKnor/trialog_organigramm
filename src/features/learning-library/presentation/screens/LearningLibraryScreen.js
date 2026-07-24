/**
 * Screen: LearningLibraryScreen
 * The video learning area of the portal: a filterable premium grid of
 * recordings, played in a cinema overlay.
 *
 * SECURITY NOTE: isAdmin only hides affordances here; write access to
 * learning_videos is enforced by firestore.rules.
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { KnowledgeSearchField } from '../../../knowledge-board/presentation/components/molecules/KnowledgeSearchField.js';
import { TopicManagerDialog } from '../../../../shared/topics/presentation/TopicManagerDialog.js';
import { LearningLibraryService } from '../../domain/services/LearningLibraryService.js';
import {
  adoptVideoTopics,
  getAllVideoCategories,
  getVideoCategory,
} from '../../domain/value-objects/VideoCategory.js';
import { VideoCard } from '../components/molecules/VideoCard.js';
import { VideoEditor } from '../components/molecules/VideoEditor.js';
import { VideoPlayerDialog } from '../components/organisms/VideoPlayerDialog.js';

const DIALOG_CLOSE_MS = 200;
const FILTER_ALL = 'all';

export class LearningLibraryScreen {
  #container;
  #libraryService;
  #topicService;
  #gridHost;
  #chipHost;
  #videos = [];
  #topicCatalog = [];
  #query = '';
  #activeFilter = FILTER_ALL;
  #isAdmin = false;
  #loadFailed = false;
  #player = new VideoPlayerDialog();
  #topicManager = null;

  constructor(container, libraryService, topicService) {
    this.#container =
      typeof container === 'string' ? document.querySelector(container) : container;
    this.#libraryService = libraryService;
    this.#topicService = topicService;
  }

  async mount() {
    clearElement(this.#container);

    this.#isAdmin = authService.isAdmin();
    await this.#load();

    this.#container.appendChild(this.#render());
  }

  async #load() {
    try {
      // getCatalog never throws (it degrades to defaults), so a failure here
      // is always the videos themselves.
      const [videos, catalog] = await Promise.all([
        this.#libraryService.getAllVideos(),
        this.#topicService.getCatalog(),
      ]);

      this.#videos = videos;
      this.#topicCatalog = catalog;
      adoptVideoTopics(catalog);
      this.#loadFailed = false;
    } catch (error) {
      Logger.error('Failed to load learning videos:', error);
      this.#loadFailed = true;
    }

    if (this.#activeFilter !== FILTER_ALL && !getVideoCategory(this.#activeFilter)) {
      this.#activeFilter = FILTER_ALL;
    }
  }

  #render() {
    this.#gridHost = createElement('div', { className: 'vlib-grid-host' });
    this.#chipHost = createElement('div', {
      className: 'portal-chiprow',
      role: 'group',
      'aria-label': 'Nach Kategorie filtern',
    });

    this.#renderChips();
    this.#renderGrid();

    // The persistent IntranetShell owns the frame and page head; the screen
    // only renders its content column.
    return createElement('div', { className: 'vlib-screen' }, [
      this.#createToolbar(),
      this.#chipHost,
      this.#gridHost,
    ]);
  }

  #createToolbar() {
    const search = new KnowledgeSearchField({
      placeholder: 'Videothek durchsuchen',
      onSearch: (query) => {
        this.#query = query;
        this.#renderGrid();
      },
    });

    const children = [search.element];

    if (this.#isAdmin) {
      children.push(
        new Button({
          label: 'Neues Video',
          variant: 'primary',
          size: 'sm',
          icon: new Icon({ name: 'plus', size: 15 }).element,
          onClick: () => this.#showEditorDialog(null),
        }).element
      );
    }

    return createElement('div', { className: 'portal-toolbar' }, children);
  }

  #renderChips() {
    const counts = new Map();
    this.#videos.forEach((video) => {
      counts.set(video.categoryType, (counts.get(video.categoryType) || 0) + 1);
    });

    const chips = [
      this.#createChip(FILTER_ALL, 'Alle', this.#videos.length),
      ...getAllVideoCategories().map((category) =>
        this.#createChip(category.type, category.label, counts.get(category.type) || 0)
      ),
    ];

    if (this.#isAdmin) {
      chips.push(this.#createManageChip());
    }

    this.#chipHost.replaceChildren(...chips);
  }

  #createManageChip() {
    return createElement(
      'button',
      {
        className: 'portal-filter-chip portal-filter-chip--manage',
        type: 'button',
        onclick: () => this.#openTopicManager(),
      },
      [
        new Icon({ name: 'settings', size: 14 }).element,
        createElement('span', {}, ['Themen verwalten']),
      ]
    );
  }

  #openTopicManager() {
    const counts = new Map();
    this.#videos.forEach((video) => {
      counts.set(video.categoryType, (counts.get(video.categoryType) || 0) + 1);
    });

    this.#topicManager = new TopicManagerDialog({
      topics: this.#topicCatalog,
      usage: counts,
      formatUsage: (count) => (count === 1 ? '1 Video' : `${count} Videos`),
      onSave: async (drafts) => {
        await this.#topicService.saveCatalog(drafts);
        await this.#refresh();
      },
    });

    this.#topicManager.open();
  }

  #createChip(value, label, count) {
    const isActive = this.#activeFilter === value;

    return createElement(
      'button',
      {
        className: `portal-filter-chip ${isActive ? 'is-active' : ''}`.trim(),
        type: 'button',
        'aria-pressed': String(isActive),
        onclick: () => {
          this.#activeFilter = value;
          this.#renderChips();
          this.#renderGrid();
        },
      },
      [
        createElement('span', {}, [label]),
        createElement('span', { className: 'portal-filter-count' }, [String(count)]),
      ]
    );
  }

  #renderGrid() {
    if (this.#loadFailed) {
      this.#gridHost.replaceChildren(
        this.#createState({
          icon: 'alertCircle',
          title: 'Videothek konnte nicht geladen werden',
          message: 'Die Inhalte sind derzeit nicht abrufbar. Bitte laden Sie die Seite neu.',
        })
      );
      return;
    }

    let visible = LearningLibraryService.search(this.#videos, this.#query);

    if (this.#activeFilter !== FILTER_ALL) {
      visible = visible.filter((video) => video.categoryType === this.#activeFilter);
    }

    if (this.#videos.length === 0) {
      this.#gridHost.replaceChildren(
        this.#createState({
          icon: 'eye',
          title: 'Noch keine Videos vorhanden',
          message: this.#isAdmin
            ? 'Fügen Sie die erste Loom-Aufnahme hinzu – sie wird direkt im Portal abgespielt.'
            : 'Sobald Schulungsvideos bereitstehen, erscheinen sie hier.',
        })
      );
      return;
    }

    if (visible.length === 0) {
      this.#gridHost.replaceChildren(
        this.#createState({
          icon: 'search',
          title: 'Keine Treffer',
          message: 'Passen Sie Suche oder Kategorie an.',
        })
      );
      return;
    }

    const grid = createElement(
      'div',
      { className: 'vlib-grid' },
      visible.map((video) => new VideoCard(video, { onPlay: (v) => this.#openPlayer(v) }).element)
    );

    this.#gridHost.replaceChildren(grid);
  }

  #createState({ icon, title, message }) {
    return createElement('div', { className: 'portal-state' }, [
      createElement('span', { className: 'portal-state-icon' }, [
        new Icon({ name: icon, size: 26 }).element,
      ]),
      createElement('h3', { className: 'portal-state-title' }, [title]),
      createElement('p', { className: 'portal-state-message' }, [message]),
    ]);
  }

  #openPlayer(video) {
    this.#player.open(video, {
      isAdmin: this.#isAdmin,
      onEdit: (v) => {
        this.#player.close();
        this.#showEditorDialog(v);
      },
      onDelete: (v) => this.#confirmDelete(v),
    });
  }

  async #confirmDelete(video) {
    const confirmed = window.confirm(`Video „${video.title}" wirklich löschen?`);

    if (!confirmed) {
      return;
    }

    try {
      await this.#libraryService.deleteVideo(video.id);
      this.#player.close();
      await this.#refresh();
    } catch (error) {
      Logger.error('Failed to delete video:', error);
      window.alert('Das Video konnte nicht gelöscht werden.');
    }
  }

  async #refresh() {
    await this.#load();
    this.#renderChips();
    this.#renderGrid();
  }

  #showEditorDialog(video) {
    let close;

    const editor = new VideoEditor(video, {
      onSave: async (data) => {
        try {
          if (video) {
            await this.#libraryService.updateVideo(video.id, data);
          } else {
            await this.#libraryService.createVideo(data);
          }
        } catch (error) {
          Logger.error('Failed to save video:', error);
          editor.showError(error.message || 'Das Video konnte nicht gespeichert werden.');
          return;
        }

        close();
        await this.#refresh();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: video ? 'Video bearbeiten' : 'Neues Video',
      editor,
    });
  }

  #openDialog({ title, editor }) {
    const titleId = 'vlib-dialog-title';

    const overlay = createElement('div', {
      className: 'dialog-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    });

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };

    const closeDialog = () => {
      document.removeEventListener('keydown', onKeydown);
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), DIALOG_CLOSE_MS);
    };

    overlay.appendChild(
      createElement('div', { className: 'dialog-content portal-dialog-wide' }, [
        createElement('h2', { className: 'dialog-title', id: titleId }, [title]),
        editor.element,
      ])
    );

    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    editor.focus();

    return closeDialog;
  }

  unmount() {
    this.#player.close();
    this.#topicManager?.close();
    this.#topicManager = null;
    clearElement(this.#container);
  }
}
