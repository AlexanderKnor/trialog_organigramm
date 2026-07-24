/**
 * Domain Service: LearningLibraryService
 * Orchestrates learning video management. Write access is enforced by
 * firestore.rules, not here (see ArticleService for the reasoning).
 */

import { LearningVideo } from '../entities/LearningVideo.js';
import { NotFoundError } from '../../../../core/errors/index.js';
import { Logger } from '../../../../core/utils/logger.js';

export class LearningLibraryService {
  #videoRepository;

  constructor(videoRepository) {
    this.#videoRepository = videoRepository;
  }

  async getAllVideos() {
    return this.#videoRepository.findAll();
  }

  async getVideoById(videoId) {
    const video = await this.#videoRepository.findById(videoId);

    if (!video) {
      throw new NotFoundError('LearningVideo', videoId);
    }

    return video;
  }

  async createVideo(videoData) {
    const video = new LearningVideo(videoData);
    await this.#videoRepository.save(video);
    Logger.log(`✓ Learning video created: ${video.title}`);

    return video;
  }

  async updateVideo(videoId, updates) {
    const video = await this.getVideoById(videoId);
    const updated = video.withUpdates(updates);
    await this.#videoRepository.save(updated);
    Logger.log(`✓ Learning video updated: ${updated.title}`);

    return updated;
  }

  async deleteVideo(videoId) {
    await this.getVideoById(videoId);
    await this.#videoRepository.delete(videoId);
    Logger.log(`✓ Learning video deleted: ${videoId}`);
  }

  /** Case-insensitive match on the title over the loaded list. */
  static search(videos, query) {
    const trimmed = (query || '').trim().toLowerCase();

    if (!trimmed) {
      return videos;
    }

    return videos.filter((video) => video.title.toLowerCase().includes(trimmed));
  }
}
