/**
 * Returns the index of the most significant bit (MSB) of a BigInt.
 * @param {bigint} x - A positive integer
 * @returns {number} - Index of MSB (0-255)
 */
function mostSignificantBit(x) {
    if (x <= 0n) throw new Error("Input must be greater than 0");

    let r = 0;
    if (x >= 0x100000000000000000000000000000000n) {
        x >>= 128n;
        r += 128;
    }
    if (x >= 0x10000000000000000n) {
        x >>= 64n;
        r += 64;
    }
    if (x >= 0x100000000n) {
        x >>= 32n;
        r += 32;
    }
    if (x >= 0x10000n) {
        x >>= 16n;
        r += 16;
    }
    if (x >= 0x100n) {
        x >>= 8n;
        r += 8;
    }
    if (x >= 0x10n) {
        x >>= 4n;
        r += 4;
    }
    if (x >= 0x4n) {
        x >>= 2n;
        r += 2;
    }
    if (x >= 0x2n) {
        r += 1;
    }
    return r;
}

/**
 * Returns the index of the least significant bit (LSB) of a BigInt.
 * @param {bigint} x - A positive integer
 * @returns {number} - Index of LSB (0-255)
 */
function leastSignificantBit(x) {
    if (x <= 0n) throw new Error("Input must be greater than 0");

    let r = 255;
    if ((x & ((1n << 128n) - 1n)) > 0n) {
        r -= 128;
    } else {
        x >>= 128n;
    }
    if ((x & ((1n << 64n) - 1n)) > 0n) {
        r -= 64;
    } else {
        x >>= 64n;
    }
    if ((x & ((1n << 32n) - 1n)) > 0n) {
        r -= 32;
    } else {
        x >>= 32n;
    }
    if ((x & ((1n << 16n) - 1n)) > 0n) {
        r -= 16;
    } else {
        x >>= 16n;
    }
    if ((x & ((1n << 8n) - 1n)) > 0n) {
        r -= 8;
    } else {
        x >>= 8n;
    }
    if ((x & 0xfn) > 0n) {
        r -= 4;
    } else {
        x >>= 4n;
    }
    if ((x & 0x3n) > 0n) {
        r -= 2;
    } else {
        x >>= 2n;
    }
    if ((x & 0x1n) > 0n) {
        r -= 1;
    }
    return r;
}

module.exports = {
    mostSignificantBit,
    leastSignificantBit
}