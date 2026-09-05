// run-wrangler.js - Directly run wrangler's CLI bundle overriding process.argv
const path = require("path");

const cliPath = path.join(__dirname, "node_modules/wrangler/wrangler-dist/cli.js");

// Override process.argv so Yargs hideBin works correctly
process.argv = [
  "node",     // Must contain "node" so Yargs strips the script path
  cliPath,    // Script path
  "dev",
  "--port", "8787",
  "--ip", "127.0.0.1"
];

// Set require.main to the cli.js module so it executes if it checks require.main
require(cliPath);
