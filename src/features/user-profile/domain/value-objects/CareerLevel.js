/**
 * Value Object: CareerLevel
 * Career level/rank with associated provision rates
 */

export class CareerLevel {
  #rankName;
  #level;
  #bankProvisionRate;
  #insuranceProvisionRate;
  #realEstateProvisionRate;
  #description;

  constructor({
    rankName = 'Mitarbeiter',
    level = 1,
    bankProvisionRate = 0,
    insuranceProvisionRate = 0,
    realEstateProvisionRate = 0,
    description = '',
  } = {}) {
    this.#rankName = rankName;
    this.#level = Math.max(1, Math.min(10, level)); // 1-10
    this.#bankProvisionRate = this.#validateProvisionRate(bankProvisionRate);
    this.#insuranceProvisionRate = this.#validateProvisionRate(insuranceProvisionRate);
    this.#realEstateProvisionRate = this.#validateProvisionRate(realEstateProvisionRate);
    this.#description = description;
  }

  #validateProvisionRate(rate) {
    const num = parseFloat(rate) || 0;
    return Math.max(0, Math.min(100, num));
  }

  get rankName() {
    return this.#rankName;
  }

  get level() {
    return this.#level;
  }

  get bankProvisionRate() {
    return this.#bankProvisionRate;
  }

  get insuranceProvisionRate() {
    return this.#insuranceProvisionRate;
  }

  get realEstateProvisionRate() {
    return this.#realEstateProvisionRate;
  }

  get description() {
    return this.#description;
  }

  toJSON() {
    return {
      rankName: this.#rankName,
      level: this.#level,
      bankProvisionRate: this.#bankProvisionRate,
      insuranceProvisionRate: this.#insuranceProvisionRate,
      realEstateProvisionRate: this.#realEstateProvisionRate,
      description: this.#description,
    };
  }

  static fromJSON(json) {
    if (!json) return new CareerLevel();

    return new CareerLevel({
      rankName: json.rankName || 'Mitarbeiter',
      level: json.level || 1,
      bankProvisionRate: json.bankProvisionRate || 0,
      insuranceProvisionRate: json.insuranceProvisionRate || 0,
      realEstateProvisionRate: json.realEstateProvisionRate || 0,
      description: json.description || '',
    });
  }

  static empty() {
    return new CareerLevel();
  }
}

// Predefined career levels (can be customized)
export const CAREER_LEVELS = {
  TRAINEE: { rankName: 'Trainee', level: 1, description: 'In Ausbildung' },
  JUNIOR: { rankName: 'Junior Berater', level: 2, description: 'Junior-Ebene' },
  CONSULTANT: { rankName: 'Berater', level: 3, description: 'Standard-Berater' },
  SENIOR: { rankName: 'Senior Berater', level: 4, description: 'Erfahrener Berater' },
  TEAM_LEAD: { rankName: 'Teamleiter', level: 5, description: 'Führt kleines Team' },
  MANAGER: { rankName: 'Manager', level: 6, description: 'Bereichsleiter' },
  SENIOR_MANAGER: { rankName: 'Senior Manager', level: 7, description: 'Mehrere Bereiche' },
  DIRECTOR: { rankName: 'Direktor', level: 8, description: 'Geschäftsbereich' },
  MANAGING_DIRECTOR: { rankName: 'Geschäftsführer', level: 10, description: 'Unternehmensführung' },
};
