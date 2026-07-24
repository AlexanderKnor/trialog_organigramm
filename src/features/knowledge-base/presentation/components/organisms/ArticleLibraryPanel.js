/**
 * Organism: ArticleLibraryPanel
 * The article library: searchable, filterable by category chip, rendered as a
 * premium card grid with an overlay reader.
 *
 * SECURITY NOTE: the isAdmin checks below only hide affordances; enforcement is
 * firestore.rules (write on knowledge_articles is admin-only).
 */

import { createElement } from '../../../../../core/utils/index.js';
import { authService } from '../../../../../core/auth/index.js';
import { Logger } from '../../../../../core/utils/logger.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { KnowledgeSearchField } from '../../../../knowledge-board/presentation/components/molecules/KnowledgeSearchField.js';
import { TopicManagerDialog } from '../../../../../shared/topics/presentation/TopicManagerDialog.js';
import { ArticleService } from '../../../domain/services/ArticleService.js';
import {
  adoptArticleTopics,
  getAllArticleCategories,
  getArticleCategory,
} from '../../../domain/value-objects/ArticleCategory.js';
import { ArticleCard, ARTICLE_CARD_VARIANTS } from '../molecules/ArticleCard.js';
import { ArticleComposer } from './ArticleComposer.js';
import { ArticleReader } from './ArticleReader.js';

const FILTER_ALL = 'all';

export class ArticleLibraryPanel {
  #articleService;
  #topicService;
  #element;
  #gridHost;
  #chipHost;
  #articles = [];
  #topicCatalog = [];
  #query = '';
  #activeFilter = FILTER_ALL;
  #isAdmin = false;
  #loadFailed = false;
  #reader = new ArticleReader();
  #composer = null;
  #topicManager = null;

  constructor({ articleService, topicService }) {
    this.#articleService = articleService;
    this.#topicService = topicService;
  }

  async initialize() {
    this.#isAdmin = authService.isAdmin();
    await this.#load();
    this.#element = this.#render();
  }

  async #load() {
    try {
      // getCatalog never throws (it degrades to defaults), so a failure here
      // is always the articles themselves.
      const [articles, catalog] = await Promise.all([
        this.#articleService.getAllArticles(),
        this.#topicService.getCatalog(),
      ]);

      this.#articles = articles;
      this.#topicCatalog = catalog;
      adoptArticleTopics(catalog);
      this.#loadFailed = false;
    } catch (error) {
      Logger.error('Failed to load knowledge articles:', error);
      this.#loadFailed = true;
    }

