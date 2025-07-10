const { getWordPosToCheck, getTickSpacing } = require("./getUniswapData/getDataForOportunities");
const { findAllMangoValues } = require("./getUniswapData/getPoolForFlash");
const fs = require('fs-extra');
const path = require('path');
const { opportunityResultsFile, poolsTicksLiqsFile, outDir, directoryExists } = require('./paths');


const LOWER_DIFF = 1000;
const HIGHER_DIFF = 4000;


async function calculateTickDiff(ld, hd) {

    if (!ld) {
        ld = LOWER_DIFF;
    }
    if (!hd) {
        hd = HIGHER_DIFF;
    }

    const exists = await directoryExists(opportunityResultsFile);
    if (!exists) {
        throw new Error(`There is no opportunityResults.json file. Make sure you run scanpools first.`);
    }

    const rawData = fs.readFileSync(opportunityResultsFile);
    const data = JSON.parse(rawData);

    const results = [];

    const start = 0;
    const end = data.length;
    // const end = 4;

    for (let i = start; i < end; i++) {
        const pool = data[i];
        const addresses = Object.keys(pool);
        // for (let i = 0; i < addresses.length; i++) {
        for (let i = 0; i < 1; i++) {
            for (let j = i + 1; j < addresses.length; j++) {
                const addr1 = addresses[i];
                const addr2 = addresses[j];

                const tick1 = parseInt(pool[addr1].tick, 10);
                const tick2 = parseInt(pool[addr2].tick, 10);

                const liquidity1 = pool[addr1].liquidity;
                const liquidity2 = pool[addr2].liquidity;

                const diff = Math.abs(tick1 - tick2);

                if (Number(liquidity1) === 0 || Number(liquidity2) === 0) {
                    continue;
                }


                if (diff < hd && diff > ld) {
                    const sqrtPriceX96_1 = pool[addr1].sqrtPriceX96;
                    const sqrtPriceX96_2 = pool[addr2].sqrtPriceX96;
                    const fee1 = pool[addr1].fee;
                    const fee2 = pool[addr2].fee;
                    const tokens = pool[addr2].adresy;
                    const addressy = Object.keys(tokens)
                    const addressZero = (BigInt(addressy[1]) > BigInt(addressy[0]))
                        ? addressy[0] : addressy[1];
                    const poolsForFlash = findAllMangoValues((addressZero), addr1, addr2)
                    if (!poolsForFlash) {
                        continue;
                    }
                    results.push(
                        {
                            [addr1]: {
                                "iteration": results.length,
                                "tokens": tokens,
                                "poolsForFlash": poolsForFlash,
                                "fee": fee1,
                                "sqrtPriceX96": sqrtPriceX96_1,
                                "tick": pool[addr1].tick,
                                "liquidity": liquidity1,
                                "wordPoses": getWordPosToCheck(tick1, tick2, getTickSpacing(Number(fee1))),
                                "netLiquidities": {}
                            },
                            [addr2]: {
                                "fee": fee2,
                                "sqrtPriceX96": sqrtPriceX96_2,
                                "tick": pool[addr2].tick,
                                "liquidity": liquidity2,
                                "wordPoses": getWordPosToCheck(tick1, tick2, getTickSpacing(Number(fee2))),
                                "netLiquidities": {}
                            }
                        }
                    );
                }

                // results.push([addr1, addr2, diff]);
            }
        }
    }


    // Save to output file
    fs.writeFileSync(poolsTicksLiqsFile, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} comparisons to ${poolsTicksLiqsFile}`);

}

module.exports = calculateTickDiff