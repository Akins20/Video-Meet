import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Configuration interface for type safety
 * This ensures all our environment variables are properly typed
 */
interface Config {
  // Application settings
  nodeEnv: string;
  port: number;
  apiVersion: string;
  
  // Database configuration
  database: {
    uri: string;
    testUri: string;
  };
  
  // Redis configuration
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  
  // JWT configuration
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // Security settings
  security: {
    bcryptRounds: number;
    corsOrigins: string[];
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // WebRTC configuration
  webrtc: {
    stunServer: string;
    turnServer?: string;
    turnUsername?: string;
    turnPassword?: string;
  };
  
  // Local network settings
  localNetwork: {
    enabled: boolean;
    discoveryPort: number;
    serviceName: string;
  };
  
  // File upload settings
  upload: {
    maxSize: string;
    directory: string;
    allowedTypes: string[];
  };
  
  // Logging configuration
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
  };
  
  // Development settings
  development: {
    debugMode: boolean;
    enableApiDocs: boolean;
    enableDetailedErrors: boolean;
  };
}

/**
 * Parse environment variable as integer with default fallback
 */
const parseIntEnv = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse comma-separated string into array
 */
const parseArrayEnv = (value: string | undefined, defaultValue: string[] = []): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Validate required environment variables
 */
const validateRequiredEnvVars = (): void => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secrets are not default values
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('Please change the default JWT_SECRET in your .env file');
  }
  
  if (process.env.JWT_REFRESH_SECRET === 'your-refresh-token-secret-change-this-too') {
    throw new Error('Please change the default JWT_REFRESH_SECRET in your .env file');
  }
};

/**
 * Main configuration object
 * This centralizes all environment variable access with validation
 */
const config: Config = {
  // Application settings
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseIntEnv(process.env.PORT, 5000),
  apiVersion: process.env.API_VERSION || 'v1',
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/videomeet-dev',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/videomeet-test',
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseIntEnv(process.env.REDIS_DB, 0),
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  
  // Security settings
  security: {
    bcryptRounds: parseIntEnv(process.env.BCRYPT_ROUNDS, 12),
    corsOrigins: parseArrayEnv(process.env.ALLOWED_ORIGINS, ["*"]),
    rateLimit: {
      windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW, 15) * 60 * 1000, // Convert to milliseconds
      maxRequests: parseIntEnv(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    },
  },
  
  // WebRTC configuration
  webrtc: {
    stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServer: process.env.TURN_SERVER,
    turnUsername: process.env.TURN_USERNAME,
    turnPassword: process.env.TURN_PASSWORD,
  },
  
  // Local network settings
  localNetwork: {
    enabled: process.env.ENABLE_LOCAL_NETWORK === 'true',
    discoveryPort: parseIntEnv(process.env.LOCAL_DISCOVERY_PORT, 8080),
    serviceName: process.env.MDNS_SERVICE_NAME || 'videomeet',
  },
  
  // File upload settings
  upload: {
    maxSize: process.env.MAX_FILE_SIZE || '50MB',
    directory: process.env.UPLOAD_DIR || 'uploads',
    allowedTypes: parseArrayEnv(process.env.ALLOWED_FILE_TYPES, ['jpg', 'jpeg', 'png', 'pdf']),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10MB',
    maxFiles: parseIntEnv(process.env.LOG_MAX_FILES, 5),
  },
  
  // Development settings
  development: {
    debugMode: process.env.DEBUG_MODE === 'true',
    enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
    enableDetailedErrors: process.env.ENABLE_DETAILED_ERRORS === 'true',
  },
};

// Validate configuration on startup
if (config.nodeEnv !== 'test') {
  validateRequiredEnvVars();
}

export default config;