const fs = require('fs-extra');
const path = require('path');
const outDir = path.join(__dirname, '../out');

async function directoryExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}


module.exports = {
    outDir,
    opportunityResultsFile: path.join(outDir, 'opportunityResults.json'),
    poolsTicksLiqsFile: path.join(outDir, 'poolsTicksLiqs.json'),
    optimalAmountsFile: path.join(outDir, 'optimalAmounts.json'),
    directoryExists
};