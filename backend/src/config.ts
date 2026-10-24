import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const atlasHost = 'cluster0.yfvsksd.mongodb.net';
const databaseName = 'mednexis';

export type AppConfig = {
  port: number;
  mongodbUri: string | null;
};

function readPort(): number {
  const value = process.env.PORT?.trim() || '5000';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

export function validateMongoUri(value: string | undefined): string | null {
  const uriValue = value?.trim();
  if (!uriValue) {
    return null;
  }

  try {
    const uri = new URL(uriValue);
    const username = decodeURIComponent(uri.username);
    const password = decodeURIComponent(uri.password);
    const hasTemplateCredentials = [username, password].some((credential) =>
      /^(?:<[^>]*>|(?:your[_ -]?)?(?:database[_ -]?)?(?:user(?:name)?|pass(?:word)?)|(?:change|replace)[_ -]?me|example|placeholder)$/i.test(
        credential.trim(),
      ),
    );

    if (
      uri.protocol !== 'mongodb+srv:' ||
      uri.hostname.toLowerCase() !== atlasHost ||
      uri.pathname !== `/${databaseName}` ||
      uri.hash.length > 0 ||
      hasTemplateCredentials
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return uriValue;
}

function readMongoUri(): string | null {
  const value = process.env.MONGODB_URI;
  if (!value?.trim()) {
    console.warn(
      'MONGODB_URI is not configured in backend/.env; the API will run with MongoDB disconnected.',
    );
    return null;
  }

  const uri = validateMongoUri(value);
  if (!uri) {
    console.warn(
      'MONGODB_URI is invalid; configure a valid Atlas URI in backend/.env. The API will run with MongoDB disconnected.',
    );
  }
  return uri;
}

export function loadConfig(): AppConfig {
  return {
    port: readPort(),
    mongodbUri: readMongoUri(),
  };
}
