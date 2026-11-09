import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface DatabaseConfig {
  type: 'sqlite' | 'mysql';
  path?: string;
  mysql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

export interface AiConfig {
  enabled: boolean;
  provider: 'ollama' | 'openai' | 'anthropic' | 'none';
  endpoint?: string;
  model?: string;
  apiKey?: string;
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  jwtSecret: string;
  refreshTokenSecret: string;
  database: DatabaseConfig;
  ai: AiConfig;
}

function getDatabaseConfig(): DatabaseConfig {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';

  if (dbType === 'mysql') {
    return {
      type: 'mysql',
      mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'lens_flare',
      },
    };
  }

  return {
    type: 'sqlite',
    path: process.env.SQLITE_PATH || path.join(process.cwd(), 'lens-flare.db'),
  };
}

function getAiConfig(): AiConfig {
  const enabled = process.env.AI_ENABLED !== 'false';
  const provider = (process.env.AI_PROVIDER || 'ollama') as AiConfig['provider'];

  const config: AiConfig = { enabled, provider };

  if (provider === 'ollama') {
    config.endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    config.model = process.env.OLLAMA_MODEL || 'llava:latest';
  } else if (provider === 'openai') {
    config.apiKey = process.env.OPENAI_API_KEY;
    config.model = process.env.OPENAI_MODEL || 'gpt-4-vision';
  } else if (provider === 'anthropic') {
    config.apiKey = process.env.ANTHROPIC_API_KEY;
    config.model = process.env.ANTHROPIC_MODEL || 'claude-3-vision';
  }

  return config;
}

export function getConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

  if (!jwtSecret || !refreshTokenSecret) {
    throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must be set in environment variables');
  }

  return {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'],
    jwtSecret,
    refreshTokenSecret,
    database: getDatabaseConfig(),
    ai: getAiConfig(),
  };
}
