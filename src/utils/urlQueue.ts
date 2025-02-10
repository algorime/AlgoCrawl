import { URL } from 'url';

export class UrlQueue {
  private queue: Set<string> = new Set();
  private visited: Set<string> = new Set();
  private currentDepth: Map<string, number> = new Map();

  constructor(
    private maxDepth: number,
    private maxPagesPerDomain: number,
    private allowedDomains: string[],
    private ignoreQueryParams: boolean = false,
    private ignoreHashFragments: boolean = false
  ) {}

  public add(url: string, depth: number = 0): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    if (this.shouldProcessUrl(normalizedUrl, depth)) {
      this.queue.add(normalizedUrl);
      this.currentDepth.set(normalizedUrl, depth);
      return true;
    }
    return false;
  }

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

  public getQueueSize(): number {
    return this.queue.size;
  }

  public getVisitedCount(): number {
    return this.visited.size;
  }
} 