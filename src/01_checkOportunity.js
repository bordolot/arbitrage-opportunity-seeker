/** 
 * Uniswap v2 Mainnet
 * 
 * V2Router02 Contract Address
 * 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
 * **/

/**
 * Uniswap v3 Mainnet
 * 
 * SwapRouter
 * 0xE592427A0AEce92De3Edee1F18E0157C05861564
 */

const { ethers } = require("ethers");
const fs = require("fs-extra");
const uniswapv3Pool_abi = require('./uniswapLibs/interfaces/IUniswapV3Pool.json');
const erc20_abi = require('./uniswapLibs/interfaces/ERC20.json');
const { opportunityResultsFile, outDir } = require('./paths');
require('dotenv').config({ debug: false, override: false, quiet: true });
const BLOCK_NUMBER = Number(process.env.BLOCK_NUMBER);
const endpoint = process.env.ALCHEMY_ENDPOINT;

const inputFile = "./inputFiles/pools/combinations_uniswapv3.json";
const testInputFile = "./inputFiles/pools/test_combinations_uniswapv3.json";
const outputFile = opportunityResultsFile;

const MAX_ERRORS = 5;
const provider = new ethers.JsonRpcProvider(endpoint);


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function slot0ToJSON(result, fee, liquidity, adresy, decA, decB) {
    return {
        sqrtPriceX96: result[0].toString(),
        tick: result[1].toString(),
        observationIndex: result[2].toString(),
        observationCardinality: result[3].toString(),
        observationCardinalityNext: result[4].toString(),
        feeProtocol: result[5].toString(),
        unlocked: result[6],
        fee: fee,
        liquidity: liquidity,
        adresy: {
            [adresy[0]]: decA,
            [adresy[1]]: decB
        }
    };
}

async function getLiquidity(contract) {
    const liquidity = await contract.liquidity(
        { blockTag: BLOCK_NUMBER }
    );
    return liquidity.toString();
}

async function getDecimals(contract) {

    const decimals = await contract.decimals(
        { blockTag: BLOCK_NUMBER }
    );
    return decimals.toString();
}

async function checkOportunity(isTest = true) {
    let combinations;
    if (isTest) {
        combinations = await fs.readJSON(testInputFile);
    } else {
        combinations = await fs.readJSON(inputFile);
    }


    let errorCount = 0;
    let existingResults = [];

    await fs.ensureDir(outDir);
    // try {
    //     existingResults = await fs.readJSON(outputFile);
    // } catch {
    //     existingResults = [];
    // }

    const start = 0;
    const end = combinations.length;
    // const end = 1;
    let maxDiff = 0n;
    let maxPair = [];


    for (let i = start; i < end; i++) {
        try {
            const [pool_1, pool_2, fee_1, fee_2, adresy] = combinations[i];

            const contract_A = new ethers.Contract(pool_1, uniswapv3Pool_abi.abi, provider);
            const contract_B = new ethers.Contract(pool_2, uniswapv3Pool_abi.abi, provider);

            const token_A = new ethers.Contract(adresy[0], erc20_abi.abi, provider);
            const token_B = new ethers.Contract(adresy[1], erc20_abi.abi, provider);

            const liquidity_1 = await getLiquidity(contract_A);

            if (Number(liquidity_1) === 0) {
                console.log(`Iteration ${i + 1}/${combinations.length}, 0 Liquidity, iteration skipped.`);
                continue;
            }
            const liquidity_2 = await getLiquidity(contract_B);

            if (Number(liquidity_2) === 0) {
                console.log(`Iteration ${i + 1}/${combinations.length}, 0 Liquidity, iteration skipped.`);
                continue;
            }

            const result_1 = await contract_A.slot0({
                blockTag: BLOCK_NUMBER
            });
            const result_2 = await contract_B.slot0({
                blockTag: BLOCK_NUMBER
            });

            const decimals_A = await getDecimals(token_A);
            const decimals_B = await getDecimals(token_B);

            const resultEntry = {
                [pool_1]: slot0ToJSON(result_1, fee_1, liquidity_1, adresy, decimals_A, decimals_B),
                [pool_2]: slot0ToJSON(result_2, fee_2, liquidity_2, adresy, decimals_A, decimals_B)
            };

            existingResults.push(resultEntry);

            await fs.writeJSON(outputFile, existingResults, { spaces: 2 });

            const diff = result_1[0] - result_2[0];
            const absDiff = diff < 0n ? -diff : diff;

            if (absDiff > maxDiff) {
                maxDiff = absDiff;
                maxPair = [pool_1, pool_2];
            }

            console.log(`Iteration ${i + 1}/${combinations.length} finished. The price difference: ${absDiff}`);
            await sleep(100);

        } catch (err) {
            errorCount++;
            console.error(`Error in ${i} iteration:`, err);
            if (errorCount >= MAX_ERRORS) {
                console.error(`Error limit has been reached (${MAX_ERRORS}). I'm stooping the script.`);
                process.exit(1);
            }
        }
    }

    console.log(`The highest sqrt price difference: ${maxDiff.toString()}`);
    console.log(`Contracts:`, maxPair);

    console.log(`====================================`);
    console.log(`All results in ./out/opportunityResults.json`);

}

module.exports = checkOportunity;
