import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { initDB } from './config/db.js';
import { clerkMiddleware } from "@clerk/express";
import { arcjetMiddleware } from "./middlewares/arcjet.middleware.js";
import { ENV } from "./config/env.js";
import job from './config/cron.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'; 
import rateLimiter from "./middlewares/rateLimiter.js";

dotenv.config();

const app = express();

if (ENV.NODE_ENV === "production") job.start();

// Configuration Swagger
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swaggerDocument = YAML.load(join(__dirname, './docs/swagger.yaml'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));;
app.use(rateLimiter);

// Clerk middleware
app.use(clerkMiddleware());
app.use(arcjetMiddleware);

app.get("/", (req, res) => res.send("Hello from server"));

// Initialisation de la base de données
initDB().catch(console.error);

// Route de documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Serveur fonctionne',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV || 'production'
  });
});

// Routes
app.use('/api', routes);

// Route health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = ENV.PORT || 3000;



// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Démarrage du serveur

const startServer = async () => {
  try {
    await initDB();

    // listen for local development
    if (ENV.NODE_ENV !== "production") {
      app.listen(ENV.PORT, () => {
        console.log("Server is up and running on PORT 📍 :", ENV.PORT);
        console.log(`API Documentation 📚: http://localhost:${ENV.PORT}/api-docs`);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// export for vercel
export default app;



