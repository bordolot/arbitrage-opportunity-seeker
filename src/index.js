// src/index.js
// const findMaxDiff = require("./findMaxDiff");
// const simulateSwap = require("./simulateSwap");

async function main() {
    const mode = process.argv[2];

    if (mode === "scan") {
        console.log("scan");
        // await findMaxDiff();
    } else if (mode === "simulate") {
        // await simulateSwap();
    } else {
        console.log("simulate");
    }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});