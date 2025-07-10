# Arbitrage Opportunity Seeker

This tool scans Uniswap v3 pool pairs for arbitrage opportunities at a specific block number. It performs local swap simulations to estimate the optimal amount of tokens to swap between pools and calculates potential profit from the price imbalance.

## Features

- Fetches on chain data from Uniswap v3 pools from finished blocks  
- Detects price differences between pool pairs using ticks  
- Simulates local swaps to find optimal arbitrage parameters  
- Estimates token profit from the arbitrage opportunity  
- Returns data necessary to perform arbitrage  

## Tech Stack

- Node.js  
- Ethers.js  

## Usage

1. Install dependencies
```bash
npm install
```


2. Create .env file in parent directory.

Replace {your_api_key} with your individual key - you can use also use other api providers.
Replace {block_number} with a block number you want to check. You can get the latest block number on `https://etherscan.io/`
```bash
echo "ALCHEMY_ENDPOINT=https://eth-mainnet.g.alchemy.com/v2/{your_api_key}" > .env
echo "BLOCK_NUMBER = {block_number}" >> .env
```

3. Get initial data for pool pairs

There is ready-made file with a combiantion of 610 pool pairs on uniswap v3 located at 
`./inputFiles/combinations_uniswapv3.json`.
There is also a file with 29 pairs for testing purposes.

You can remove pairs from these files or add your own as long as aech pool is a uniswap v3 pool, fees for these pools are different and each pool represent the same token0 and token1.


Each pair element in the JSON file has the following structure:
```json
  [
    "pool_1_address",
    "pool_2_address",
    "fee_in_pool_1",
    "fee_in_pool_2",
    [
      "token0_address",
      "token1_address"
    ]
  ],
```

To get the price at the end of the specified block number for each pool in a pair:
```bash
#for 29 pairs
npm run scanpoolstest
```

or 

```bash
#for all 610 pairs
npm run scanpools
```

This command creates the `./out/opportunityResults.json` file, which contains price data necessary for further operations.


3. Get additional data for pairs where the price difference meets your criteria.

```bash
npm run getpoolsdata
```

or 

```bash
npm run getpoolsdata {lowerTickDifference} {higherTickDifference}
```

Price are defined by `sqrtPriceX96` or `tick` parameter.
Here you can specify `tick` difference you are looking for - lower and upper bounds.
By default `lowerTickDifference = 1000`
By default `higherTickDifference = 4000`
You can change the default values in the `./src/02_calculateTickDiffs.js` file.

This command creates the `./out/poolsTicksLiqs.json` file which contains data required for swap simulations.

4. Run swap simulations to get data necessary to perform arbitrage.

```bash
npm run simulate
```

This command creates the `./out/optimalAmounts.json` file.

You can use this data in `arbitrage-on-uniswapv3` project to test and execute arbitrage based on the calculated values.
