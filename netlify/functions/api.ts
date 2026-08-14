// @ts-ignore - serverless-http will be installed during Netlify build
import serverless from 'serverless-http';
// @ts-ignore - app will be available after build
import app from '../../artifacts/api-server/src/app.js';

// Netlify serverless function handler using serverless-http
export const handler = serverless(app);
