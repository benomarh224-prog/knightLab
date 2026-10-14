const { parentPort } = require('node:worker_threads');
const stockfish = require('stockfish')('lite-single', line => parentPort.postMessage(line));
parentPort.on('message', command => stockfish.processCommand(command));
