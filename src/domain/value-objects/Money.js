/**
 * Value Object: Money
 * Immutable representation of monetary values
 */

class Money {
  constructor(amount, currency = 'IDR') {
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Amount must be a non-negative number');
    }
    this._amount = amount;
    this._currency = currency;
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  add(other) {
    if (this._currency !== other._currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other) {
    if (this._currency !== other._currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    if (this._amount < other._amount) {
      throw new Error('Result would be negative');
    }
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor) {
    return new Money(this._amount * factor, this._currency);
  }

  equals(other) {
    return this._amount === other._amount && this._currency === other._currency;
  }

  greaterThan(other) {
    if (this._currency !== other._currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this._amount > other._amount;
  }

  format() {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: this._currency
    }).format(this._amount);
  }

  toJSON() {
    return {
      amount: this._amount,
      currency: this._currency
    };
  }

  static fromDecimal(decimal, currency = 'IDR') {
    return new Money(parseFloat(decimal), currency);
  }
}

module.exports = Money;
