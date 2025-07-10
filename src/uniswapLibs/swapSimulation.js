const { getTickAtSqrtRatio, getSqrtRatioAtTick } = require("./uniswapv3Libs/tickMath");
const { mulDiv, mulDivRoundingUp } = require("./uniswapv3Libs/FullMath");
const {
    getAmount0Delta,
    getAmount1Delta,
    getNextSqrtPriceFromInput,
    getNextSqrtPriceFromOutput
} = require("./uniswapv3Libs/SqrtPriceMath");
const { nextInitializedTickWithinOneWord } = require("./uniswapv3Libs/TickBitmap");
const { toInt256 } = require("./uniswapv3Libs/SafeCast");
const { addDelta } = require("./uniswapv3Libs/LiquidityMath");

const fs = require('fs');
const { type } = require("os");



function _blockTimestamp() {
    return 0;
}

function computeSwapStep({
    sqrtRatioCurrentX96,
    sqrtRatioTargetX96,
    liquidity,
    amountRemaining,
    feePips,
}) {

    let sqrtRatioNextX96;
    let amountIn;
    let amountOut;
    let feeAmount;

    const zeroForOne = sqrtRatioCurrentX96 >= sqrtRatioTargetX96;
    const exactIn = amountRemaining >= 0;


    if (exactIn) {
        const amountRemainingLessFee = mulDiv(
            amountRemaining,
            BigInt(1e6) - feePips,
            BigInt(1e6));
        amountIn = zeroForOne
            ? getAmount0Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, true)
            : getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, true);


        if (amountRemainingLessFee >= amountIn) {
            sqrtRatioNextX96 = sqrtRatioTargetX96
        }
        else {
            sqrtRatioNextX96 = getNextSqrtPriceFromInput(
                sqrtRatioCurrentX96,
                liquidity,
                amountRemainingLessFee,
                zeroForOne
            );
        }
    }
    else {
        amountOut = zeroForOne
            ? getAmount1Delta(
                sqrtRatioTargetX96,
                sqrtRatioCurrentX96,
                liquidity,
                false
            )
            : getAmount0Delta(
                sqrtRatioCurrentX96,
                sqrtRatioTargetX96,
                liquidity,
                false
            );
        if (-amountRemaining >= amountOut) {
            sqrtRatioNextX96 = sqrtRatioTargetX96;
        } else {
            sqrtRatioNextX96 = getNextSqrtPriceFromOutput(
                sqrtRatioCurrentX96,
                liquidity,
                -amountRemaining,
                zeroForOne
            );
        }
    }

    const max = sqrtRatioTargetX96 == sqrtRatioNextX96;

    // get the input/output amounts
    if (zeroForOne) {
        amountIn = max && exactIn
            ? amountIn
            : getAmount0Delta(
                sqrtRatioNextX96,
                sqrtRatioCurrentX96,
                liquidity,
                true
            );
        amountOut = max && !exactIn
            ? amountOut
            : getAmount1Delta(
                sqrtRatioNextX96,
                sqrtRatioCurrentX96,
                liquidity,
                false
            );
    }
    else {
        amountIn = max && exactIn
            ? amountIn
            : getAmount1Delta(
                sqrtRatioCurrentX96,
                sqrtRatioNextX96,
                liquidity,
                true
            );
        amountOut = max && !exactIn
            ? amountOut
            : getAmount0Delta(
                sqrtRatioCurrentX96,
                sqrtRatioNextX96,
                liquidity,
                false
            );
    }

    // cap the output amount to not exceed the remaining output amount
    if (!exactIn && amountOut > (-amountRemaining)) {
        amountOut = (-amountRemaining);
    }

    if (exactIn && sqrtRatioNextX96 != sqrtRatioTargetX96) {
        // we didn't reach the target, so take the remainder of the maximum input as fee
        feeAmount = (amountRemaining) - amountIn;
    } else {
        feeAmount = mulDivRoundingUp(
            amountIn,
            feePips,
            BigInt(1e6) - feePips
        );
    }

    const _sqrtRatioNextX96 = BigInt(sqrtRatioNextX96);
    const _amountIn = BigInt(amountIn);
    const _amountOut = BigInt(amountOut);
    const _feeAmount = BigInt(feeAmount);

    return { _sqrtRatioNextX96, _amountIn, _amountOut, _feeAmount };

}


