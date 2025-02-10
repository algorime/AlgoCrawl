/// <reference types="node" />
import { chromium } from 'playwright';
import { loadConfig } from './utils/configLoader.js';
import { crawlPage } from './crawlerEngine.js';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Load configuration
    const configPath = process.argv[2] || join(__dirname, '../config/default.json');
    const config = loadConfig(configPath);
    
    // Ensure output directory exists
    await mkdir(config.outputDir, { recursive: true });
    
    // Start crawling
    await crawlPage(config);
  } catch (error) {
    console.error('Error executing crawling process:', error);
    process.exit(1);
  }
}

main(); 