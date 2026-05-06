/**
 * A class for representing rational numbers
 */

export class Rational {
    // These are just normal numbers atm, do I need bigint?
    public readonly numerator: number;
    public readonly denominator: number;

    public static readonly zero = new Rational(0);
    public static readonly one = new Rational(1);

    constructor(num: number, den: number = 1) {
        // https://stackoverflow.com/questions/17369098/
        function numDecimals(x: number) {
            if (Math.floor(x) !== x)
                return x.toString().split(".")[1].length || 0;
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

        // Make sure that the num/den don't share a divisor
        function gcd(a: number, b: number): number {
            if (!b) return a;
            return gcd(b, a % b);
        }
        const common = gcd(num, den);
        this.numerator = num / common;
        this.denominator = den / common;
    }

    public static fromData(data: RationalNumber) {
        return typeof data === "number"
            ? new Rational(data, 1)
            : new Rational(data[0], data[1]);
    }

    // Parse the input from an input element into a rational, or make the input node
    // red if unparsable
    public static fromInput(
        inputString: string,
        inputEl: HTMLInputElement | null,
    ): Rational | null {
        // Split into "a b/c", "a", "b/c"

        // TODO: Need to rework thisto be less yucky
        // I need to match against " +", but only if both FULL *and* NUM/DEN are
        // filled
        const matcher =
            /^ *(?<NEG>-)? *(?:(?<FULL>\d+(\.\d*)?))? +(?:(?<NUM>\d+) *\/ *(?<DEN>\d+))? *$/;
        // Need to padd with spaces atm to satisfy the bad matcher
        const match = (" " + inputString + " ").match(matcher);

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

    public mul(v: Rational /*| number*/) {
        if (typeof v === "number") {
            return new Rational(this.numerator * v, this.denominator);
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

    public negate() {
        return new Rational(-this.numerator, this.denominator);
    }

    public abs() {
        return new Rational(
            Math.abs(this.numerator),
            Math.abs(this.denominator),
        );
    }

    public equals(v2: Rational) {
        return (
            this.numerator === v2.numerator &&
            this.denominator === v2.denominator
        );
    }

    public lessThan(v2: Rational) {
        // a/b < c/d => ad < cb, if 0 or 2 of b and d are negative
        const temp =
            this.numerator * v2.denominator < v2.numerator * this.denominator;
        return temp === (this.denominator < 0 === v2.denominator < 0);
    }

    public greaterThan(v2: Rational) {
        // See lessThan
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

    public getMixedFractionString(): string {
        if (this.numerator === 0) return "0";
        const isNeg = Math.sign(this.numerator) !== Math.sign(this.denominator);
        const num = Math.abs(this.numerator);
        const den = Math.abs(this.denominator);
        const whole = Math.floor(num / den);
        const rest = num - whole * den;
        return `${isNeg ? "-" : ""}${whole !== 0 ? whole : ""}${whole !== 0 && rest !== 0 ? " " : ""}${rest !== 0 ? `${rest}/${den}` : ""}`;
    }
}

// Type, for JSON stuff
export type RationalNumber = number | [number, number];
