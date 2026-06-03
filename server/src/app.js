import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.send('Splitly API is running');
});

// API Routes mounting
app.use('/api/v1', routes);

// Error Handling Middleware
app.use(errorHandler);

export default app;
