/**
 * Repository Implementation: FirebaseUserRepository
 * Implements IUserRepository using Firebase Firestore
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { User } from '../../domain/entities/User.js';

export class FirebaseUserRepository extends IUserRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findById(uid) {
    const data = await this.#dataSource.findById(uid);
    return data ? User.fromJSON(data) : null;
  }

  async findByEmail(email) {
    const data = await this.#dataSource.findByEmail(email);
    return data ? User.fromJSON(data) : null;
  }

  async findAll() {
    const data = await this.#dataSource.findAll();
    return data.map((item) => User.fromJSON(item));
  }

  async save(user) {
    const data = user.toJSON();
    await this.#dataSource.save(data);
    return user;
  }

  async update(user) {
    const data = user.toJSON();
    await this.#dataSource.update(data);
    return user;
  }

  async delete(uid) {
    await this.#dataSource.delete(uid);
  }

  async exists(uid) {
    return await this.#dataSource.exists(uid);
  }
}
