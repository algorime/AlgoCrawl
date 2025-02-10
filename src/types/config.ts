export interface CrawlerConfig {
  startUrl: string;
  allowedDomains: string[];
  maxDepth: number;
  maxPagesPerDomain: number;
  headless: boolean;
  timeout: number;
  frameworkTimeout: number;
  retryDelay: number;
  networkIdleTime: number;
  ignoreHashFragments: boolean;
  ignoreQueryParams: boolean;
  respectRobotsTxt: boolean;
  requestDelay: number;
  maxConcurrentRequests: number;
  concurrencyMode?: string;
  outputDir: string;
  saveScreenshots: boolean;
  logLevel: string;
  interactWithForms: boolean;
  interactWithElements: boolean;
  proxy?: {
    server: string;
    ignoreHTTPSErrors: boolean;
  };
} 