function simulateSwap({
    startSqrtPX96,
    amountSpecified,
    zeroForOne, //Boolean,
    liquidity,
    netLiquidities,
    fee,
    tickSpacing,
    tickBitmap,
    tick1Start,
    tick2Start
}) {
    let sqrtPriceLimitX96 = 0n;
    const MIN_SQRT_RATIO = BigInt("4295128739");
    const MAX_SQRT_RATIO = BigInt("1461446703485210103287273052203988822378723970342");

    const tickUpper = (tick1Start > tick2Start) ? tick1Start : tick2Start;
    const tickLower = (tick1Start > tick2Start) ? tick2Start : tick1Start;

    let returnValidResult = true;

    if (sqrtPriceLimitX96 === 0n) {
        if (zeroForOne) {
            sqrtPriceLimitX96 = MIN_SQRT_RATIO + 1n;
        } else {
            sqrtPriceLimitX96 = MAX_SQRT_RATIO;
        }
    }

    ///// START SWAP IN POOL

    // cache current data



    //Slot0
    const slot0Start = {
        sqrtPriceX96: startSqrtPX96,
        tick: BigInt(getTickAtSqrtRatio(startSqrtPX96)),
        feeProtocol: 0n
    }



    //SwapCache
    const cache = {
        liquidityStart: liquidity,
        blockTimestamp: _blockTimestamp(),
        feeProtocol: zeroForOne
            ? (slot0Start.feeProtocol % 16n)
            : (slot0Start.feeProtocol >> 4n),
        tickCumulative: 0n,
        secondsPerLiquidityCumulativeX128: 0n,
        computedLatestObservation: false
    }

    const exactInput = amountSpecified > 0;


    //SwapState
    const state = {
        amountSpecifiedRemaining: amountSpecified,
        amountCalculated: 0n,
        sqrtPriceX96: slot0Start.sqrtPriceX96,
        tick: slot0Start.tick,
        // feeGrowthGlobalX128: zeroForOne
        //     ? feeGrowthGlobal0X128
        //     : feeGrowthGlobal1X128,
        protocolFee: 0n,
        liquidity: cache.liquidityStart
    }



    // continue swapping as long as we haven't used the entire input/output and haven't reached the price limit
    let stopNextIteration = false;
    while (
        state.amountSpecifiedRemaining != 0 &&
        state.sqrtPriceX96 != sqrtPriceLimitX96
    ) {
        if (stopNextIteration) {
            returnValidResult = false;
            return [0, 0, 0, 0, 0, returnValidResult];
        }

        // StepComputations  
        const step = {
            // the price at the beginning of the step
            sqrtPriceStartX96: 0n,
            // the next tick to swap to from the current tick in the swap direction
            tickNext: 0n,
            // whether tickNext is initialized or not
            initialized: false,
            // sqrt(price) for the next tick (1/0)
            sqrtPriceNextX96: 0n,
            // how much is being swapped in in this step
            amountIn: 0n,
            // how much is being swapped out
            amountOut: 0n,
            // how much fee is being paid in
            feeAmount: 0n
        }
        step.sqrtPriceStartX96 = state.sqrtPriceX96;



        const { next, initialized } =
            nextInitializedTickWithinOneWord(
                tickBitmap,
                state.tick,
                tickSpacing,
                zeroForOne
            );

        step.tickNext = next;
        step.initialized = initialized;

        if (next < tickLower || next > tickUpper) {
            stopNextIteration = true;
        }


        // ensure that we do not overshoot the min/max tick, as the tick bitmap is not aware of these bounds
        // if (step.tickNext < TickMath.MIN_TICK) {
        //     step.tickNext = TickMath.MIN_TICK;
        // } else if (step.tickNext > TickMath.MAX_TICK) {
        //     step.tickNext = TickMath.MAX_TICK;
        // }


        // get the price for the next tick



        step.sqrtPriceNextX96 = getSqrtRatioAtTick(step.tickNext);


        // console.log("rayman -------------------")
        // console.log("state.sqrtPriceX96", state.sqrtPriceX96)
        // console.log("step.sqrtPriceNextX96 < sqrtPriceLimitX96", step.sqrtPriceNextX96 < sqrtPriceLimitX96)
        // console.log("state.liquidity", state.liquidity)
        // console.log("state.amountSpecifiedRemaining", state.amountSpecifiedRemaining)
        // console.log("rayman -------------------")

        // compute values to swap to the target tick, price limit, or point where input/output amount is exhausted
        const { _sqrtRatioNextX96, _amountIn, _amountOut, _feeAmount } = computeSwapStep({
            sqrtRatioCurrentX96: state.sqrtPriceX96,
            sqrtRatioTargetX96: (
                zeroForOne
                    ? step.sqrtPriceNextX96 < sqrtPriceLimitX96
                    : step.sqrtPriceNextX96 > sqrtPriceLimitX96
            )
                ? sqrtPriceLimitX96
                : step.sqrtPriceNextX96,
            liquidity: state.liquidity,
            amountRemaining: state.amountSpecifiedRemaining,
            feePips: fee,
        })

        state.sqrtPriceX96 = _sqrtRatioNextX96;
        step.amountIn = _amountIn;
        step.amountOut = _amountOut;
        step.feeAmount = _feeAmount;


        if (exactInput) {
            const delta = step.amountIn + step.feeAmount;
            state.amountSpecifiedRemaining -= delta;
            state.amountCalculated -= step.amountOut;
        } else {
            state.amountSpecifiedRemaining += step.amountOut;
            state.amountCalculated += step.amountIn + step.feeAmount;
        }




        // if the protocol fee is on, calculate how much is owed, decrement feeAmount, and increment protocolFee
        if (cache.feeProtocol > 0) {
            const delta = step.feeAmount / cache.feeProtocol;
            step.feeAmount -= delta;
            state.protocolFee += delta;
        }



        if (state.sqrtPriceX96 == step.sqrtPriceNextX96) {
            // if the tick is initialized, run the tick transition
            if (step.initialized) {
                // // check for the placeholder value, which we replace with the actual value the first time the swap
                // // crosses an initialized tick
                // if (!cache.computedLatestObservation) {
                //     (
                //         cache.tickCumulative,
                //         cache.secondsPerLiquidityCumulativeX128
                //     ) = observations.observeSingle(
                //         cache.blockTimestamp,
                //         0,
                //         slot0Start.tick,
                //         slot0Start.observationIndex,
                //         cache.liquidityStart,
                //         slot0Start.observationCardinality
                //     );
                //     cache.computedLatestObservation = true;
                // }
                // int128 liquidityNet = ticks.cross(
                //     step.tickNext,
                //     (
                //         zeroForOne
                //             ? state.feeGrowthGlobalX128
                //             : feeGrowthGlobal0X128
                //     ),
                //     (
                //         zeroForOne
                //             ? feeGrowthGlobal1X128
                //             : state.feeGrowthGlobalX128
                //     ),
                //     cache.secondsPerLiquidityCumulativeX128,
                //     cache.tickCumulative,
                //     cache.blockTimestamp
                // );
                // // if we're moving leftward, we interpret liquidityNet as the opposite sign
                // // safe because liquidityNet cannot be type(int128).min
                // if (zeroForOne) liquidityNet = -liquidityNet;

                // state.liquidity = LiquidityMath.addDelta(
                //     state.liquidity,
                //     liquidityNet
                // );

                let liquidityNet = BigInt(netLiquidities[step.tickNext]);

                if (zeroForOne) { liquidityNet = -1n * liquidityNet; }
                state.liquidity = addDelta(
                    state.liquidity,
                    BigInt(liquidityNet)
                );
            }
            state.tick = zeroForOne ? step.tickNext - 1n : step.tickNext;

        } else if (state.sqrtPriceX96 != step.sqrtPriceStartX96) {
            // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
            state.tick = getTickAtSqrtRatio(state.sqrtPriceX96);
        }

    }


    // update tick and write an oracle entry if the tick change
    // propably not necessary

    // update liquidity if it changed
    // todo check if necessary

    const { amount0, amount1 } = zeroForOne == exactInput
        ? { amount0: amountSpecified - state.amountSpecifiedRemaining, amount1: state.amountCalculated }
        : { amount0: state.amountCalculated, amount1: amountSpecified - state.amountSpecifiedRemaining };


    // do the transfers and collect payment
    // not necessary


    // console.log("rayman rayman");
    // console.log("liquidity", state.liquidity);
    // console.log("sqrtPriceX96", state.sqrtPriceX96);
    // console.log("tick", state.tick);
    // console.log("amount0", amount0);
    // console.log("amount1", amount1);
    // console.log("rayman rayman");
    return [amount0, amount1, state.sqrtPriceX96, state.tick, state.liquidity, returnValidResult];
}



module.exports = {
    simulateSwap
}
