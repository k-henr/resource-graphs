import { GraphError } from "./errors";
import { RationalNumber } from "./types";
/**
 * A class for representing rational numbers.
 *
 * Instances are semi-immutable, which allows passing by reference without risk of
 * leakage.
 */

export class Rational {
    // Split "a b/c", "a", "a/b", "a.b" or "a.b c/d", or any negations of these, into
    // the correct groups
    private static readonly patternMatcher =
        /^ *(?<NEG>-)? *(?:(?<FULL>\d*?(?:\.\d*)?)) *(?:(?<NUM>\d+) *\/ *(?<DEN>\d+))? *$/;

    // These are just normal numbers atm, do I need bigint?
    public readonly numerator: number;
    public readonly denominator: number;

    public static readonly zero = new Rational(0);
    public static readonly one = new Rational(1);

    constructor(num: number, den: number = 1) {
        // https://stackoverflow.com/questions/17369098/
        function numDecimals(x: number) {
            if (Math.floor(x) !== x) return x.toString().split(".")[1].length || 0;
            return 0;
        }
        // Correct for decimal inputs
        if (Math.floor(num) !== num || Math.floor(den) !== den) {
            const maxDecimalLength = Math.max(
                numDecimals(Math.abs(num)),
                numDecimals(Math.abs(den)),
            );
            // Alternatively, see https://stackoverflow.com/questions/69941600/ for a
            // potentially faster approach to calculate the power
            const factor = Math.pow(10, maxDecimalLength);
            num *= factor;
            den *= factor;
        }

        // Make sure that the num/den are as reduced as possible
        function gcd(a: number, b: number): number {
            if (!b) return a;
            return gcd(b, a % b);
        }
        const common = gcd(num, den);
        this.numerator = num / common;
        this.denominator = den / common;
    }

    // Convert a [number, number] list to a rational
    public static fromData(data: RationalNumber) {
        console.log(data);
        if (typeof data === "number") return new Rational(data, 1);
        if (Array.isArray(data)) return new Rational(data[0], data[1]);
        throw new GraphError(`Incorrect type "${typeof data}" for rational number!`);
    }

    // Parse the input from an input element into a rational, or make the input node
    // red if unparsable
    public static fromInput(
        inputString: string,
        inputEl: HTMLInputElement | null,
    ): Rational | null {
        // Need to padd with spaces atm to satisfy the bad matcher
        const match = inputString.match(Rational.patternMatcher);

        if (!match || !match.groups) {
            inputEl?.classList.add("input-invalid-amount");
            return null;
        }
        inputEl?.classList.remove("input-invalid-amount");

        const sgn = match.groups.NEG ? -1 : 1;
        const full = match.groups.FULL ? Number(match.groups.FULL) : 0;
        const num = match.groups.NUM ? Number(match.groups.NUM) : 0;
        const den = match.groups.DEN ? Number(match.groups.DEN) : 1;
        return new Rational(sgn * (full * den + num), den);
    }

    public add(v2: Rational) {
        return new Rational(
            this.numerator * v2.denominator + v2.numerator * this.denominator,
            this.denominator * v2.denominator,
        );
    }

    public sub(v2: Rational) {
        return new Rational(
            this.numerator * v2.denominator - v2.numerator * this.denominator,
            this.denominator * v2.denominator,
        );
    }

    public mul(v: Rational | number) {
        if (typeof v === "number") {
            return new Rational(this.numerator * v, this.denominator);
        } else if (v.equals(Rational.one)) {
            return this;
        } else {
            return new Rational(
                this.numerator * v.numerator,
                this.denominator * v.denominator,
            );
        }
    }

    public div(v2: Rational) {
        return new Rational(
            this.numerator * v2.denominator,
            this.denominator * v2.numerator,
        );
    }

    // Raise this number to another number
    public pow(v2: Rational) {
        // Since Q^Q !Є Q ((1/2)^(1/2) for example), I'm not sure how to handle this.
        // Probably by rounding using some kind of extra argument for the needed
        // precision
        if (v2.denominator !== 1)
            throw new GraphError(
                "There's currently no support for raising a number to a non-integer!",
            );

        return new Rational(
            Math.pow(this.numerator, v2.numerator),
            Math.pow(this.denominator, v2.denominator),
        );
    }

    // Negate this number
    public negate() {
        return new Rational(-this.numerator, this.denominator);
    }

    // Get the absolute value of this
    public abs() {
        if (this.denominator < 0 === this.numerator < 0) return this;
        return new Rational(Math.abs(this.numerator), Math.abs(this.denominator));
    }

    // Clamp between two values. Equal to median([lo, hi, this]), except that's not
    // implemented (yet?)
    public clamp(lo: Rational, hi: Rational) {
        if (this.lessThan(lo)) return lo;
        if (this.greaterThan(hi)) return hi;
        return this;
    }

    public floor() {
        // Apparently there's no good algorithm for this?? I couldn't find one at
        // least
        if (this.denominator === 1) return this;
        // Approximate result, possibly floating-point-contaminated but probably
        // within 1 of the correct result
        const approximateResult = Math.floor(this.numerator / this.denominator);

        // If v = floor(a/b), then v*b <= a < (v+1)*b
        for (const v of [
            approximateResult + 1,
            approximateResult,
            approximateResult - 1,
        ]) {
            if (
                v * this.denominator <= this.numerator &&
                this.numerator < (v + 1) * this.denominator
            )
                return new Rational(v);
        }

        // Fallback in case of >1 error. Keep searching outwards instead?
        return new Rational(approximateResult);
    }

    public equals(v2: Rational) {
        // Easy enough, rationals are always stored in their most reduced form
        return (
            this.numerator === v2.numerator && this.denominator === v2.denominator
        );
    }

    public lessThan(v2: Rational) {
        // a/b < c/d => ad < cb, if 0 or 2 of b and d are negative
        const temp =
            this.numerator * v2.denominator < v2.numerator * this.denominator;
        return temp === (this.denominator < 0 === v2.denominator < 0);
    }

    public greaterThan(v2: Rational) {
        // See lessThan. Should possibly implement using equals and lessThan instead?
        const temp =
            this.numerator * v2.denominator > v2.numerator * this.denominator;
        return temp === (this.denominator < 1 === v2.denominator < 1);
    }

    // Get decimals
    public getDecimalString(): string {
        if (this.numerator === 0) return "0";
        const x = this.numerator / this.denominator;

        let rounded = x.toPrecision(5);
        // Remove trailing zeroes and point if present
        rounded = rounded.replace(/\.0*$|(\.\d*?)0+$/, "$1");

        return rounded;
    }

    // Get as a mixed fraction of the form "whole num/den"
    public getMixedFractionString(): string {
        if (this.numerator === 0) return "0";
        const isNeg = Math.sign(this.numerator) !== Math.sign(this.denominator);
        const num = Math.abs(this.numerator);
        const den = Math.abs(this.denominator);
        const whole = Math.floor(num / den);
        const rest = num - whole * den;
        return `${isNeg ? "-" : ""}${whole !== 0 ? whole : ""}${whole !== 0 && rest !== 0 ? " " : ""}${rest !== 0 ? `${rest}/${den}` : ""}`;
    }

    public getList(): [number, number] {
        return [this.numerator, this.denominator];
    }
}
