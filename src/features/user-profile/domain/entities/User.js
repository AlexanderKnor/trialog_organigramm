/**
 * Entity: User
 * Complete user/employee profile with all business information
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { Address } from '../value-objects/Address.js';
import { TaxInfo } from '../value-objects/TaxInfo.js';
import { BankInfo } from '../value-objects/BankInfo.js';
import { Qualifications } from '../value-objects/Qualifications.js';
import { LegalInfo } from '../value-objects/LegalInfo.js';
import { CareerLevel } from '../value-objects/CareerLevel.js';

export class User {
  #uid;
  #email;
  #role;

  // Personal Information
  #firstName;
  #lastName;
  #birthDate;
  #phone;
  #profileImageUrl;

  // Address
  #address;

  // Tax Information
  #taxInfo;

  // Bank Information
  #bankInfo;

  // Legal Information
  #legalInfo;

  // Qualifications
  #qualifications;

  // Career Level (Rang with provisions)
  #careerLevel;

  // Linked Hierarchy Node
  #linkedNodeId;

  // Metadata
  #createdAt;
  #updatedAt;
  #isActive;

  constructor({
    uid,
    email,
    role = 'employee',
    firstName = '',
    lastName = '',
    birthDate = null,
    phone = '',
    profileImageUrl = null,
    address = null,
    taxInfo = null,
    bankInfo = null,
    legalInfo = null,
    qualifications = null,
    careerLevel = null,
    linkedNodeId = null,
    createdAt = null,
    updatedAt = null,
    isActive = true,
  }) {
    this.#validateEmail(email);

    this.#uid = uid;
    this.#email = email.toLowerCase().trim();
    this.#role = role;

    this.#firstName = firstName;
    this.#lastName = lastName;
    this.#birthDate = birthDate ? new Date(birthDate) : null;
    this.#phone = phone;
    this.#profileImageUrl = profileImageUrl;

    this.#address = address instanceof Address ? address : Address.fromJSON(address);
    this.#taxInfo = taxInfo instanceof TaxInfo ? taxInfo : TaxInfo.fromJSON(taxInfo);
    this.#bankInfo = bankInfo instanceof BankInfo ? bankInfo : BankInfo.fromJSON(bankInfo);
    this.#legalInfo = legalInfo instanceof LegalInfo ? legalInfo : LegalInfo.fromJSON(legalInfo);
    this.#qualifications = qualifications instanceof Qualifications
      ? qualifications
      : Qualifications.fromJSON(qualifications);
    this.#careerLevel = careerLevel instanceof CareerLevel
      ? careerLevel
      : CareerLevel.fromJSON(careerLevel);

    this.#linkedNodeId = linkedNodeId;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    this.#isActive = Boolean(isActive);
  }

  #validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email ist erforderlich', 'email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Email-Format ungültig', 'email');
    }
  }

  // Getters
  get uid() { return this.#uid; }
  get email() { return this.#email; }
  get role() { return this.#role; }
  get firstName() { return this.#firstName; }
  get lastName() { return this.#lastName; }
  get fullName() { return `${this.#firstName} ${this.#lastName}`.trim() || this.#email; }
  get birthDate() { return this.#birthDate; }
  get age() {
    if (!this.#birthDate) return null;
    const today = new Date();
    const age = today.getFullYear() - this.#birthDate.getFullYear();
    const monthDiff = today.getMonth() - this.#birthDate.getMonth();
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.#birthDate.getDate())
      ? age - 1
      : age;
  }
  get phone() { return this.#phone; }
  get profileImageUrl() { return this.#profileImageUrl; }
  get address() { return this.#address; }
  get taxInfo() { return this.#taxInfo; }
  get bankInfo() { return this.#bankInfo; }
  get legalInfo() { return this.#legalInfo; }
  get qualifications() { return this.#qualifications; }
  get careerLevel() { return this.#careerLevel; }
  get linkedNodeId() { return this.#linkedNodeId; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }
  get isActive() { return this.#isActive; }

  get isAdmin() { return this.#role === 'admin'; }
  get isEmployee() { return this.#role === 'employee'; }

  get isProfileComplete() {
    return Boolean(
      this.#firstName &&
      this.#lastName &&
      this.#birthDate &&
      this.#phone &&
      this.#address.isComplete &&
      this.#taxInfo.isComplete &&
      this.#bankInfo.isComplete &&
      this.#legalInfo.isComplete
    );
  }

  get profileCompletionPercentage() {
    const fields = [
      this.#firstName,
      this.#lastName,
      this.#birthDate,
      this.#phone,
      this.#address.isComplete,
      this.#taxInfo.isComplete,
      this.#bankInfo.isComplete,
      this.#legalInfo.isComplete,
      this.#qualifications.hasIHKQualifications,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }

  // Update methods
  updatePersonalInfo({ firstName, lastName, birthDate, phone }) {
    if (firstName !== undefined) this.#firstName = firstName;
    if (lastName !== undefined) this.#lastName = lastName;
    if (birthDate !== undefined) this.#birthDate = birthDate ? new Date(birthDate) : null;
    if (phone !== undefined) this.#phone = phone;
    this.#touch();
    return this;
  }

  updateAddress(address) {
    this.#address = address instanceof Address ? address : Address.fromJSON(address);
    this.#touch();
    return this;
  }

  updateTaxInfo(taxInfo) {
    this.#taxInfo = taxInfo instanceof TaxInfo ? taxInfo : TaxInfo.fromJSON(taxInfo);
    this.#touch();
    return this;
  }

  updateBankInfo(bankInfo) {
    this.#bankInfo = bankInfo instanceof BankInfo ? bankInfo : BankInfo.fromJSON(bankInfo);
    this.#touch();
    return this;
  }

  updateLegalInfo(legalInfo) {
    this.#legalInfo = legalInfo instanceof LegalInfo ? legalInfo : LegalInfo.fromJSON(legalInfo);
    this.#touch();
    return this;
  }

  updateQualifications(qualifications) {
    this.#qualifications = qualifications instanceof Qualifications
      ? qualifications
      : Qualifications.fromJSON(qualifications);
    this.#touch();
    return this;
  }

  updateCareerLevel(careerLevel) {
    this.#careerLevel = careerLevel instanceof CareerLevel
      ? careerLevel
      : CareerLevel.fromJSON(careerLevel);
    this.#touch();
    return this;
  }

  setProfileImage(url) {
    this.#profileImageUrl = url;
    this.#touch();
    return this;
  }

  linkToNode(nodeId) {
    this.#linkedNodeId = nodeId;
    this.#touch();
    return this;
  }

  activate() {
    this.#isActive = true;
    this.#touch();
    return this;
  }

  deactivate() {
    this.#isActive = false;
    this.#touch();
    return this;
  }

  #touch() {
    this.#updatedAt = new Date();
  }

  toJSON() {
    return {
      uid: this.#uid,
      email: this.#email,
      role: this.#role,
      firstName: this.#firstName,
      lastName: this.#lastName,
      birthDate: this.#birthDate && !isNaN(this.#birthDate.getTime()) ? this.#birthDate.toISOString() : null,
      phone: this.#phone,
      profileImageUrl: this.#profileImageUrl,
      address: this.#address.toJSON(),
      taxInfo: this.#taxInfo.toJSON(),
      bankInfo: this.#bankInfo.toJSON(),
      legalInfo: this.#legalInfo.toJSON(),
      qualifications: this.#qualifications.toJSON(),
      careerLevel: this.#careerLevel.toJSON(),
      linkedNodeId: this.#linkedNodeId,
      createdAt: this.#createdAt && !isNaN(this.#createdAt.getTime()) ? this.#createdAt.toISOString() : new Date().toISOString(),
      updatedAt: this.#updatedAt && !isNaN(this.#updatedAt.getTime()) ? this.#updatedAt.toISOString() : new Date().toISOString(),
      isActive: this.#isActive,
    };
  }

  static fromJSON(json) {
    return new User({
      uid: json.uid,
      email: json.email,
      role: json.role || 'employee',
      firstName: json.firstName || '',
      lastName: json.lastName || '',
      birthDate: json.birthDate || null,
      phone: json.phone || '',
      profileImageUrl: json.profileImageUrl || null,
      address: json.address || null,
      taxInfo: json.taxInfo || null,
      bankInfo: json.bankInfo || null,
      legalInfo: json.legalInfo || null,
      qualifications: json.qualifications || null,
      careerLevel: json.careerLevel || null,
      linkedNodeId: json.linkedNodeId || null,
      createdAt: json.createdAt || null,
      updatedAt: json.updatedAt || null,
      isActive: json.isActive ?? true,
    });
  }

  static create(uid, email, role = 'employee') {
    return new User({
      uid,
      email,
      role,
    });
  }
}
