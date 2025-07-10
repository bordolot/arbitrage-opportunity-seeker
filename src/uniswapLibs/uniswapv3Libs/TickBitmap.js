const { mostSignificantBit, leastSignificantBit } = require("./BitMath");

/**
 * Computes word and bit positions for a given tick.
 * @param {number} tick - Signed 24-bit integer
 * @returns {{ wordPos: number, bitPos: number }}
 */
// function position(tick) {
//     const wordPos = tick >> 8; // int16
//     const bitPos = tick & 0xff; // uint8
//     return { wordPos, bitPos };
// }
function position(tick) {
    tick = BigInt(tick); // ensure input is BigInt
    const wordPos = tick >> 8n; // shift right by 8 bits
    const bitPos = tick & 0xffn; // bitwise AND with 255
    return { wordPos, bitPos };
}


/**
 * Flips the bit at the tick position in the given mapping.
 * @param {Object<number, bigint>} self - Map from wordPos to uint256 bitmap
 * @param {number} tick - Signed 24-bit integer
 * @param {number} tickSpacing - Spacing value
 */
function flipTick(tickBitmap, tick, tickSpacing) {
    if (tick % tickSpacing !== 0) throw new Error("Tick not spaced correctly");

    const compressed = Math.floor(tick / tickSpacing);
    const { wordPos, bitPos } = position(compressed);
    const mask = 1n << BigInt(bitPos);

    // self[wordPos] = (self[wordPos] ?? 0n) ^ mask;
    tickBitmap.set(wordPos, ((tickBitmap.get(wordPos) ?? 0n) ^ mask));
}

/**
 * Finds the next initialized tick within one word.
 * @param {Object<number, bigint>} self - Map from wordPos to uint256 bitmap
 * @param {number} tick - The tick to search from
 * @param {number} tickSpacing - The spacing between usable ticks
 * @param {boolean} lte - Whether to search to the left (true) or right (false)
 * @returns {{ next: number, initialized: boolean }}
 */


function nextInitializedTickWithinOneWord(tickBitmap, tick, tickSpacing, lte) {


    let compressed
    if (tick < 0) {
        compressed = BigInt(Math.ceil(Number(tick) / Number(tickSpacing)));
    } else {
        compressed = BigInt(Math.floor(Number(tick) / Number(tickSpacing)));
    }


    if (BigInt(tick) < 0 && BigInt(tick) % tickSpacing !== 0n) {
        compressed--
    };


    if (lte) {
        const { wordPos, bitPos } = position(compressed);

        const mask = (1n << BigInt(bitPos)) - 1n | (1n << BigInt(bitPos));
        const bitmap = tickBitmap.get(wordPos);
        const masked = bitmap & mask;

        const initialized = masked !== 0n;


        const next = initialized
            ? (compressed - (bitPos - BigInt(mostSignificantBit(masked)))) * tickSpacing
            : (compressed - bitPos) * (tickSpacing);

        return { next, initialized };
    } else {
        const { wordPos, bitPos } = position(compressed + 1n);
        const mask = ~((1n << BigInt(bitPos)) - 1n) & ((1n << 256n) - 1n); // simulate 256-bit word
        const bitmap = tickBitmap.get(wordPos);
        const masked = bitmap & mask;
        const initialized = masked !== 0n;
        const next = initialized
            ? (compressed + 1n + (BigInt(leastSignificantBit(masked)) - bitPos)) * tickSpacing
            : (compressed + 1n + (255n - bitPos)) * tickSpacing;
        return { next, initialized };
    }
}



module.exports = {
    position,
    flipTick,
    nextInitializedTickWithinOneWord
}