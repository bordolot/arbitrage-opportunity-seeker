require('dotenv').config({ debug: false, override: false, quiet: true });
const BLOCK_NUMBER = Number(process.env.BLOCK_NUMBER);

const SLEEP_TIME_INSIDE = 100;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTickBitmap(contract, wordPoses, higherIteration = null) {
    let tickBitmap = { ...wordPoses };

    for (wordPos in wordPoses) {

        const tickBitmapValue = await contract.tickBitmap(
            wordPos,
            { blockTag: BLOCK_NUMBER }
        );
        tickBitmap[wordPos] = tickBitmapValue.toString();
        if (higherIteration) {
            console.log(`✅ Iteracja ${iteration} podproces ${wordPos} zakończony.`);
        } else {
            console.log(`✅ Poroces: ${wordPos} zakończony.`);
        }

        await sleep(SLEEP_TIME_INSIDE);
    }

    return tickBitmap;
}

module.exports = {
    getTickBitmap
}