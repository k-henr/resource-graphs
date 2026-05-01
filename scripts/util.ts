/**
 * Various small useful functions used throughout the program
 */

export function getRoundedString(x: number): string {
    if (Math.abs(x) < 1e-12) return "0";

    let rounded = x.toPrecision(5);

    // Remove trailing zeroes and point if present
    rounded = rounded.replace(/\.0*$|(\.\d*?)0+$/, "$1");

    return rounded;
}

export function resolveRational(x: number | [number, number]) {
    return typeof x === "number" ? x : x[0] / x[1];
}
