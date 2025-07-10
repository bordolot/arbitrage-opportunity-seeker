/**
 * Calculates floor(a × b ÷ denominator) with full precision.
 * Throws if result overflows uint256 or denominator == 0.
 * @param {bigint} a - The multiplicand
 * @param {bigint} b - The multiplier
 * @param {bigint} denominator - The divisor
 * @returns {bigint} - The 256-bit result
 */
function mulDiv(a, b, denominator) {
    if (denominator === 0n) {
        throw new Error("Division by zero");
    }

    const MAX_UINT256 = (1n << 256n) - 1n;

    // 512-bit multiplication: [prod1, prod0] = a * b
    const product = a * b;
    const prod0 = product & MAX_UINT256;
    const prod1 = product >> 256n;

    // If prod1 == 0, no overflow occurred, simple division
    if (prod1 === 0n) {
        return prod0 / denominator;
    }

    if (denominator <= prod1) {
        throw new Error("Overflow");
    }

    // Compute remainder
    const remainder = (a * b) % denominator;

    // Adjust [prod1 prod0] to make division exact
    let adjustedProd0 = prod0 - remainder;
    let adjustedProd1 = prod1;
    if (remainder > prod0) {
        adjustedProd1 -= 1n;
        adjustedProd0 += 1n << 256n;
    }

    // Factor powers of two out of denominator
    const twos = denominator & -denominator;
    denominator /= twos;

    adjustedProd0 /= twos;

    const twosInv = (1n << 256n) / twos;
    adjustedProd0 |= adjustedProd1 * twosInv;

    // Invert denominator mod 2**256 using Newton-Raphson
    let inv = (3n * denominator) ^ 2n;
    inv *= 2n - denominator * inv;
    inv *= 2n - denominator * inv;
    inv *= 2n - denominator * inv;
    inv *= 2n - denominator * inv;
    inv *= 2n - denominator * inv;
    inv *= 2n - denominator * inv;

    // Final result
    return (adjustedProd0 * inv) & MAX_UINT256;
}

/**
 * Calculates ceil(a * b / denominator) with full precision
 * @param {bigint} a
 * @param {bigint} b
 * @param {bigint} denominator
 * @returns {bigint} - Rounded-up result
 */
function mulDivRoundingUp(a, b, denominator) {
    const result = mulDiv(a, b, denominator);
    if ((a * b) % denominator > 0n) {
        const MAX_UINT256 = (1n << 256n) - 1n;
        if (result === MAX_UINT256) throw new Error("Overflow");
        return result + 1n;
    }
    return result;
}


module.exports = {
    mulDiv,
    mulDivRoundingUp
}