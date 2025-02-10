export function isUrlAllowed(url: string, allowedDomains: string[]): boolean {
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => {
      // Exact domain match or .domain.com match
      return urlObj.hostname === domain || 
             urlObj.hostname === `www.${domain}` ||
             urlObj.hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return url;
  }
}

export function shouldProcessUrl(url: string, allowedDomains: string[]): boolean {
  // Skip non-http(s) protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Skip known analytics and tracking domains
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
    if (skipDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    return isUrlAllowed(url, allowedDomains);
  } catch {
    return false;
  }
} 