import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

// PORT is optional for Vercel Functions compatibility
if (rawPort) {
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

// Export app for serverless environments (Vercel Functions)
export default app;
