/**
 * User Profile Feature - Main Export
 * Provides complete user profile management with:
 * - Personal information
 * - Address management
 * - Tax information
 * - Bank details
 * - Qualifications (IHK, certifications)
 * - Legal information
 * - Career level with provision rates
 */

// Domain Layer
export { User } from './domain/entities/User.js';
export {
  Address,
  TaxInfo,
  BankInfo,
  Qualifications,
  IHK_QUALIFICATIONS,
  LegalInfo,
  LEGAL_FORMS,
  CareerLevel,
  CAREER_LEVELS,
} from './domain/value-objects/index.js';
export { ProfileService } from './domain/services/ProfileService.js';
export { IUserRepository } from './domain/repositories/IUserRepository.js';

// Data Layer
export { UserFirestoreDataSource } from './data/data-sources/UserFirestoreDataSource.js';
export { FirebaseUserRepository } from './data/repositories/FirebaseUserRepository.js';
