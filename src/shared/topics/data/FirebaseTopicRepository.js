/**
 * Repository: FirebaseTopicRepository
 * Maps between Topic value objects and their Firestore representation.
 *
 * No try/catch by design: the data source wraps failures as StorageError and
 * the presentation layer is the single catch site.
 */

import { ITopicRepository } from '../domain/ITopicRepository.js';
import { Topic } from '../domain/Topic.js';

export class FirebaseTopicRepository extends ITopicRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findAll() {
    const data = await this.#dataSource.findAll();

    return data
      .map((item) => Topic.fromJSON(item))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'de'));
  }

  async replaceAll(topics, removedIds) {
    await this.#dataSource.replaceAll(
      topics.map((topic) => topic.toJSON()),
      removedIds
    );
  }
}
