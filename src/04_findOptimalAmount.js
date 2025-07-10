const { ethers } = require("ethers");
const fs = require('fs-extra');

const { simulateSwap } = require("./uniswapLibs/swapSimulation.js");
const { createTickBitmapObject, getTickSpacing } = require("./getUniswapData/getDataForOportunities");


const { opportunityResultsFile, poolsTicksLiqsFile, optimalAmountsFile, directoryExists } = require('./paths');



const fileOutput = './NetworkResults/optimalAmounts.json';

const DECIMALS_6 = 1e6;
const DECIMALS_18 = 1e18;
const START_STEP_6 = 0.001;
const START_STEP_18 = 0.0000001;
const STEP_DIV = 10n;
const ITERATION_SATISFACTION_1 = 1_000;
const ITERATION_SATISFACTION_2 = 1_0000;
const TICK_DIFF_BAR = 50;
const MAX_AMOUNT_OF_CORRECTIONS = 15;
const TICK_DIFF_SATISFACTION = 1

async function getFileContent() {
    let exists
    exists = await directoryExists(opportunityResultsFile);
    if (!exists) {
        throw new Error(`There is no opportunityResultsFile.json file. Make sure you run scanpools first.`);
    }
    exists = await directoryExists(poolsTicksLiqsFile);
    if (!exists) {
        throw new Error(`There is no poolsTicksLiqsFile.json file. Make sure you run getpoolsdata first.`);
    }

    const rawData = fs.readFileSync(poolsTicksLiqsFile, 'utf-8');
    return JSON.parse(rawData);
}


function toChecksummedAddress(address) {
    try {
        // Convert to checksum address
        const checksummedAddress = ethers.getAddress(address);
        // console.log("Checksummed Address:", checksummedAddress);
        return checksummedAddress;
    } catch (error) {
        console.error("Invalid Ethereum address:", error.message);
        return null;
    }
}

function getStepAmountIn(_tokenDec_0) {
    if (_tokenDec_0 === 6) {
        // stepAmountIn = BigInt(0.1e6);
        return BigInt(START_STEP_6 * DECIMALS_6);
    } else if (_tokenDec_0 === 18) {
        // stepAmountIn = BigInt(0.1e18);
        return BigInt(START_STEP_18 * DECIMALS_18);
    } else {
        throw Error("Unknown decimals")
    }
}

function createArbitrageResult(
    poolAddr1,
    poolFee1,
    poolAddr2,
    poolFee2,
    token0,
    token1,
    poolYouCanCallFlash,
    backupPoolYouCanCallFlash,
    poolAddrToStart,
    tokenAddrToStart,
    numberOfTokensToStart,
    estimatedProfit
) {
    return {
        "poolsForArbitrage": [
            {
                "addr": poolAddr1,
                "feeLvl": poolFee1
            },
            {
                "addr": poolAddr2,
                "feeLvl": poolFee2
            }
        ],
        "tokens": {
            "token0Addr": token0,
            "token1Addr": token1
        },
        "poolYouCanCallFlash": poolYouCanCallFlash,
        "backupPoolYouCanCallFlash": backupPoolYouCanCallFlash,
        "poolAddrToStart": poolAddrToStart,
        "tokenAddrToStart": tokenAddrToStart,
        "numberOfTokensToStart": numberOfTokensToStart,
        "estimatedProfit": estimatedProfit
    };
}

function createErrorResult(
    reason
) {
    return {
        "reasonOfError": reason
    };
}

