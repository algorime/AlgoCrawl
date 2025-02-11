/**
 * Configuration Loading Module
 * Handles loading and validation of crawler configuration from JSON files.
 * Ensures all required fields are present and valid before crawler initialization.
 */

import { readFileSync } from 'fs';
import type { CrawlerConfig } from '../types/config.js';

/**
 * Loads and validates crawler configuration from a JSON file
 * @param configPath - Path to the configuration file
 * @returns Validated CrawlerConfig object
 * @throws Error if configuration is invalid or missing required fields
 */
export function loadConfig(configPath: string): CrawlerConfig {
  try {
    // Read and parse configuration file
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

/**
 * Validates the configuration object
 * Checks for:
 * - Required fields presence
 * - Numeric field validity
 * - URL format validity
 * - Log level validity
 * @private
 */
function validateConfig(config: CrawlerConfig): void {
  // Required configuration fields
  const requiredFields: (keyof CrawlerConfig)[] = [
    'startUrl',
    'allowedDomains',
    'maxDepth',
    'maxPagesPerDomain',
    'timeout'
  ];

  // Check for presence of required fields
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

  // Validate URL format
  try {
    new URL(config.startUrl);
  } catch {
    throw new Error('Invalid startUrl');
  }

  // Validate log level is valid
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error('Invalid logLevel');
  }
} 