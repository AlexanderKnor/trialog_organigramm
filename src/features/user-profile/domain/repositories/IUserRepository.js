/**
 * Repository Interface: IUserRepository
 * Contract for user/profile data persistence
 */

export class IUserRepository {
  async findById(uid) {
    throw new Error('Method not implemented');
  }

  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  async findAll() {
    throw new Error('Method not implemented');
  }

  async save(user) {
    throw new Error('Method not implemented');
  }

  async update(user) {
    throw new Error('Method not implemented');
  }

  async delete(uid) {
    throw new Error('Method not implemented');
  }

  async exists(uid) {
    throw new Error('Method not implemented');
  }
}
