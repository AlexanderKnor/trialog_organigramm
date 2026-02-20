/**
 * Value Object: TipProviderAllocation
 * Immutable allocation of a tip provider's provision share on a revenue entry.
 * Each tip provider has an id, name, and provisionPercentage.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { roundCurrency } from '../../../../core/utils/index.js';

export class TipProviderAllocation {
  #id;
  #name;
  #provisionPercentage;

  constructor({ id, name, provisionPercentage }) {
    if (!id) {
      throw new ValidationError('Tip provider ID is required', 'tipProviderId');
    }
    if (!name) {
      throw new ValidationError('Tip provider name is required', 'tipProviderName');
    }

    const pct = parseFloat(provisionPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      throw new ValidationError(
        'Tip provider provision percentage must be between 0 and 100',
        'tipProviderProvisionPercentage',
      );
    }

    this.#id = id;
    this.#name = name;
    this.#provisionPercentage = pct;
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get provisionPercentage() {
    return this.#provisionPercentage;
  }

  /**
   * Calculate the tip provider's absolute amount from a base revenue amount
   */
  calculateAmount(baseAmount) {
    return roundCurrency(baseAmount * (this.#provisionPercentage / 100));
  }

  /**
   * Value equality by id
   */
  equals(other) {
    if (!(other instanceof TipProviderAllocation)) return false;
    return this.#id === other.#id;
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      provisionPercentage: this.#provisionPercentage,
    };
  }

  static fromJSON(json) {
    return new TipProviderAllocation({
      id: json.id,
      name: json.name,
      provisionPercentage: json.provisionPercentage,
    });
  }
}
