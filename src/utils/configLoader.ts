import { readFileSync } from 'fs';
import type { CrawlerConfig } from '../types/config.js';

export function loadConfig(configPath: string): CrawlerConfig {
  try {
    const configFile = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configFile) as CrawlerConfig;
    validateConfig(config);
    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}

function validateConfig(config: CrawlerConfig): void {
  // Required fields
  const requiredFields: (keyof CrawlerConfig)[] = [
    'startUrl',
    'allowedDomains',
    'maxDepth',
    'maxPagesPerDomain',
    'timeout'
  ];

  for (const field of requiredFields) {
    if (config[field] === undefined) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  // Validate numeric fields are positive
  if (config.maxDepth <= 0) throw new Error('maxDepth must be positive');
  if (config.maxPagesPerDomain <= 0) throw new Error('maxPagesPerDomain must be positive');
  if (config.timeout <= 0) throw new Error('timeout must be positive');
  if (config.requestDelay < 0) throw new Error('requestDelay cannot be negative');
  if (config.maxConcurrentRequests <= 0) throw new Error('maxConcurrentRequests must be positive');

  // Validate URLs and domains
  try {
    new URL(config.startUrl);
  } catch {
    throw new Error('Invalid startUrl');
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error('Invalid logLevel');
  }
} 