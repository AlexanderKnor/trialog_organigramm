/**
 * Repository: FirebaseVideoRepository
 * Maps between LearningVideo entities and their Firestore representation.
 */

import { IVideoRepository } from '../../domain/repositories/IVideoRepository.js';
import { LearningVideo } from '../../domain/entities/LearningVideo.js';

export class FirebaseVideoRepository extends IVideoRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findAll() {
    const data = await this.#dataSource.findAll();

    return data
      .map((item) => LearningVideo.fromJSON(item))
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title, 'de')
      );
  }

  async findById(videoId) {
    const data = await this.#dataSource.findById(videoId);
    return data ? LearningVideo.fromJSON(data) : null;
  }

  async save(video) {
    await this.#dataSource.save(video.toJSON());
    return video;
  }

  async delete(videoId) {
    await this.#dataSource.delete(videoId);
  }
}
