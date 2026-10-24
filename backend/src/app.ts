import express, { type ErrorRequestHandler } from 'express';
import { isMongoConnected } from './database';
import medicationRoutes from './routes/medications';
import patientRoutes from './routes/patients';
import prescriptionRoutes from './routes/prescriptions';

export const app = express();

app.disable('x-powered-by');
app.use((request, response, next) => {
  const origin = request.get('origin');
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    server: 'running',
    mongodb: isMongoConnected() ? 'connected' : 'disconnected',
  });
});

app.use('/api/patients', patientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found.' });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  console.error('Request failed.');
  response.status(500).json({ error: 'An unexpected server error occurred.' });
};

app.use(errorHandler);
