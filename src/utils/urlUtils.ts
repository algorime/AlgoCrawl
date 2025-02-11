/**
 * URL Utility Module
 * Provides helper functions for URL manipulation and validation.
 * Handles domain checking, URL normalization, and filtering of unwanted URLs.
 */

/**
 * Checks if a URL is within the allowed domains
 * Handles various domain formats:
 * - Exact matches
 * - www subdomain
 * - Any subdomain
 */
export function isUrlAllowed(url: string, allowedDomains: string[]): boolean {
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => {
      // Match exact domain, www subdomain, or any subdomain
      return urlObj.hostname === domain || 
             urlObj.hostname === `www.${domain}` ||
             urlObj.hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL to a standard format
 * Ensures consistent URL representation throughout the application
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Determines if a URL should be processed
 * Filters out:
 * - Non-HTTP(S) protocols
 * - Analytics and tracking domains
 * - URLs outside allowed domains
 */
export function shouldProcessUrl(url: string, allowedDomains: string[]): boolean {
  // Skip non-HTTP(S) protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // List of domains to skip (analytics, tracking, social media)
  const skipDomains = [
    'google-analytics.com',
    'doubleclick.net',
    'facebook.com',
    'linkedin.com',
    'twitter.com',
    'analytics'
  ];
  
  try {
    const urlObj = new URL(url);
    // Check against skip list
    if (skipDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    // Check if domain is allowed
    return isUrlAllowed(url, allowedDomains);
  } catch {
    return false;
  }
} 