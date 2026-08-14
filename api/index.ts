// @ts-ignore - serverless-http will be installed during build
import serverless from 'serverless-http';
// @ts-ignore - app will be available after build
import app from '../artifacts/api-server/src/app.js';

// Vercel serverless function handler
export default serverless(app);
