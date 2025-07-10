const { mulDiv, mulDivRoundingUp } = require("./FullMath");
const { divRoundingUp } = require("./UnsafeMath");
const { toUint160 } = require("./SafeCast");



const FixedPoint96 = {
    RESOLUTION: 96n,
    Q96: 0x1000000000000000000000000n

};

// getNextSqrtPriceFromAmount0RoundingUp
function getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amount, add) {
    if (amount === 0n) return sqrtPX96;

    const numerator1 = liquidity << 96n; // liquidity * 2^96

    if (add) {
        const product = amount * sqrtPX96;
        if (product / amount === sqrtPX96) {
            const denominator = numerator1 + product;
            if (denominator >= numerator1) {
                return toUint160(mulDivRoundingUp(numerator1, sqrtPX96, denominator));
            }
        }

        const denominator = divRoundingUp(numerator1, sqrtPX96) + amount;
        return toUint160(divRoundingUp(numerator1, denominator));
    } else {
        const product = amount * sqrtPX96;
        if (product / amount !== sqrtPX96 || numerator1 <= product) {
            throw new Error("getNextSqrtPriceFromAmount0RoundingUp: overflow or underflow");
        }
        const denominator = numerator1 - product;
        return toUint160(mulDivRoundingUp(numerator1, sqrtPX96, denominator));
    }
}

// getNextSqrtPriceFromAmount1RoundingDown
function getNextSqrtPriceFromAmount1RoundingDown(sqrtPX96, liquidity, amount, add) {
    if (add) {
        const quotient = amount <= 2n ** 160n - 1n
            ? (amount << 96n) / liquidity
            : mulDiv(amount, FixedPoint96.Q96, liquidity);

        return toUint160(BigInt(sqrtPX96) + quotient);
    } else {
        const quotient = amount <= 2n ** 160n - 1n
            ? divRoundingUp(amount << 96n, liquidity)
            : mulDivRoundingUp(amount, FixedPoint96.Q96, liquidity);

        if (sqrtPX96 <= quotient) throw new Error("getNextSqrtPriceFromAmount1RoundingDown: underflow");

        return toUint160(BigInt(sqrtPX96) - quotient);
    }
}

// uint160 sqrtPX96,
// uint128 liquidity,
// uint256 amountIn,
// bool zeroForOne
// returns (uint160 sqrtQX96)
function getNextSqrtPriceFromInput(
    sqrtPX96,
    liquidity,
    amountIn,
    zeroForOne
) {
    if (sqrtPX96 <= 0) throw new Error("sqrtPX96 <= 0");
    if (liquidity <= 0) throw new Error("liquidity <= 0");

    // round to make sure that we don't pass the target price
    return (
        zeroForOne
            ? getNextSqrtPriceFromAmount0RoundingUp(
                sqrtPX96,
                liquidity,
                amountIn,
                true
            )
            : getNextSqrtPriceFromAmount1RoundingDown(
                sqrtPX96,
                liquidity,
                amountIn,
                true
            )
    );

}



/// @notice Gets the next sqrt price given an output amount of token0 or token1
/// @dev Throws if price or liquidity are 0 or the next price is out of bounds
/// @param sqrtPX96 The starting price before accounting for the output amount
/// @param liquidity The amount of usable liquidity
/// @param amountOut How much of token0, or token1, is being swapped out
/// @param zeroForOne Whether the amount out is token0 or token1
/// @return sqrtQX96 The price after removing the output amount of token0 or token1

// uint160 sqrtPX96,
// uint128 liquidity,
// uint256 amountOut,
// bool zeroForOne

function getNextSqrtPriceFromOutput(
    sqrtPX96,
    liquidity,
    amountOut,
    zeroForOne
) {
    if (sqrtPX96 <= 0) throw new Error("sqrtPX96 <= 0");
    if (liquidity <= 0) throw new Error("liquidity <= 0");

    // round to make sure that we pass the target price
    return (
        zeroForOne
            ? getNextSqrtPriceFromAmount1RoundingDown(
                sqrtPX96,
                liquidity,
                amountOut,
                false
            )
            : getNextSqrtPriceFromAmount0RoundingUp(
                sqrtPX96,
                liquidity,
                amountOut,
                false
            )

    );

}


/**
 * Gets the amount0 delta between two prices
 * @param {bigint} sqrtRatioAX96
 * @param {bigint} sqrtRatioBX96
 * @param {bigint} liquidity
 * @param {boolean} roundUp
 * @returns {bigint}
 */
function getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, roundUp) {

    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    if (sqrtRatioAX96 === 0n) throw new Error("sqrtRatioAX96 must be > 0");

    const numerator1 = liquidity << FixedPoint96.RESOLUTION;

    const numerator2 = sqrtRatioBX96 - sqrtRatioAX96;

    if (roundUp) {
        const temp = mulDivRoundingUp(numerator1, numerator2, sqrtRatioBX96);
        return divRoundingUp(temp, sqrtRatioAX96);
    } else {

        const temp = mulDiv(numerator1, numerator2, sqrtRatioBX96);
        return temp / sqrtRatioAX96;
    }
}



/**
 * Gets the amount1 delta between two prices
 * Calculates liquidity * (sqrt(upper) - sqrt(lower))
 * @param {bigint} sqrtRatioAX96
 * @param {bigint} sqrtRatioBX96
 * @param {bigint} liquidity
 * @param {boolean} roundUp
 * @returns {bigint}
 */
function getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, roundUp) {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }


    if (roundUp) {
        return mulDivRoundingUp(
            liquidity, sqrtRatioBX96 - sqrtRatioAX96, FixedPoint96.Q96);
    } else {

        return mulDiv(liquidity, sqrtRatioBX96 - sqrtRatioAX96, FixedPoint96.Q96);
    }
}



module.exports = {
    getAmount0Delta,
    getAmount1Delta,
    getNextSqrtPriceFromInput,
    getNextSqrtPriceFromOutput
}