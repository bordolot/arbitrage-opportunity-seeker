# Arbitrage Opportunity Seeker

This tool scans Uniswap v3 pool pairs for arbitrage opportunities at a specific block number. It performs local swap simulations to estimate the optimal amount of tokens to swap between pools and calculates potential profit from the price imbalance.

## Features

- Fetches on-chain data from Uniswap v3 pools
- Detects price differences between pool pairs using ticks
- Simulates local swaps to find optimal arbitrage parameters
- Estimates token profit from the arbitrage opportunity

## Tech Stack

- Node.js
- Ethers.js