/**
 * Value Object: EmployeeDetails
 * Snapshot of employee data for billing report
 * Contains personal info, address, bank details, tax info, and career level
 */

export class EmployeeDetails {
  #id;
  #name;
  #email;
  #phone;

  // Address
  #street;
  #houseNumber;
  #postalCode;
  #city;

  // Bank Information
  #iban;
  #bic;
  #bankName;
  #accountHolder;

  // Tax Information
  #taxNumber;
  #vatNumber;
  #taxOffice;
  #isSmallBusiness;

  // Career Level
  #careerLevelName;
  #bankProvision;
  #insuranceProvision;
  #realEstateProvision;

  constructor({
    id,
    name,
    email = '',
    phone = '',
    street = '',
    houseNumber = '',
    postalCode = '',
    city = '',
    iban = '',
    bic = '',
    bankName = '',
    accountHolder = '',
    taxNumber = '',
    vatNumber = '',
    taxOffice = '',
    isSmallBusiness = false,
    careerLevelName = '',
    bankProvision = 0,
    insuranceProvision = 0,
    realEstateProvision = 0,
  }) {
    this.#id = id;
    this.#name = name;
    this.#email = email;
    this.#phone = phone;
    this.#street = street;
    this.#houseNumber = houseNumber;
    this.#postalCode = postalCode;
    this.#city = city;
    this.#iban = iban;
    this.#bic = bic;
    this.#bankName = bankName;
    this.#accountHolder = accountHolder;
    this.#taxNumber = taxNumber;
    this.#vatNumber = vatNumber;
    this.#taxOffice = taxOffice;
    this.#isSmallBusiness = isSmallBusiness;
    this.#careerLevelName = careerLevelName;
    this.#bankProvision = bankProvision;
    this.#insuranceProvision = insuranceProvision;
    this.#realEstateProvision = realEstateProvision;
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get email() { return this.#email; }
  get phone() { return this.#phone; }

  get street() { return this.#street; }
  get houseNumber() { return this.#houseNumber; }
  get postalCode() { return this.#postalCode; }
  get city() { return this.#city; }

  get fullAddress() {
    const street = this.#street && this.#houseNumber
      ? `${this.#street} ${this.#houseNumber}`
      : this.#street || '';
    const cityLine = this.#postalCode && this.#city
      ? `${this.#postalCode} ${this.#city}`
      : this.#city || '';
    return { street, cityLine };
  }

  get hasAddress() {
    return Boolean(this.#street && this.#postalCode && this.#city);
  }

  get iban() { return this.#iban; }
  get bic() { return this.#bic; }
  get bankName() { return this.#bankName; }
  get accountHolder() { return this.#accountHolder; }

  get ibanFormatted() {
    if (!this.#iban) return '';
    return this.#iban.match(/.{1,4}/g)?.join(' ') || this.#iban;
  }

  get hasBankInfo() {
    return Boolean(this.#iban && this.#bic && this.#bankName);
  }

  get taxNumber() { return this.#taxNumber; }
  get vatNumber() { return this.#vatNumber; }
  get taxOffice() { return this.#taxOffice; }
  get isSmallBusiness() { return this.#isSmallBusiness; }

  get hasTaxInfo() {
    return Boolean(this.#taxNumber);
  }

  get careerLevelName() { return this.#careerLevelName; }
  get bankProvision() { return this.#bankProvision; }
  get insuranceProvision() { return this.#insuranceProvision; }
  get realEstateProvision() { return this.#realEstateProvision; }

  getProvisionRate(type) {
    switch (type) {
      case 'bank':
        return this.#bankProvision;
      case 'insurance':
        return this.#insuranceProvision;
      case 'realEstate':
        return this.#realEstateProvision;
      default:
        return 0;
    }
  }

  static fromUser(user, hierarchyNode = null) {
    const address = user.address || {};
    const bankInfo = user.bankInfo || {};
    const taxInfo = user.taxInfo || {};
    const careerLevel = user.careerLevel || {};

    return new EmployeeDetails({
      id: user.uid || user.id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email || '',
      phone: user.phone || '',
      street: address.street || '',
      houseNumber: address.houseNumber || '',
      postalCode: address.postalCode || '',
      city: address.city || '',
      iban: bankInfo.iban || '',
      bic: bankInfo.bic || '',
      bankName: bankInfo.bankName || '',
      accountHolder: bankInfo.accountHolder || '',
      taxNumber: taxInfo.taxNumber || '',
      vatNumber: taxInfo.vatNumber || '',
      taxOffice: taxInfo.taxOffice || '',
      isSmallBusiness: taxInfo.isSmallBusiness || false,
      careerLevelName: careerLevel.name || careerLevel.displayName || '',
      bankProvision: hierarchyNode?.bankProvision || careerLevel.bankProvision || 0,
      insuranceProvision: hierarchyNode?.insuranceProvision || careerLevel.insuranceProvision || 0,
      realEstateProvision: hierarchyNode?.realEstateProvision || careerLevel.realEstateProvision || 0,
    });
  }

  static fromHierarchyNode(node) {
    return new EmployeeDetails({
      id: node.id,
      name: node.name,
      email: node.email || '',
      phone: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      iban: '',
      bic: '',
      bankName: '',
      accountHolder: '',
      taxNumber: '',
      vatNumber: '',
      taxOffice: '',
      isSmallBusiness: false,
      careerLevelName: node.careerLevel || '',
      bankProvision: node.bankProvision || 0,
      insuranceProvision: node.insuranceProvision || 0,
      realEstateProvision: node.realEstateProvision || 0,
    });
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      email: this.#email,
      phone: this.#phone,
      street: this.#street,
      houseNumber: this.#houseNumber,
      postalCode: this.#postalCode,
      city: this.#city,
      iban: this.#iban,
      bic: this.#bic,
      bankName: this.#bankName,
      accountHolder: this.#accountHolder,
      taxNumber: this.#taxNumber,
      vatNumber: this.#vatNumber,
      taxOffice: this.#taxOffice,
      isSmallBusiness: this.#isSmallBusiness,
      careerLevelName: this.#careerLevelName,
      bankProvision: this.#bankProvision,
      insuranceProvision: this.#insuranceProvision,
      realEstateProvision: this.#realEstateProvision,
    };
  }

  static fromJSON(json) {
    if (!json) return null;
    return new EmployeeDetails(json);
  }
}
