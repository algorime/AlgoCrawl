/**
 * Crawler Configuration Types
 * Defines the structure and types for the crawler's configuration.
 * This interface is used throughout the application to ensure
 * type safety and proper configuration validation.
 */

export interface CrawlerConfig {
  // Core crawling parameters
  startUrl: string;              // Initial URL to begin crawling from
  allowedDomains: string[];      // List of domains allowed to crawl
  maxDepth: number;              // Maximum depth of crawl from start URL
  maxPagesPerDomain: number;     // Maximum pages to crawl per domain

  // Browser behavior
  headless: boolean;             // Whether to run browser in headless mode
  timeout: number;               // Global timeout for operations
  frameworkTimeout: number;      // Timeout for framework-specific operations
  retryDelay: number;           // Delay between retry attempts
  networkIdleTime: number;      // Time to wait for network idle

  // URL handling
  ignoreHashFragments: boolean;  // Whether to ignore URL hash fragments
  ignoreQueryParams: boolean;    // Whether to ignore URL query parameters
  respectRobotsTxt: boolean;    // Whether to respect robots.txt rules

  // Rate limiting
  requestDelay: number;         // Delay between requests
  maxConcurrentRequests: number; // Maximum concurrent requests
  concurrencyMode?: string;     // How to handle concurrent requests

  // Output and logging
  outputDir: string;            // Directory for crawler output
  saveScreenshots: boolean;     // Whether to save page screenshots
  logLevel: string;            // Logging verbosity level

  // Interaction settings
  interactWithForms: boolean;   // Whether to interact with forms
  interactWithElements: boolean; // Whether to interact with clickable elements

  // Proxy configuration (optional)
  proxy?: {
    server: string;             // Proxy server address
    ignoreHTTPSErrors: boolean; // Whether to ignore HTTPS errors
  };
} 