    if (this.#activeFilter !== FILTER_ALL && !getArticleCategory(this.#activeFilter)) {
      this.#activeFilter = FILTER_ALL;
    }
  }

  #render() {
    this.#gridHost = createElement('div', { className: 'kbase-grid-host' });
    this.#chipHost = createElement('div', {
      className: 'portal-chiprow',
      role: 'group',
      'aria-label': 'Nach Kategorie filtern',
    });

    this.#renderChips();
    this.#renderGrid();

    return createElement('section', { className: 'kbase-panel' }, [
      this.#createToolbar(),
      this.#chipHost,
      this.#gridHost,
    ]);
  }

  #createToolbar() {
    const search = new KnowledgeSearchField({
      placeholder: 'Wissensdatenbank durchsuchen',
      onSearch: (query) => {
        this.#query = query;
        this.#renderGrid();
      },
    });

    const children = [search.element];

    if (this.#isAdmin) {
      children.push(
        new Button({
          label: 'Neuer Artikel',
          variant: 'primary',
          size: 'sm',
          icon: new Icon({ name: 'plus', size: 15 }).element,
          onClick: () => this.#openComposer(null),
        }).element
      );
    }

    return createElement('div', { className: 'portal-toolbar' }, children);
  }

  #renderChips() {
    const counts = new Map();
    this.#articles.forEach((article) => {
      counts.set(article.categoryType, (counts.get(article.categoryType) || 0) + 1);
    });

    const chips = [
      this.#createChip(FILTER_ALL, 'Alle', this.#articles.length),
      ...getAllArticleCategories().map((category) =>
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
    this.#articles.forEach((article) => {
      counts.set(article.categoryType, (counts.get(article.categoryType) || 0) + 1);
    });

    this.#topicManager = new TopicManagerDialog({
      topics: this.#topicCatalog,
      usage: counts,
      formatUsage: (count) => (count === 1 ? '1 Artikel' : `${count} Artikel`),
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
          title: 'Wissensdatenbank konnte nicht geladen werden',
          message: 'Die Inhalte sind derzeit nicht abrufbar. Bitte laden Sie die Seite neu.',
        })
      );
      return;
    }

    let visible = ArticleService.search(this.#articles, this.#query);

    if (this.#activeFilter !== FILTER_ALL) {
      visible = visible.filter((article) => article.categoryType === this.#activeFilter);
    }

    if (this.#articles.length === 0) {
      this.#gridHost.replaceChildren(
        this.#createState({
          icon: 'fileText',
          title: 'Noch keine Artikel vorhanden',
          message: this.#isAdmin
            ? 'Legen Sie den ersten Artikel an: Texte, Schritte, Hinweise, Bilder und Videos.'
            : 'Sobald Inhalte bereitstehen, erscheinen sie hier.',
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

    // The leading pinned article becomes the Aufmacher — only in the untouched
    // view, so search and filter results keep their uniform, countable grid.
    const featureLead =
      !this.#query && this.#activeFilter === FILTER_ALL && visible[0].pinned
        ? visible[0]
        : null;
    const gridArticles = featureLead ? visible.slice(1) : visible;

    const nodes = [];

    if (featureLead) {
      nodes.push(
        new ArticleCard(featureLead, {
          variant: ARTICLE_CARD_VARIANTS.FEATURE,
          onOpen: (a) => this.#openReader(a),
        }).element
      );
    }

    if (gridArticles.length > 0) {
      nodes.push(
        createElement(
          'div',
          { className: 'kbase-grid' },
          gridArticles.map(
            (article) => new ArticleCard(article, { onOpen: (a) => this.#openReader(a) }).element
          )
        )
      );
    }

    this.#gridHost.replaceChildren(...nodes);
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

  #openReader(article) {
    this.#reader.open(article, {
      isAdmin: this.#isAdmin,
      onEdit: (a) => {
        this.#reader.close();
        this.#openComposer(a);
      },
      onDelete: (a) => this.#confirmDelete(a),
    });
  }

  async #confirmDelete(article) {
    const confirmed = window.confirm(`Artikel „${article.title}" wirklich löschen?`);

    if (!confirmed) {
      return;
    }

    try {
      await this.#articleService.deleteArticle(article.id);
      this.#reader.close();
      await this.#refresh();
    } catch (error) {
      Logger.error('Failed to delete article:', error);
      window.alert('Der Artikel konnte nicht gelöscht werden.');
    }
  }

  async #refresh() {
    await this.#load();
    this.#renderChips();
    this.#renderGrid();
  }

  /**
   * Writing an article gets its own screen, not a dialog over the library.
   * The composer stays open when saving fails, so nothing written is lost.
   */
  #openComposer(article) {
    this.#composer = new ArticleComposer(article, {
      onSave: async (data) => {
        if (article) {
          await this.#articleService.updateArticle(article.id, data);
        } else {
          await this.#articleService.createArticle(data);
        }

        await this.#refresh();
      },
    });

    this.#composer.open();
  }

  get element() {
    return this.#element;
  }

  destroy() {
    this.#reader.close();
    this.#composer?.close();
    this.#composer = null;
    this.#topicManager?.close();
    this.#topicManager = null;
    this.#element?.remove();
    this.#element = null;
  }
}
