/**
 * Returns ceil(x / y)
 * @param {bigint} x - Dividend
 * @param {bigint} y - Divisor
 * @returns {bigint} - The ceiling of the division
 */
function divRoundingUp(x, y) {
    if (y === 0n) throw new Error("Division by zero");
    return x / y + (x % y > 0n ? 1n : 0n);
}

module.exports = {
    divRoundingUp
}