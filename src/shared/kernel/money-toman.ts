export class MoneyToman {
  private static readonly MAX = BigInt(Number.MAX_SAFE_INTEGER);

  private constructor(private readonly rawValue: bigint) {
    if (rawValue < 0n) throw new RangeError('MoneyToman cannot be negative');
    if (rawValue > MoneyToman.MAX) throw new RangeError('MoneyToman exceeds JavaScript safe integer range');
  }

  static zero(): MoneyToman { return new MoneyToman(0n); }

  static from(value: bigint | number | string): MoneyToman {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new RangeError('MoneyToman number input must be a safe integer');
    }
    return new MoneyToman(typeof value === 'bigint' ? value : BigInt(value));
  }

  add(other: MoneyToman): MoneyToman { return new MoneyToman(this.rawValue + other.rawValue); }
  subtract(other: MoneyToman): MoneyToman {
    if (other.rawValue > this.rawValue) throw new RangeError('MoneyToman result cannot be negative');
    return new MoneyToman(this.rawValue - other.rawValue);
  }
  multiplyByInteger(multiplier: bigint | number): MoneyToman {
    if (typeof multiplier === 'number' && !Number.isSafeInteger(multiplier)) throw new RangeError('Multiplier must be a safe integer');
    const n = typeof multiplier === 'bigint' ? multiplier : BigInt(multiplier);
    if (n < 0n) throw new RangeError('Multiplier cannot be negative');
    return new MoneyToman(this.rawValue * n);
  }
  compare(other: MoneyToman): number { return this.rawValue < other.rawValue ? -1 : this.rawValue > other.rawValue ? 1 : 0; }
  toBigInt(): bigint { return this.rawValue; }
  toString(): string { return this.rawValue.toString(); }
  toJSON(): number { return Number(this.rawValue); }
}
