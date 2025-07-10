// tickMath.js
const BigInt = global.BigInt;
const MIN_TICK = -887272;
const MAX_TICK = 887272;

function getSqrtRatioAtTick(tick) {
    tick = Number(tick);

    if (tick < MIN_TICK || tick > MAX_TICK) throw new Error("Tick out of bounds");

    const absTick = Math.abs(tick);

    let ratio = BigInt("0x100000000000000000000000000000000");

    const multipliers = [
        BigInt("0xfffcb933bd6fad37aa2d162d1a594001"),
        BigInt("0xfff97272373d413259a46990580e213a"),
        BigInt("0xfff2e50f5f656932ef12357cf3c7fdcc"),
        BigInt("0xffe5caca7e10e4e61c3624eaa0941cd0"),
        BigInt("0xffcb9843d60f6159c9db58835c926644"),
        BigInt("0xff973b41fa98c081472e6896dfb254c0"),
        BigInt("0xff2ea16466c96a3843ec78b326b52861"),
        BigInt("0xfe5dee046a99a2a811c461f1969c3053"),
        BigInt("0xfcbe86c7900a88aedcffc83b479aa3a4"),
        BigInt("0xf987a7253ac413176f2b074cf7815e54"),
        BigInt("0xf3392b0822b70005940c7a398e4b70f3"),
        BigInt("0xe7159475a2c29b7443b29c7fa6e889d9"),
        BigInt("0xd097f3bdfd2022b8845ad8f792aa5825"),
        BigInt("0xa9f746462d870fdf8a65dc1f90e061e5"),
        BigInt("0x70d869a156d2a1b890bb3df62baf32f7"),
        BigInt("0x31be135f97d08fd981231505542fcfa6"),
        BigInt("0x9aa508b5b7a84e1c677de54f3e99bc9"),
        BigInt("0x5d6af8dedb81196699c329225ee604"),
        BigInt("0x2216e584f5fa1ea926041bedfe98"),
        BigInt("0x48a170391f7dc42444e8fa2")
    ];

    for (let i = 0; i < multipliers.length; i++) {
        if ((absTick >> i) & 1) {
            ratio = (ratio * multipliers[i]) >> BigInt(128);
        }
    }
    if (tick > 0) {
        ratio = (BigInt(1) << BigInt(256)) / ratio;
    }

    const result = ratio >> BigInt(32);
    return ratio % (BigInt(1) << BigInt(32)) !== BigInt(0) ? result + BigInt(1) : result;
}


function getTickAtSqrtRatio(sqrtPriceX96) {
    const MIN_SQRT_RATIO = BigInt("4295128739");
    const MAX_SQRT_RATIO = BigInt("1461446703485210103287273052203988822378723970342");

    if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 >= MAX_SQRT_RATIO) {
        throw new Error("sqrtPriceX96 out of bounds");
    }

    const ratio = BigInt(sqrtPriceX96) << BigInt(32);
    let r = ratio;
    let msb = 0;

    for (let i = 255; i >= 0; i--) {
        if (r >= (BigInt(1) << BigInt(i))) {
            msb = i;
            break;
        }
    }

    let log2 = BigInt(msb - 128) << BigInt(64);
    r = (msb >= 128) ? ratio >> BigInt(msb - 127) : ratio << BigInt(127 - msb);

    for (let i = 0; i < 14; i++) {
        r = (r * r) >> BigInt(127);
        const f = r >> BigInt(128);
        log2 |= f << BigInt(63 - i);
        r = r >> f;
    }

    const log_sqrt10001 = log2 * BigInt("255738958999603826347141");

    const tickLow = Number((log_sqrt10001 - BigInt("3402992956809132418596140100660247210")) >> BigInt(128));
    const tickHigh = Number((log_sqrt10001 + BigInt("291339464771989622907027621153398088495")) >> BigInt(128));

    return getSqrtRatioAtTick(tickHigh) <= sqrtPriceX96 ? tickHigh : tickLow;
}

module.exports = {
    getSqrtRatioAtTick,
    getTickAtSqrtRatio
};
