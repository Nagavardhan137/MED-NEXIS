import { app } from './app';
import { loadConfig } from './config';
import { connectMongo } from './database';
import mongoose from 'mongoose';

let config;

try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid backend configuration.');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.info(`MED-NEXIS API listening on port ${config.port}.`);
  void connectMongo(config.mongodbUri);
});

function shutdown(signal: string): void {
  console.info(`${signal} received; shutting down.`);
  server.close(() => {
    void mongoose.disconnect().finally(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', () => {
  console.error('The API server could not start. Check whether the configured port is available.');
  process.exit(1);
});
