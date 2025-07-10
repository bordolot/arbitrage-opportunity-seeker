/**
 * Add a signed liquidity delta to liquidity and throw if it overflows or underflows
 * @param {bigint} x - The liquidity before the change (unsigned 128-bit)
 * @param {bigint} y - The delta by which liquidity should be changed (signed 128-bit)
 * @returns {bigint} - The new liquidity value after applying the delta
 * @throws Will throw an error if the operation causes overflow or underflow
 */
function addDelta(x, y) {
    if (typeof x !== 'bigint' || typeof y !== 'bigint') {
        throw new TypeError('x and y must be BigInt');
    }

    let z;
    if (y < 0n) {
        const delta = -y;
        if (x < delta) throw new Error('LS'); // Underflow
        z = x - delta;
    } else {
        const delta = y;
        z = x + delta;
        if (z < x) throw new Error('LA'); // Overflow
    }
    return z;
}

module.exports = {
    addDelta,

}