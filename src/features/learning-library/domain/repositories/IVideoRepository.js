/**
 * Repository Interface: IVideoRepository
 * Persistence contract for learning library videos.
 */

export class IVideoRepository {
  async findAll() {
    throw new Error('IVideoRepository.findAll must be implemented');
  }

  async findById(_videoId) {
    throw new Error('IVideoRepository.findById must be implemented');
  }

  async save(_video) {
    throw new Error('IVideoRepository.save must be implemented');
  }

  async delete(_videoId) {
    throw new Error('IVideoRepository.delete must be implemented');
  }
}
