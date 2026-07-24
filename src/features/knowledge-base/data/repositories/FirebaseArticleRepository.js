/**
 * Repository: FirebaseArticleRepository
 * Maps between KnowledgeArticle entities and their Firestore representation.
 *
 * No try/catch by design: the data source wraps failures as StorageError and
 * the presentation layer is the single catch site.
 */

import { IArticleRepository } from '../../domain/repositories/IArticleRepository.js';
import { KnowledgeArticle, ARTICLE_STATUS } from '../../domain/entities/KnowledgeArticle.js';

export class FirebaseArticleRepository extends IArticleRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findAll(includeArchived = false) {
    const data = await this.#dataSource.findAll();

    return data
      .map((item) => KnowledgeArticle.fromJSON(item))
      .filter((article) => includeArchived || article.status === ARTICLE_STATUS.PUBLISHED)
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.updatedAt.localeCompare(a.updatedAt) ||
          a.title.localeCompare(b.title, 'de')
      );
  }

  async findById(articleId) {
    const data = await this.#dataSource.findById(articleId);
    return data ? KnowledgeArticle.fromJSON(data) : null;
  }

  async save(article) {
    await this.#dataSource.save(article.toJSON());
    return article;
  }

  async delete(articleId) {
    await this.#dataSource.delete(articleId);
  }
}
