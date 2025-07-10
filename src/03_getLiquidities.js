const fs = require('fs-extra');
const { ethers } = require("ethers");

const { directoryExists, poolsTicksLiqsFile } = require('./paths');
const {
    createTickBitmapObject,
    getAllInitializedTicksInBitmap,
    getTickSpacing
} = require("./getUniswapData/getDataForOportunities");
const uniswapv3Pool_abi = require('./uniswapLibs/interfaces/IUniswapV3Pool.json');

require('dotenv').config({ debug: false, override: false, quiet: true });
const BLOCK_NUMBER = Number(process.env.BLOCK_NUMBER);
const endpoint = process.env.ALCHEMY_ENDPOINT;

const MAX_ERRORS = 5;
const SLEEP_TIME = 100;
const SLEEP_TIME_INSIDE = 50;

const provider = new ethers.JsonRpcProvider(endpoint);

async function getFileContent() {
    const exists = await directoryExists(poolsTicksLiqsFile);
    if (!exists) {
        throw new Error(`There is no poolsTicksLiqsFile.json file. Make sure you run scanpools first.`);
    }

    const rawData = fs.readFileSync(poolsTicksLiqsFile, 'utf-8');
    return JSON.parse(rawData);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLiquidity(contract) {
    const liquidity = await contract.liquidity(
        { blockTag: BLOCK_NUMBER }
    );
    return liquidity.toString();
}

async function getTickBitmap(contract, wordPoses, iteration) {
    let tickBitmap = { ...wordPoses };

    console.log(`Iteration ${iteration + 1} - getting tickBitmaps for wordPoses for the pool: ${contract.target}`);

    for (word in wordPoses) {
        const tickBitmapValue = await contract.tickBitmap(
            word,
            { blockTag: BLOCK_NUMBER }
        );
        tickBitmap[word] = tickBitmapValue.toString();
        console.log(`   tickBitmap for wordPos: ${word}`);
        await sleep(SLEEP_TIME_INSIDE);
    }
    return tickBitmap;
}

async function getNetLiquidities(contract, initializedTiks, iteration) {
    let netLiquidities = { ...initializedTiks };
    console.log(`Iteration ${iteration + 1} - getting netLiquidities in ticks in the range of wordPoses`);

    for (tick in initializedTiks) {

        const netLiquidity = await contract.ticks(
            tick,
            { blockTag: BLOCK_NUMBER }
        );
        netLiquidities[tick] = netLiquidity[1].toString();
        console.log(`   netLiquidity for tick: ${tick}.`);
        await sleep(SLEEP_TIME_INSIDE);
    }
    return netLiquidities;
}


async function getLiquidities() {
    const pTLfile = await getFileContent();
    // console.log(pTLfile[0]);

    let existingResults = [];
    try {
        existingResults = await fs.readJSON(outputFile);
    } catch {
        existingResults = [];
    }

    const start = 0;
    const end = pTLfile.length;
    // const end = 4;

    let errorCount = 0;

    for (let i = start; i < end; i++) {

        try {

            const addresses = Object.keys(pTLfile[i]);
            const poolAddr_1 = addresses[0];
            const poolAddr_2 = addresses[1];
            const contract_1 = new ethers.Contract(poolAddr_1, uniswapv3Pool_abi.abi, provider);
            const contract_2 = new ethers.Contract(poolAddr_2, uniswapv3Pool_abi.abi, provider);

            const liquidity_1 = pTLfile[i][poolAddr_1].liquidity;
            const liquidity_2 = pTLfile[i][poolAddr_2].liquidity;

            Object.assign(pTLfile[i][poolAddr_1], { liquidity: liquidity_1 });
            Object.assign(pTLfile[i][poolAddr_2], { liquidity: liquidity_2 });

            const wordPoses1 = pTLfile[i][poolAddr_1].wordPoses;
            const tickBitmap_1 = await getTickBitmap(contract_1, wordPoses1, i);
            const wordPoses2 = pTLfile[i][poolAddr_2].wordPoses;
            const tickBitmap_2 = await getTickBitmap(contract_2, wordPoses2, i);


            Object.assign(pTLfile[i][poolAddr_1].wordPoses, tickBitmap_1);
            Object.assign(pTLfile[i][poolAddr_2].wordPoses, tickBitmap_2);

            // // create mapping from 'Listener/uniswapLibs/solidityLib/mapping.js'

            const bitMapObject_1 = createTickBitmapObject(tickBitmap_1);
            const bitMapObject_2 = createTickBitmapObject(tickBitmap_2);

            const initializedTiks_1 = getAllInitializedTicksInBitmap(
                bitMapObject_1,
                getTickSpacing(pTLfile[i][poolAddr_1].fee)
            );
            const initializedTiks_2 = getAllInitializedTicksInBitmap(
                bitMapObject_2,
                getTickSpacing(pTLfile[i][poolAddr_2].fee)
            );

            const netLiquidities_1 = await getNetLiquidities(contract_1, initializedTiks_1, i);
            const netLiquidities_2 = await getNetLiquidities(contract_2, initializedTiks_2, i);

            Object.assign(pTLfile[i][poolAddr_1].netLiquidities, netLiquidities_1);
            Object.assign(pTLfile[i][poolAddr_2].netLiquidities, netLiquidities_2);

            fs.writeFileSync(poolsTicksLiqsFile, JSON.stringify(pTLfile, null, 2), 'utf-8');

            console.log(`Iteration ${i + 1}/${pTLfile.length} finished.`);
            await sleep(SLEEP_TIME);

        } catch (err) {
            errorCount++;
            console.error(`Error in ${i}:`, err);
            if (errorCount >= MAX_ERRORS) {
                console.error(`Error limit crossed (${MAX_ERRORS}). Action terminated.`);
                process.exit(1);
            }
        }

    }

    console.log(`====================================`);
    console.log(`Results in ./out/poolsTicksLiqs.json`);

}

module.exports = getLiquidities;