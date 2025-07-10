const { position } = require("../uniswapLibs/uniswapv3Libs/TickBitmap");
const Mapping = require('../uniswapLibs/solidityLib/mapping.js');
const { nextInitializedTickWithinOneWord } = require("../uniswapLibs/uniswapv3Libs/TickBitmap");


function createTickBitmapObject(tickBitmapObject) {
    const tickBitmap = new Mapping();
    for (wordPos in tickBitmapObject) {
        const value = tickBitmapObject[wordPos];
        tickBitmap.set(wordPos, value);
    }
    return tickBitmap;
}

function getAllInitializedTicksInBitmap(bitmap, tickSpacing) {
    // bitmap have to be type of Mapping
    let initializedTicks = {};

    const wordPosL = Number(bitmap.getLowest());
    const wordPosH = Number(bitmap.getHighest());

    for (let i = wordPosL; i <= wordPosH; i++) {
        if (i == wordPosL) {
            const theHighestTickInTheLowestWordPos = wordPosL * 256 * tickSpacing + 255 * tickSpacing
            const { next, } =
                nextInitializedTickWithinOneWord(
                    bitmap,
                    BigInt(theHighestTickInTheLowestWordPos),
                    BigInt(tickSpacing),
                    true
                );
            initializedTicks[next] = "";
            continue;
        }
        if (i == wordPosH) {
            const theLowestTickInTheHighestWordPos = wordPosH * 256 * tickSpacing + 255 * tickSpacing
            const { next, } =
                nextInitializedTickWithinOneWord(
                    bitmap,
                    BigInt(theLowestTickInTheHighestWordPos),
                    BigInt(tickSpacing),
                    false
                );

            initializedTicks[next] = "";
            continue;
        } else {
            let scanedAllTicks = false;
            let nextFrom = i * 256 * tickSpacing;
            while (!scanedAllTicks) {
                const { next, } =
                    nextInitializedTickWithinOneWord(
                        bitmap,
                        BigInt(nextFrom),
                        BigInt(tickSpacing),
                        false
                    );
                initializedTicks[next] = "";
                nextFrom = next + 1n;
                const { wordPos, bitPos } = position(
                    (next + BigInt(tickSpacing) * 1n) / BigInt(tickSpacing)
                );
                if (wordPos > i) {
                    scanedAllTicks = true;
                }
            }
        }
    }

    // console.log("initializedTicks", initializedTicks);

    return initializedTicks;
}

function getInitializedTicksFromTo(bitmap, from, to, tickSpacing) {
    // bitmap have to be type of Mapping
    if (from == to) throw Error("from == to");

    let scanedAllTicks = false;
    const zeroForOne = (BigInt(from) > BigInt(to)) ? (true) : (false);
    let nextFrom = from;
    let initializedTicks = {};

    while (!scanedAllTicks) {
        // console.log("nextFrom", nextFrom);

        const { next, } =
            nextInitializedTickWithinOneWord(
                bitmap,
                BigInt(nextFrom),
                BigInt(tickSpacing),
                zeroForOne
            );
        if (next !== 0n) {
            initializedTicks[next] = "";
        }
        else if (((from > 0 && to < 0) || (from < 0 && to > 0)) && next === 0n) {
            initializedTicks[next] = "";
        }


        if (zeroForOne) {
            if (next >= to) {
                nextFrom = next - 1n;
            } else {
                scanedAllTicks = true;
            }
        } else {
            if (next <= to) {
                nextFrom = next + 1n;
            } else {
                scanedAllTicks = true;
            }
        }
    }


    return initializedTicks;
}



function getCompressedTick(tick, tickSpacing) {
    let compressed;
    if (tick < 0) {
        compressed = BigInt(Math.ceil(Number(tick) / Number(tickSpacing)));
    } else {
        compressed = BigInt(Math.floor(Number(tick) / Number(tickSpacing)));
    }
    if (BigInt(tick) < 0 && BigInt(tick) % BigInt(tickSpacing) !== 0n) {
        compressed--;
    };
    return compressed;
}

function getWordPosToCheck(from, to, tickSpacing, withExtra = true) {
    // let wordPosToCheck = [];
    let wordPosToCheck = {};

    const fromCompressed = getCompressedTick(from, tickSpacing);
    const toCompressed = getCompressedTick(to, tickSpacing);

    let fromWordPos = position(fromCompressed).wordPos;
    let toWordPos = position(toCompressed).wordPos;

    if (fromWordPos >= toWordPos) {
        [fromWordPos, toWordPos] = [toWordPos, fromWordPos];
    }
    if (withExtra) {
        fromWordPos -= 1n;
        toWordPos += 1n;
    }


    while (fromWordPos <= toWordPos) {
        // wordPosToCheck.push(fromWordPos);
        wordPosToCheck[fromWordPos] = "";
        fromWordPos += 1n;
    }

    return wordPosToCheck;
}

function getTickSpacing(fee) {
    let tickSpacing;
    if (fee == 500) {
        tickSpacing = 10;
    } else if (fee == 3000) {
        tickSpacing = 60;
    } else if (fee == 10000) {
        tickSpacing = 200;
    } else {
        throw Error("Wrong fee");
    }
    return tickSpacing;
}

module.exports = {
    getWordPosToCheck,
    getTickSpacing,
    createTickBitmapObject,
    getAllInitializedTicksInBitmap,
    getInitializedTicksFromTo
}
