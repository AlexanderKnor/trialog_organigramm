/**
 * Repository Interface: ITopicRepository
 * Persistence contract for one area's topic catalog.
 */

export class ITopicRepository {
  /** @returns {Promise<import('./Topic.js').Topic[]>} persisted topics, ordered */
  async findAll() {
    throw new Error('ITopicRepository.findAll must be implemented');
  }

  /**
   * Atomically writes the whole catalog: saves every given topic and deletes
   * the documents named in removedIds.
   *
   * @param {import('./Topic.js').Topic[]} topics
   * @param {string[]} removedIds
   */
  async replaceAll(topics, removedIds) {
    throw new Error('ITopicRepository.replaceAll must be implemented');
  }
}
