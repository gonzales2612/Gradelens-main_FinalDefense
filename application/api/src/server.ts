import { createApp } from "./app.js";
import { connectMongo } from "./infra/mongo.js";
import { startResultsConsumer, stopResultsConsumer } from "./queues/results.consumer.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await connectMongo();

  // Start background consumer for scan results
  startResultsConsumer();

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    stopResultsConsumer();
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    stopResultsConsumer();
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

bootstrap();
