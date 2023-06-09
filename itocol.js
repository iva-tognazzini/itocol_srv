// the server launcher

const { execSync, spawn } = require('child_process')
const fs = require('fs');
const { resolve } = require('path');
const args = process.argv.slice(2);
const projPath = resolve(args[0] || './');
const port = args[1] || 44707;
if (!fs.existsSync(projPath)) {
	console.error(`Error: the path ${projPath} does not exist!`);
	process.exit(1);
}

try {
	execSync(`pm2 stop itocol`);
} catch (e) {
	// ignore
}
const cmd = (`pm2 -f start ${__dirname}/bin/server.js --watch --restart-delay 100 --name itocol -i 1 -- ${projPath} ${port}`);
// console.log(`-> starting itocol...\n${cmd}`);
execSync(cmd);
console.log(`🐣 itocol is started!`.toUpperCase());
console.log(`-> to stop the server, run: pm2 stop itocol`);
console.log(`🐣 launching pm2 logs...`);
spawn('pm2', ['logs', 'itocol'], { stdio: 'inherit' });