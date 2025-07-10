
function toUint160(y) {
    if (y < 0n || y > 2n ** 160n - 1n) throw new Error("toUint160 overflow");
    return y;
}

function toUint256(y) {
    if (y < 0n || y > 2n ** 256n - 1n) {
        throw new Error("toUint256 overflow");
    }
    return y;
}

// Converts a BigInt (int256) to int128, throws if out of range
function toInt128(y) {
    const min = -(2n ** 127n);
    const max = 2n ** 127n - 1n;
    if (y < min || y > max) {
        throw new Error("toInt128 overflow/underflow");
    }
    return y;
}

// Converts a BigInt (uint256) to int256, throws if overflow
function toInt256(y) {
    const max = 2n ** 255n - 1n;
    if (y < 0n || y > max) {
        throw new Error("toInt256 overflow");
    }
    return y;
}

module.exports = {
    toUint160,
    toUint256,
    toInt128,
    toInt256
}