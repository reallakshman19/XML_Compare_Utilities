const unavailable=()=>{throw new Error('Node command-line file access is not available in the browser');};
export {unavailable as readFileSync, unavailable as readdirSync, unavailable as fileURLToPath, unavailable as dirname, unavailable as join};
