const fs = require('fs-extra');

const inputFile = "./inputFiles/potentialPairsCombinations.json";

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

function findAllMangoValues(var1, var2, var3) {
    const results = [];

    for (const element of data) {
        if (!element.adresy || !Array.isArray(element.adresy)) continue;

        if (element.adresy.includes(var1)) {
            // Get all pool addresses that are not in pair for calculated arbitrage
            const mangoEntries = Object.entries(element)
                .filter(([key, value]) => key.startsWith('uniswapv3') && value !== var2 && value !== var3);

            if (mangoEntries.length === 0) continue;

            // Get zeroNotOne
            // I.e. checks if token we are going to borrow is token0 or token1
            // If token0 -> zeroNotOne = true
            // If token1 -> zeroNotOne = false
            const [k0, k1] = element.adresy.map(k => BigInt(k));
            const zero = k0 < k1 ? element.adresy[0] : element.adresy[1];
            const one = k0 < k1 ? element.adresy[1] : element.adresy[0];
            const zeroNotOne = var1 === zero;

            // Save all results
            for (const [key, value] of mangoEntries) {
                results.push([value, zeroNotOne]);
            }
        }
    }

    return results;
}





module.exports = {
    findAllMangoValues
}


// const var1 = "0x111111111117dc0aa78b770fa6a738034120c302"
// const var2 = "0x1dEe9d7b7cFd8Febf38982bC8Ab715eC8c3050d1"
// const var3 = "0xa21Ed0Af81d7cdaEbD06d1150C166821cFCD64FF"

// const result = findMangoValue(var1, var2, var3)

// console.log(result)