async function find() {
    const pTLfile = await getFileContent();

    const newResults = []; // 


    const start = 0;
    const end = pTLfile.length;
    // const end = 6;

    for (let i = start; i < end; i++) {
        const pair = pTLfile[i];
        try {

            const addresses = Object.keys(pair);
            const poolAddr_1 = addresses[0];
            const poolAddr_2 = addresses[1];

            const tokenAddrs = Object.keys(pair[poolAddr_1].tokens);

            const token0 = (BigInt(tokenAddrs[0]) > BigInt(tokenAddrs[1])) ? tokenAddrs[1] : tokenAddrs[0];
            const token1 = (BigInt(tokenAddrs[0]) > BigInt(tokenAddrs[1])) ? tokenAddrs[0] : tokenAddrs[1];

            const tokenDec_0 = Number(pair[poolAddr_1].tokens[token0]);
            const tokenDec_1 = Number(pair[poolAddr_1].tokens[token1]);

            // const tokenDec_0 = Number((BigInt(tokenAddrs[0]) > BigInt(tokenAddrs[1]))
            //     ? pair[poolAddr_1].tokens[tokenAddrs[1]]
            //     : pair[poolAddr_1].tokens[tokenAddrs[0]]);
            // const tokenDec_1 = Number((BigInt(tokenAddrs[0]) > BigInt(tokenAddrs[1]))
            //     ? pair[poolAddr_1].tokens[tokenAddrs[0]]
            //     : pair[poolAddr_1].tokens[tokenAddrs[1]]);


            const poolsForFlash = pair[poolAddr_1].poolsForFlash;

            const fee_1 = pair[poolAddr_1].fee;
            const fee_2 = pair[poolAddr_2].fee;

            const startSqrtPX96_1 = pair[poolAddr_1].sqrtPriceX96;
            const startSqrtPX96_2 = pair[poolAddr_2].sqrtPriceX96;

            const tick_1 = Number(pair[poolAddr_1].tick);
            const tick_2 = Number(pair[poolAddr_2].tick);
            const startTickDiff = (tick_1 > tick_2) ? (tick_1 - tick_2) : (tick_2 - tick_1);

            // console.log("tick_1 before", tick_1);
            // console.log("tick_2 before", tick_2);

            const liquidity_1 = pair[poolAddr_1].liquidity;
            const liquidity_2 = pair[poolAddr_2].liquidity;



            const bitMapObject_1 = createTickBitmapObject(pair[poolAddr_1].wordPoses);
            const bitMapObject_2 = createTickBitmapObject(pair[poolAddr_2].wordPoses);

            const netLiquidities_1 = pair[poolAddr_1].netLiquidities;
            const netLiquidities_2 = pair[poolAddr_2].netLiquidities;

            const firstPoolHigherPrice = BigInt(startSqrtPX96_1) > BigInt(startSqrtPX96_2);

            let stepAmountIn;
            if (tokenDec_0 === 6) {
                stepAmountIn = BigInt(START_STEP_6 * DECIMALS_6);
            } else if (tokenDec_0 === 18) {
                stepAmountIn = BigInt(START_STEP_18 * DECIMALS_18);
            } else {
                throw Error(`Unknown decimals: ${tokenDec_0}`)
            }

            let step = {
                globalIteration: 0,
                iteration: 0,
                stepBase: stepAmountIn,
                correctionAmount: 0,
                amountIn: stepAmountIn,
                amountInSecond: 0n,
                amountOut: 0n,
                finalTick: 0
            }


            let iterationSatisfaction = ITERATION_SATISFACTION_1;
            // 0.006200000000000000e18
            let goFurther = true;

            // console.log("--------------", i);

            // -------------- 0
            // zeroForOne true
            // -------------- 1 stepAmountIn = BigInt(0.0000001e18);
            // zeroForOne true
            // -------------- 2 stepAmountIn = BigInt(0.0000001e18);
            // zeroForOne false
            // -------------- 3 stepAmountIn = BigInt(0.0000001e18);
            // zeroForOne true
            // -------------- 4 stepAmountIn = BigInt(0.01e18);
            // zeroForOne false
            // -------------- 5 stepAmountIn = BigInt(1e18);
            // zeroForOne false
            // -------------- 6 stepAmountIn = BigInt(0.0001e18);
            // zeroForOne false
            // -------------- 7 stepAmountIn = BigInt(0.0001e18);
            // zeroForOne true
            // -------------- 8 stepAmountIn = BigInt(0.0001e18);
            // zeroForOne true
            // -------------- 9 stepAmountIn = BigInt(0.0001e18);
            // zeroForOne true
            // -------------- 10 stepAmountIn = BigInt(0.01e18);
            // zeroForOne false
            // -------------- 11 stepAmountIn = BigInt(0.0001e18);
            // zeroForOne false



            ////////////////////////////////////////////////////////////////////////////////////////////////
            while (goFurther) {
                if (!firstPoolHigherPrice) {
                    break;
                }
                step.globalIteration += 1;
                step.iteration += 1;
                const [amount0_1, amount1_1, sqrtPriceX96_1, tickAfter_1, liquidityAfter_1, validResult_1] = simulateSwap({
                    startSqrtPX96: BigInt(startSqrtPX96_1),
                    amountSpecified: BigInt(step.amountIn),
                    zeroForOne: (true), // from "-196288" to "-197120"
                    liquidity: BigInt(liquidity_1),
                    netLiquidities: netLiquidities_1,
                    fee: BigInt(fee_1),
                    tickSpacing: BigInt(getTickSpacing(Number(fee_1))),
                    tickBitmap: bitMapObject_1,
                    tick1Start: tick_1,
                    tick2Start: tick_2,
                })

                if (!validResult_1) {
                    throw Error(`validResult_1:${step.amountInSecond}  ${step.amountIn}`);
                }

                step.amountInSecond = (amount1_1 < 0n) ? amount1_1 * -1n : amount1_1;

                const [amount0_2, amount1_2, sqrtPriceX96_2, tickAfter_2, liquidityAfter_2, validResult_2] = simulateSwap({
                    startSqrtPX96: BigInt(startSqrtPX96_2),
                    amountSpecified: BigInt(step.amountInSecond),
                    zeroForOne: (false), // from "-196288" to "-197120" 
                    liquidity: BigInt(liquidity_2),
                    netLiquidities: netLiquidities_2,
                    fee: BigInt(fee_2),
                    tickSpacing: BigInt(getTickSpacing(Number(fee_2))),
                    tickBitmap: bitMapObject_2,
                    tick1Start: tick_1,
                    tick2Start: tick_2,
                })
                if (!validResult_2) {
                    throw Error(`validResult_2:${step.amountInSecond}  ${step.amountIn}`);
                }
                const tickDifference = Number(tickAfter_1) - Number(tickAfter_2);
                if ((startTickDiff - tickDifference) > TICK_DIFF_BAR) {
                    iterationSatisfaction = ITERATION_SATISFACTION_2;
                }

                if (step.iteration > iterationSatisfaction) {
                    step.correctionAmount += 1;

                    if (step.correctionAmount > MAX_AMOUNT_OF_CORRECTIONS) {
                        throw Error(`To many reties! step.amountIn: ${step.amountIn}`);
                    }
                    step.iteration = 0;
                    step.stepBase = step.stepBase * STEP_DIV;
                    step.amountIn = step.stepBase;
                    continue;
                }
                if (tickDifference <= TICK_DIFF_SATISFACTION) {
                    if (tickDifference >= -TICK_DIFF_SATISFACTION) {
                        step.finalTick = tickAfter_1;
                        step.amountOut = (amount0_2 < 0n) ? amount0_2 * -1n : amount0_2;
                        goFurther = false;
                        break;
                    }
                    throw Error(`tickDifference too negative: ${tickDifference}. step.amountIn: ${step.amountIn}`);
                }
                step.amountIn += step.stepBase;
            }
            ////////////////////////////////////////////////////////////////////////////////////////////////

            while (goFurther) {
                if (firstPoolHigherPrice) {
                    break;
                }
                step.globalIteration += 1;
                step.iteration += 1;
                const [amount0_2, amount1_2, sqrtPriceX96_2, tickAfter_2, liquidityAfter_2, validResult_2] = simulateSwap({
                    startSqrtPX96: BigInt(startSqrtPX96_2),
                    amountSpecified: BigInt(step.amountIn),
                    zeroForOne: (true), // zeroForOne = false and we want to zeroForOne = true
                    liquidity: BigInt(liquidity_2),
                    netLiquidities: netLiquidities_2,
                    fee: BigInt(fee_2),
                    tickSpacing: BigInt(getTickSpacing(Number(fee_2))),
                    tickBitmap: bitMapObject_2,
                    tick1Start: tick_1,
                    tick2Start: tick_2,
                })
                if (!validResult_2) {
                    throw Error(`validResult_1:${step.amountInSecond}  ${step.amountIn}`);

                }

                step.amountInSecond = (amount1_2 < 0n) ? amount1_2 * -1n : amount1_2;

                const [amount0_1, amount1_1, sqrtPriceX96_1, tickAfter_1, liquidityAfter_1, validResult_1] = simulateSwap({
                    startSqrtPX96: BigInt(startSqrtPX96_1),
                    amountSpecified: BigInt(step.amountInSecond),
                    zeroForOne: (false),
                    liquidity: BigInt(liquidity_1),
                    netLiquidities: netLiquidities_1,
                    fee: BigInt(fee_1),
                    tickSpacing: BigInt(getTickSpacing(Number(fee_1))),
                    tickBitmap: bitMapObject_1,
                    tick1Start: tick_1,
                    tick2Start: tick_2,
                })
                if (!validResult_1) {
                    throw Error(`validResult_2:${step.amountInSecond}  ${step.amountIn}`);
                }

                const tickDifference = Number(tickAfter_2) - Number(tickAfter_1);
                if ((startTickDiff - tickDifference) > TICK_DIFF_BAR) {
                    iterationSatisfaction = ITERATION_SATISFACTION_2;
                }
                // console.log(`iteration: ${step.iteration} correctionAmount: ${step.correctionAmount} tickDifference:${tickDifference}`)

                if (step.iteration > iterationSatisfaction) {
                    step.correctionAmount += 1;

                    if (step.correctionAmount > MAX_AMOUNT_OF_CORRECTIONS) {
                        throw Error(`To many reties! step.amountIn: ${step.amountIn}`);
                    }
                    step.iteration = 0;
                    step.stepBase = step.stepBase * STEP_DIV;
                    step.amountIn = step.stepBase;
                    continue;
                }
                if (tickDifference <= TICK_DIFF_SATISFACTION) {
                    if (tickDifference >= -TICK_DIFF_SATISFACTION) {
                        step.finalTick = tickAfter_2;
                        step.amountOut = (amount0_1 < 0n) ? amount0_1 * -1n : amount0_1;
                        goFurther = false;
                        break;
                    }
                    throw Error(`tickDifference too negative: ${tickDifference}. step.amountIn: ${step.amountIn}`);
                }
                step.amountIn += step.stepBase;
            }


            // console.log("iteration", step.globalIteration)
            // console.log("amountIn", step.amountIn)
            // console.log("amountInSecond", step.amountInSecond)
            // console.log("amountOutFinal", step.amountOut)
            // console.log("profit", (step.amountOut - step.amountInSecond));
            // console.log("_amountToStart", (step.amountIn).toString());
            // console.log("token0", toChecksummedAddress(token0));
            // console.log("token1", toChecksummedAddress(token1));
            // if (firstPoolHigherPrice) {
            //     console.log("pool_1", (poolAddr_1));
            //     console.log("pool_2", (poolAddr_2));
            // } else {
            //     console.log("pool_1", (poolAddr_2));
            //     console.log("pool_2", (poolAddr_1));
            // }
            // console.log(`Pool for flash:${poolsForFlash[0]}, token0_NOT_token1: ${poolsForFlash[1]}`)
            // console.log("finalTick", step.finalTick);
            // console.log("profit", (step.amountOut - step.amountIn).toString());
            // console.log("================");

            /// Token to start arbitrage is always token0!!!!!
            /// There only be a different pool in pair
            newResults.push(
                createArbitrageResult(
                    poolAddr_1,
                    fee_1,
                    poolAddr_2,
                    fee_2,
                    token0,
                    token1,
                    poolsForFlash[0],
                    (poolsForFlash.length > 1 ? poolsForFlash[0] : "there is no other pool you can flash"),
                    (firstPoolHigherPrice ? poolAddr_1 : poolAddr_2),
                    token0,
                    step.amountIn.toString(),
                    (step.amountOut - step.amountIn).toString()
                ));
        } catch (err) {
            // console.error(`Error:`, err);
            newResults.push(createErrorResult(err.message));
        }
        console.log(`Finished ${i + 1}/${end}`);
    }
    // await fs.writeJSON(optimalAmountsFile, newResults, { spaces: 2 });
    fs.writeFileSync(optimalAmountsFile, JSON.stringify(newResults, null, 2));
    console.log(`====================================`);
    console.log(`Results in ./out/optimalAmounts.json`);



}

module.exports = find


