/**
 * Repository Interface: IArticleRepository
 * Persistence contract for knowledge base articles.
 */

export class IArticleRepository {
  async findAll(_includeArchived = false) {
    throw new Error('IArticleRepository.findAll must be implemented');
  }

  async findById(_articleId) {
    throw new Error('IArticleRepository.findById must be implemented');
  }

  async save(_article) {
    throw new Error('IArticleRepository.save must be implemented');
  }

  async delete(_articleId) {
    throw new Error('IArticleRepository.delete must be implemented');
  }
}
