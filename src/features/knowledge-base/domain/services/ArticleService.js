/**
 * Domain Service: ArticleService
 * Orchestrates knowledge base article management.
 *
 * No admin check in here: write access is enforced by firestore.rules, and a JS
 * guard would read like enforcement while being trivially bypassable from the
 * console (same reasoning as KnowledgeService).
 */

import { KnowledgeArticle } from '../entities/KnowledgeArticle.js';
import { NotFoundError } from '../../../../core/errors/index.js';
import { Logger } from '../../../../core/utils/logger.js';

export class ArticleService {
  #articleRepository;

  constructor(articleRepository) {
    this.#articleRepository = articleRepository;
  }

  async getAllArticles() {
    return this.#articleRepository.findAll();
  }

  async getArticleById(articleId) {
    const article = await this.#articleRepository.findById(articleId);

    if (!article) {
      throw new NotFoundError('KnowledgeArticle', articleId);
    }

    return article;
  }

  async createArticle(articleData) {
    const article = new KnowledgeArticle(articleData);
    await this.#articleRepository.save(article);
    Logger.log(`✓ Knowledge article created: ${article.title}`);

    return article;
  }

  async updateArticle(articleId, updates) {
    const article = await this.getArticleById(articleId);
    const updated = article.withUpdates(updates);
    await this.#articleRepository.save(updated);
    Logger.log(`✓ Knowledge article updated: ${updated.title}`);

    return updated;
  }

  async deleteArticle(articleId) {
    await this.getArticleById(articleId);
    await this.#articleRepository.delete(articleId);
    Logger.log(`✓ Knowledge article deleted: ${articleId}`);
  }

  /**
   * Case-insensitive match on title, summary, tags and every block's text.
   * Pure filtering over the already-loaded list; no repository round-trip.
   */
  static search(articles, query) {
    const trimmed = (query || '').trim().toLowerCase();

    if (!trimmed) {
      return articles;
    }

    return articles.filter((article) => {
      const haystack = [
        article.title,
        article.summary,
        ...article.tags,
        ...article.blocks.map((block) => block.searchText),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(trimmed);
    });
  }
}
