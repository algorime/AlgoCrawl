/**
 * Entry point for the web crawler application.
 * Initializes configuration, sets up output directory, and starts the crawling process.
 * Handles basic error management and process termination.
 */

/// <reference types="node" />
import { chromium } from 'playwright';
import { loadConfig } from './utils/configLoader.js';
import { crawlPage } from './crawlerEngine.js';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Convert ESM module URL to filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Load configuration from either CLI argument or default path
    const configPath = process.argv[2] || join(__dirname, '../config/default.json');
    const config = loadConfig(configPath);
    
    // Create output directory if it doesn't exist
    await mkdir(config.outputDir, { recursive: true });
    
    // Initialize crawler and begin processing
    await crawlPage(config);
  } catch (error) {
    console.error('Error executing crawling process:', error);
    process.exit(1);  // Exit with error code
  }
}

main(); 