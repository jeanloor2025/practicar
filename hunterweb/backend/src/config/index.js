import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'hunterweb',
    user: process.env.DB_USER || 'hunterweb',
    password: process.env.DB_PASSWORD || 'hunterweb123',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES) || 3,
  },
  
  alerts: {
    scoreThreshold: parseInt(process.env.ALERT_SCORE_THRESHOLD) || 80,
  },
};

export default config;
