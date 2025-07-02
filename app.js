import express from 'express';
import messagesRoutes from './routes/messages.js';

const app = express();
app.use(express.json());
app.use('/api', messagesRoutes);

export default app;
