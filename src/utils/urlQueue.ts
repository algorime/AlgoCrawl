/**
 * URL Queue Management System
 * Handles the crawling frontier with features for:
 * - URL normalization and deduplication
 * - Depth tracking and limiting
 * - Domain-based crawl restrictions
 * - Query parameter and hash fragment handling
 */

import { URL } from 'url';

export class UrlQueue {
  // Core data structures for queue management
  private queue: Set<string> = new Set();          // URLs pending processing
  private visited: Set<string> = new Set();        // Already processed URLs
  private currentDepth: Map<string, number> = new Map();  // Tracks crawl depth per URL

  constructor(
    private maxDepth: number,              // Maximum crawl depth allowed
    private maxPagesPerDomain: number,     // Maximum pages to crawl per domain
    private allowedDomains: string[],      // List of domains allowed to crawl
    private ignoreQueryParams: boolean = false,    // Whether to ignore URL query parameters
    private ignoreHashFragments: boolean = false   // Whether to ignore URL hash fragments
  ) {}

  /**
   * Adds a URL to the queue if it meets all crawling criteria
   * @param url - The URL to potentially add to the queue
   * @param depth - The current crawl depth of this URL
   * @returns boolean indicating if URL was successfully added
   */
  public add(url: string, depth: number = 0): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    if (this.shouldProcessUrl(normalizedUrl, depth)) {
      this.queue.add(normalizedUrl);
      this.currentDepth.set(normalizedUrl, depth);
      return true;
    }
    return false;
  }

  /**
   * Retrieves and removes the next URL from the queue
   * @returns The next URL to process or null if queue is empty
   */
  public next(): string | null {
    if (this.queue.size === 0) return null;
    
    const nextValue = this.queue.values().next().value;
    if (!nextValue) return null;
    
    this.queue.delete(nextValue);
    this.visited.add(nextValue);
    return nextValue;
  }

  public getCurrentDepth(url: string): number {
    return this.currentDepth.get(this.normalizeUrl(url)) || 0;
  }

  public hasBeenVisited(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const hasBeenVisited = this.visited.has(normalizedUrl);
    if (hasBeenVisited) {
      console.log(`Skipping visited URL: ${url}`);
    }
    return hasBeenVisited;
  }

  /**
   * Normalizes a URL by standardizing its components
   * Handles: hostname case, pathname formatting, query params, and hash fragments
   */
  public normalizeUrl(urlString: string): string {
    try {
      const url = new URL(urlString);
      
      // Normalize hostname to lowercase (hostnames are case-insensitive)
      url.hostname = url.hostname.toLowerCase();
      
      // Normalize pathname but preserve case
      let pathname = url.pathname;
      pathname = pathname.replace(/\/+/g, '/');  // Replace multiple slashes with single
      pathname = pathname.replace(/\/+$/, '');   // Remove trailing slash
      pathname = pathname.replace(/^\/+/, '/');  // Ensure single leading slash
      // Handle default pages but preserve case
      pathname = pathname.replace(/\/(index|default)\.(php|html|htm|asp|aspx)$/i, '/');
      url.pathname = pathname;

      // Handle query parameters
      if (this.ignoreQueryParams) {
        url.search = '';
      } else {
        // Sort query parameters to ensure consistent ordering but preserve case
        const searchParams = new URLSearchParams(url.search);
        const sortedParams = Array.from(searchParams.entries())
          .sort(([a], [b]) => a.localeCompare(b));
        url.search = new URLSearchParams(sortedParams).toString();
      }

      // Handle hash fragments
      if (this.ignoreHashFragments) {
        url.hash = '';
      }

      return url.toString().replace(/\/$/, ''); // Remove trailing slash from final URL
    } catch (e) {
      return urlString;
    }
  }

  /**
   * Determines if two URLs are effectively the same after normalization
   */
  private isSameUrl(url1: string, url2: string): boolean {
    try {
      const parsed1 = new URL(url1);
      const parsed2 = new URL(url2);
      
      return parsed1.hostname === parsed2.hostname && 
             this.normalizeUrl(url1) === this.normalizeUrl(url2);
    } catch {
      return url1 === url2;
    }
  }

  /**
   * Validates if a URL should be processed based on:
   * - Duplicate detection
   * - Depth limits
   * - Domain restrictions
   * - Pages per domain limits
   */
  private shouldProcessUrl(url: string, depth: number): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    if (this.visited.has(normalizedUrl) || this.queue.has(normalizedUrl)) return false;
    if (depth > this.maxDepth) return false;

    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const path = parsedUrl.pathname;

      // Check if domain is allowed
      if (!this.allowedDomains.includes(domain)) return false;

      // Check if we've already visited this path (ignoring query params)
      const hasVisitedPath = Array.from(this.visited).some(visitedUrl => {
        try {
          const visitedParsed = new URL(visitedUrl);
          return visitedParsed.hostname === domain && 
                 visitedParsed.pathname === path;
        } catch {
          return false;
        }
      });

      if (hasVisitedPath) return false;

      // Check domain visit count
      const domainVisitCount = Array.from(this.visited)
        .filter(visitedUrl => {
          try {
            return new URL(visitedUrl).hostname === domain;
          } catch {
            return false;
          }
        }).length;

      return domainVisitCount < this.maxPagesPerDomain;
    } catch {
      return false;
    }
  }

  /**
   * Returns current queue size
   */
  public getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Returns number of processed URLs
   */
  public getVisitedCount(): number {
    return this.visited.size;
  }
} 