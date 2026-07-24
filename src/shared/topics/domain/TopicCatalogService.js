/**
 * Domain Service: TopicCatalogService
 * Manages one area's topic catalog. Write access is enforced by
 * firestore.rules, not here (see ArticleService for the reasoning).
 *
 * The catalog starts life as the area's built-in defaults: until an admin
 * saves for the first time, the Firestore collection is empty and getCatalog
 * falls back to the defaults. The first save persists the whole edited catalog,
 * from then on Firestore is the single source of truth.
 */

import { Topic } from './Topic.js';
import { ValidationError } from '../../../core/errors/index.js';
import { Logger } from '../../../core/utils/logger.js';

export const MAX_TOPICS = 12;

export class TopicCatalogService {
  #topicRepository;
  #defaults;

  /**
   * @param {import('./ITopicRepository.js').ITopicRepository} topicRepository
   * @param {{defaults: Array<{id: string, label: string, icon: string, tint: string}>}} config
   */
  constructor(topicRepository, { defaults }) {
    this.#topicRepository = topicRepository;
    this.#defaults = defaults.map((data, index) => new Topic({ ...data, order: index }));
  }

  /**
   * The active catalog, never empty and never throwing: a broken chip row must
   * not take a whole content area down, so read failures degrade to the
   * defaults. Writes (saveCatalog) still surface their errors.
   *
   * @returns {Promise<Topic[]>}
   */
  async getCatalog() {
    try {
      const persisted = await this.#topicRepository.findAll();

      if (persisted.length > 0) {
        return persisted;
      }
    } catch (error) {
      Logger.error('Topic catalog unavailable, using defaults:', error);
    }

    return [...this.#defaults];
  }

  /**
   * Persists the full catalog in the given order and deletes topics that were
   * persisted before but are no longer in the draft list.
   *
   * @param {Array<{id?: string|null, label: string, icon: string, tint: string}>} drafts
   * @returns {Promise<Topic[]>} the saved catalog
   */
  async saveCatalog(drafts) {
    this.#validateDrafts(drafts);

    const topics = drafts.map(
      (draft, index) =>
        new Topic({
          id: draft.id || null,
          label: draft.label,
          icon: draft.icon,
          tint: draft.tint,
          order: index,
        })
    );

    const persisted = await this.#topicRepository.findAll();
    const keptIds = new Set(topics.map((topic) => topic.id));
    const removedIds = persisted
      .map((topic) => topic.id)
      .filter((id) => !keptIds.has(id));

    await this.#topicRepository.replaceAll(topics, removedIds);
    Logger.log(`✓ Topic catalog saved: ${topics.length} topics, ${removedIds.length} removed`);

    return topics;
  }

  #validateDrafts(drafts) {
    if (!Array.isArray(drafts) || drafts.length === 0) {
      throw new ValidationError('A topic catalog needs at least one topic', 'topics');
    }

    if (drafts.length > MAX_TOPICS) {
      throw new ValidationError(`A topic catalog must not exceed ${MAX_TOPICS} topics`, 'topics');
    }

    const labels = drafts.map((draft) => String(draft.label || '').trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      throw new ValidationError('Topic labels must be unique', 'topics');
    }
  }
}
