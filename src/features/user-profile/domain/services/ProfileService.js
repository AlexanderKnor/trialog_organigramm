/**
 * Domain Service: ProfileService
 * Orchestrates user profile operations
 */

import { User } from '../entities/User.js';

export class ProfileService {
  #userRepository;

  constructor(userRepository) {
    this.#userRepository = userRepository;
  }

  async getUserProfile(uid) {
    return await this.#userRepository.findById(uid);
  }

  async getUserByEmail(email) {
    return await this.#userRepository.findByEmail(email);
  }

  async getAllUsers() {
    return await this.#userRepository.findAll();
  }

  async createUser(uid, email, role = 'employee') {
    const user = User.create(uid, email, role);
    await this.#userRepository.save(user);
    return user;
  }

  async save(user) {
    await this.#userRepository.save(user);
    return user;
  }

  async update(user) {
    await this.#userRepository.update(user);
    return user;
  }

  async updatePersonalInfo(uid, personalInfo) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updatePersonalInfo(personalInfo);
    await this.#userRepository.update(user);
    return user;
  }

  async updateAddress(uid, address) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateAddress(address);
    await this.#userRepository.update(user);
    return user;
  }

  async updateTaxInfo(uid, taxInfo) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateTaxInfo(taxInfo);
    await this.#userRepository.update(user);
    return user;
  }

  async updateBankInfo(uid, bankInfo) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateBankInfo(bankInfo);
    await this.#userRepository.update(user);
    return user;
  }

  async updateLegalInfo(uid, legalInfo) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateLegalInfo(legalInfo);
    await this.#userRepository.update(user);
    return user;
  }

  async updateQualifications(uid, qualifications) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateQualifications(qualifications);
    await this.#userRepository.update(user);
    return user;
  }

  async updateCareerLevel(uid, careerLevel) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.updateCareerLevel(careerLevel);
    await this.#userRepository.update(user);
    return user;
  }

  async updateProfileImage(uid, imageUrl) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.setProfileImage(imageUrl);
    await this.#userRepository.update(user);
    return user;
  }

  async linkToHierarchyNode(uid, nodeId) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.linkToNode(nodeId);
    await this.#userRepository.update(user);
    return user;
  }

  async deactivateUser(uid) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.deactivate();
    await this.#userRepository.update(user);
    return user;
  }

  async activateUser(uid) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }

    user.activate();
    await this.#userRepository.update(user);
    return user;
  }

  async checkProfileCompletion(uid) {
    const user = await this.#userRepository.findById(uid);
    if (!user) {
      return { isComplete: false, percentage: 0 };
    }

    return {
      isComplete: user.isProfileComplete,
      percentage: user.profileCompletionPercentage,
    };
  }
}
