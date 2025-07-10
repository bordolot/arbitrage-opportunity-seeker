// src/index.js
const scanpools = require("./01_checkOportunity");
const calculateTickDiff = require("./02_calculateTickDiffs");
const getLiquidities = require("./03_getLiquidities");
const find = require("./04_findOptimalAmount");

async function main() {
    const mode = process.argv[2];

    if (mode === "scanpools") {
        await scanpools(false);

    } else if (mode === "scanpoolstest") {
        await scanpools(true);
    }
    else if (mode === "getpoolsdata") {
        const lowerDiff = Number(process.argv[3]);
        const higherDiff = Number(process.argv[4]);
        await calculateTickDiff(lowerDiff, higherDiff);
        await getLiquidities();
    } else if (mode === "simulate") {
        await find();
    } else {
        console.log("no command");
    }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});