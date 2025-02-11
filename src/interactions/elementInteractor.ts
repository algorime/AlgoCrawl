/**
 * Element Interaction Module
 * Handles complex interactions with clickable elements on web pages.
 * Features:
 * - Dynamic content detection
 * - Framework-specific handling (React, Vue, Angular)
 * - AJAX request monitoring
 * - Smart retry mechanisms
 * - Interaction tracking
 */

import { Page, ElementHandle, Request, Response } from 'playwright';
import { ClickableElement, InteractionResult } from '../types/interaction.js';
import { isUrlAllowed, shouldProcessUrl } from '../utils/urlUtils.js';
import { findClickableElements } from './elementFinder.js';
import { InteractionTracker } from '../utils/interactionTracker.js';
import { UrlQueue } from '../utils/urlQueue.js';

// Core interfaces for interaction handling
interface InteractionOptions {
  timeout: number;              // Maximum time to wait for interactions
  allowedDomains: string[];     // Domains allowed for navigation
  startUrl: string;             // Initial URL being processed
  urlQueue: UrlQueue;           // Queue manager for URLs
  frameworkTimeout?: number;    // Timeout for framework-specific operations
  retryDelay?: number;         // Delay between retry attempts
  networkIdleTime?: number;    // Time to wait for network idle
}

interface AjaxResponse {
  url: string;
  status?: number;
  content?: string;
  timing?: {
    started: number;
    completed: number;
    duration: number;
  };
}

interface FrameworkChanges {
  dom: boolean;
  react: boolean;
  vue: boolean;
  angular: boolean;
  history: boolean;
}

declare global {
  interface Window {
    _dynamicChangeDetected?: boolean;
    _frameworksDetected?: FrameworkChanges;
  }
}

// Singleton tracker instance for monitoring interactions
const interactionTracker = new InteractionTracker();
// Track processed JavaScript functions to avoid duplicates
const processedJavaScriptFunctions = new Set<string>();

/**
 * Monitors dynamic changes in the page after interaction
 * Detects mutations from various sources:
 * - DOM changes
 * - Framework updates (React, Vue, Angular)
 * - History/routing changes
 * - AJAX/Fetch requests
 */
async function waitForDynamicChanges(page: Page, timeout: number): Promise<boolean> {
  let mutationOccurred = false;
  
  await page.evaluate((timeoutMs) => {
    return new Promise<void>(resolve => {
      // Ensure we have access to document.body
      if (!document.body) {
        resolve();
        return;
      }

      let changes: FrameworkChanges = {
        dom: false,
        react: false,
        vue: false,
        angular: false,
        history: false
      };

      // Watch for DOM mutations
      const observer = new MutationObserver(mutations => {
        if (mutations.some(m => m.type === 'childList' || m.type === 'attributes')) {
          changes.dom = true;
          window._dynamicChangeDetected = true;
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      // Watch for React updates
      const reactRoot = document.querySelector('[data-reactroot], [data-react-helmet], #root, #app');
      if (reactRoot) {
        observer.observe(reactRoot, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeOldValue: true,
          characterData: true 
        });
        changes.react = true;
      }

      // Watch for Vue updates
      const vueRoot = document.querySelector('[data-v-app], #app, #__nuxt, #__next');
      if (vueRoot) {
        observer.observe(vueRoot, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeOldValue: true,
          characterData: true 
        });
        changes.vue = true;
      }

      // Watch for Angular updates
      const ngRoot = document.querySelector('[ng-version]');
      if (ngRoot) {
        observer.observe(ngRoot, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeOldValue: true,
          characterData: true 
        });
        changes.angular = true;
      }

      // Watch for history/routing changes
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function(...args) {
        changes.history = true;
        window._dynamicChangeDetected = true;
        return originalPushState.apply(this, args);
      };

      window.history.replaceState = function(...args) {
        changes.history = true;
        window._dynamicChangeDetected = true;
        return originalReplaceState.apply(this, args);
      };

      // Watch for hash changes
      window.addEventListener('hashchange', () => {
        changes.history = true;
        window._dynamicChangeDetected = true;
      });

      // Watch for AJAX/Fetch state changes
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        window._dynamicChangeDetected = true;
        return originalFetch.apply(this, args);
      };

      const originalXHR = window.XMLHttpRequest.prototype.send;
      window.XMLHttpRequest.prototype.send = function(...args) {
        window._dynamicChangeDetected = true;
        return originalXHR.apply(this, args);
      };

      setTimeout(() => {
        observer.disconnect();
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
        window.fetch = originalFetch;
        window.XMLHttpRequest.prototype.send = originalXHR;
        window._frameworksDetected = changes;
        resolve();
      }, timeoutMs);
    });
  }, timeout);
  
  const result = await page.evaluate(() => {
    const changed = window._dynamicChangeDetected === true;
    const frameworks = window._frameworksDetected || {
      dom: false,
      react: false,
      vue: false,
      angular: false,
      history: false
    };
    delete window._dynamicChangeDetected;
    delete window._frameworksDetected;
    return { changed, frameworks };
  });

  return result.changed;
}

/**
 * Waits for framework-specific loading states to complete
 * Handles:
 * - React loading states
 * - Vue loading indicators
 * - Angular busy states
 * - Generic loading indicators
 */
async function waitForFrameworkLoad(page: Page, options: InteractionOptions): Promise<void> {
  const timeout = options.frameworkTimeout || 2000;
  
  await Promise.race([
    // Wait for framework readiness
    page.waitForFunction(() => {
      // Check document readiness
      if (document.readyState !== 'complete') return false;
      
      // Check React
      const reactRoot = document.querySelector('[data-reactroot], [data-react-helmet], #root, #app');
      if (reactRoot?.hasAttribute('aria-busy')) return false;
      
      // Check Vue
      const app = document.querySelector('#app');
      const vueApp = app && 'vue' in app ? (app as any).vue : null;
      if (document.querySelector('[data-v-app]')?.hasAttribute('aria-busy') || vueApp?.$root?.$loading) return false;
      
      // Check Angular
      if (document.querySelector('[ng-version]')?.hasAttribute('aria-busy')) return false;
      
      // Check common loading indicators
      const loadingIndicators = document.querySelectorAll(
        '.loading, .spinner, .loader, [aria-busy="true"], [aria-loading="true"]'
      );
      if (loadingIndicators.length > 0) return false;
      
      // Check for any visible loading states
      const computedStates = Array.from(document.querySelectorAll('*')).some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               (el.textContent?.toLowerCase().includes('loading') || 
                style.backgroundImage?.includes('spinner') ||
                el.className.toLowerCase().includes('loading'));
      });
      
      return !computedStates;
    }, { timeout }),
    
    // Fallback timeout
    page.waitForTimeout(timeout)
  ]);
}

/**
 * Monitors and collects AJAX requests made after an interaction
 * Tracks:
 * - Request timing
 * - Response content
 * - Network idle state
 */
async function waitForAjaxRequests(page: Page, options: InteractionOptions): Promise<AjaxResponse[]> {
  const responses: AjaxResponse[] = [];
  const pendingRequests = new Map<Request, number>();
  let isNetworkIdle = true;
  let lastRequestTime = Date.now();
  const networkIdleTime = options.networkIdleTime || 300;
  
  page.on('request', request => {
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      pendingRequests.set(request, Date.now());
      isNetworkIdle = false;
      lastRequestTime = Date.now();
      console.log(`AJAX Request Started: ${request.url()}`);
    }
  });

  page.on('response', async response => {
    const request = response.request();
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      const startTime = pendingRequests.get(request) || Date.now();
      const endTime = Date.now();
      
      try {
        const content = await response.text().catch(() => undefined);
        responses.push({
          url: response.url(),
          status: response.status(),
          content,
          timing: {
            started: startTime,
            completed: endTime,
            duration: endTime - startTime
          }
        });
      } catch (e) {
        responses.push({
          url: response.url(),
          status: response.status(),
          timing: {
            started: startTime,
            completed: endTime,
            duration: endTime - startTime
          }
        });
      }
      pendingRequests.delete(request);
      if (pendingRequests.size === 0) {
        isNetworkIdle = true;
      }
    }
  });

  const waitStart = Date.now();
  while (Date.now() - waitStart < options.timeout) {
    if (isNetworkIdle && Date.now() - lastRequestTime > networkIdleTime) {
      break;
    }
    if (responses.length > 0 && Date.now() - lastRequestTime > networkIdleTime * 1.5) {
      break;
    }
    await page.waitForTimeout(50);
  }

  return responses;
}

/**
 * Attempts to handle elements that might be intercepting clicks
 * Common in fixed navigation bars or overlays
 */
async function handleInterceptingElement(page: Page, element: ElementHandle): Promise<void> {
  // Try to remove or handle the intercepting element
  await page.evaluate(() => {
    const interceptingElement = document.querySelector('.nav-area .container-fluid');
    if (interceptingElement) {
      // Try multiple approaches
      // 1. Remove pointer-events
      (interceptingElement as HTMLElement).style.pointerEvents = 'none';
      // 2. Set lower z-index
      (interceptingElement as HTMLElement).style.zIndex = '-1';
    }
  });
}

/**
 * Implements multiple strategies for clicking elements
 * Includes:
 * - Direct element click
 * - JavaScript click
 * - Mouse position click
 */
async function smartClick(page: Page, element: ElementHandle, options: InteractionOptions, maxAttempts = 3): Promise<boolean> {
  const retryDelay = options.retryDelay || 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        await handleInterceptingElement(page, element);
      }

      const strategies = [
        async () => await element.click({ timeout: 2000 }),
        async () => await page.evaluate(el => (el as HTMLElement).click(), element),
        async () => {
          const box = await element.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          }
        }
      ];

      for (const strategy of strategies) {
        try {
          await strategy();
          return true;
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await page.waitForTimeout(retryDelay);
    }
  }
  return false;
}

/**
 * Core function for interacting with a single element
 * Handles:
 * - Element visibility checks
 * - Click attempts
 * - Navigation monitoring
 * - AJAX response collection
 */
async function interactWithElement(
  page: Page,
  element: ClickableElement,
  options: InteractionOptions
): Promise<InteractionResult> {
  try {
    console.log(`\nAttempting to interact with: ${element.type} "${element.text}"`);
    
    // Pre-check if element has a href that would navigate out of scope
    if (element.href) {
      // Handle JavaScript URLs differently
      if (element.href.startsWith('javascript:')) {
        const jsFunction = element.href.substring(11);
        const functionKey = `${jsFunction}|${element.text}`;
        
        if (processedJavaScriptFunctions.has(functionKey)) {
          return {
            element,
            success: false,
            skippedDueToScope: true,
            error: 'JavaScript function already called'
          };
        }
        processedJavaScriptFunctions.add(functionKey);
      } else {
        let normalizedHref = element.href;
        let urlWithoutParams = normalizedHref;
        let queryParams = '';
        
        try {
          const url = new URL(element.href);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            normalizedHref = url.href;
            urlWithoutParams = url.origin + url.pathname;
            queryParams = url.search;
          }
        } catch (e) {
          console.error(`Failed to normalize URL: ${e}`);
        }

        // Don't skip AJAX URLs or URLs with query parameters
        if (!normalizedHref.includes('AJAX') && 
            !queryParams && 
            !shouldProcessUrl(normalizedHref, options.allowedDomains)) {
          console.log(`Skipping out-of-scope link: ${normalizedHref}`);
          return {
            element,
            success: false,
            skippedDueToScope: true,
            error: 'URL out of allowed domains'
          };
        }
        
        // Only skip if the exact URL (including query params) has been visited
        if (!normalizedHref.includes('AJAX') && 
            !element.href.includes('#')) {
          const hasBeenVisited = options.urlQueue.hasBeenVisited(normalizedHref);
          // If URL has query params, treat it as a new URL even if base URL was visited
          if (hasBeenVisited && !queryParams) {
            return {
              element,
              success: false,
              skippedDueToScope: true,
              error: 'URL already visited'
            };
          }
        }
      }
    }

    let elementHandle: ElementHandle | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await waitForFrameworkLoad(page, options);
      elementHandle = await page.$(element.selector);
      if (elementHandle) break;
      
      const alternativeSelectors = [
        `[data-testid="${element.text}"]`,
        `[data-v-*="${element.text}"]`,
        `[ng-*="${element.text}"]`,
        `:text-matches("${element.text}", "i")`,
        `[aria-label="${element.text}"]`,
        `[title="${element.text}"]`
      ];

      for (const selector of alternativeSelectors) {
        elementHandle = await page.$(selector).catch(() => null);
        if (elementHandle) break;
      }

      if (elementHandle) break;
      await page.waitForTimeout(100);
    }

    if (!elementHandle) {
      return {
        element,
        success: false,
        error: 'Element not found'
      };
    }

    const isVisible = await elementHandle.isVisible().catch(() => false);
    if (!isVisible) {
      return {
        element,
        success: false,
        error: 'Element not visible'
      };
    }

    // Set up AJAX response listener before clicking
    let ajaxResponses: AjaxResponse[] = [];
    let ajaxCompleted = false;
    const responsePromise = new Promise<void>(resolve => {
      let responseTimeout: NodeJS.Timeout;
      let hasReceivedResponse = false;
      
      const onResponse = async (response: Response) => {
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
          hasReceivedResponse = true;
          try {
            const content = await response.text().catch(() => undefined);
            ajaxResponses.push({
              url: response.url(),
              status: response.status(),
              content,
              timing: {
                started: Date.now(),
                completed: Date.now(),
                duration: 0
              }
            });
            
            // Reset timeout each time we get a response
            clearTimeout(responseTimeout);
            responseTimeout = setTimeout(() => {
              ajaxCompleted = true;
              resolve();
            }, options.networkIdleTime || 300);
          } catch (e) {
            console.error('Error processing response:', e);
          }
        }
      };
      
      page.on('response', onResponse);
      
      // Set initial timeout - shorter if we haven't received any response
      responseTimeout = setTimeout(() => {
        if (!hasReceivedResponse) {
          console.log('No AJAX responses received, continuing...');
        }
        ajaxCompleted = true;
        resolve();
      }, hasReceivedResponse ? (options.networkIdleTime || 300) : 100);
      
      // Cleanup function
      setTimeout(() => {
        page.removeListener('response', onResponse);
        ajaxCompleted = true;
        resolve();
      }, options.timeout);
    });

    const clickSuccess = await smartClick(page, elementHandle, options);
    if (!clickSuccess) {
      return {
        element,
        success: false,
        error: 'Failed to click element'
      };
    }

    // Wait for AJAX responses and dynamic changes
    await Promise.all([
      responsePromise,
      waitForDynamicChanges(page, 1000),
      page.waitForLoadState('networkidle', { timeout: options.networkIdleTime || 300 }).catch(() => null),
      page.waitForFunction(() => !document.body.hasAttribute('aria-busy') && 
        !document.querySelector('[aria-busy="true"]'), 
        { timeout: options.networkIdleTime || 300 }
      ).catch(() => null)
    ]);

    // Find new elements after AJAX content is loaded
    const newElements = await findClickableElements(page);
    console.log(`Found ${newElements.length} elements after interaction`);

    const newUrl = page.url();
    const causedNavigation = newUrl !== options.startUrl;

    // Always process new elements if we found them after an AJAX request
    if (newElements.length > 0 && (ajaxResponses.length > 0 || !causedNavigation)) {
      return {
        element,
        success: true,
        causedNavigation: false,
        ajaxResponses: ajaxResponses.length > 0 ? ajaxResponses : undefined,
        dynamicChangesDetected: true,
        newElementsFound: newElements
      };
    }

    // Handle navigation only if we haven't found AJAX content
    if (causedNavigation && !newUrl.includes('#')) {
      const skippedDueToScope = !isUrlAllowed(newUrl, options.allowedDomains);
      
      if (!skippedDueToScope && !options.urlQueue.hasBeenVisited(newUrl)) {
        options.urlQueue.add(newUrl, options.urlQueue.getCurrentDepth(options.startUrl) + 1);
        console.log(`Processing new page at ${newUrl}`);
        
        const { interactWithForms } = await import('./formHandler.js');
        const formResults = await interactWithForms(page);
        if (formResults.length > 0) {
          console.log(`Processed ${formResults.length} forms on new page`);
        }
        
        const normalizedUrl = options.urlQueue.normalizeUrl(newUrl);
        (options.urlQueue as any).visited.add(normalizedUrl);
      }
      
      await page.goto(options.startUrl, { 
        timeout: options.timeout / 2,
        waitUntil: 'networkidle'
      }).catch(() => null);
      
      return {
        element,
        success: true,
        causedNavigation,
        newUrl,
        skippedDueToScope,
        returnedToPreviousPage: page.url() === options.startUrl,
        ajaxResponses: ajaxResponses.length > 0 ? ajaxResponses : undefined,
        dynamicChangesDetected: true
      };
    }

    return {
      element,
      success: true,
      causedNavigation: false,
      ajaxResponses: ajaxResponses.length > 0 ? ajaxResponses : undefined,
      dynamicChangesDetected: true,
      newElementsFound: newElements.length > 0 ? newElements : undefined
    };
  } catch (error: unknown) {
    console.log('Error during interaction:', error instanceof Error ? error.message : String(error));
    return {
      element,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main export for processing multiple elements on a page
 * Features:
 * - Batch processing
 * - New element discovery
 * - Interaction tracking
 * - Result collection
 */
export async function interactWithElements(
  page: Page,
  elements: ClickableElement[],
  options: InteractionOptions
): Promise<InteractionResult[]> {
  const results: InteractionResult[] = [];
  const processedElements = new Set<string>();
  const elementsToProcess = [...elements];
  let previousElements = new Set(elements.map(e => createElementIdentifier(e)));

  while (elementsToProcess.length > 0) {
    const element = elementsToProcess.shift()!;
    const elementKey = createElementIdentifier(element);

    if (processedElements.has(elementKey)) {
      console.log(`Skipping already processed element: ${element.text}`);
      continue;
    }
    processedElements.add(elementKey);

    const result = await interactWithElement(page, element, options);
    results.push(result);

    if (result.success && result.newElementsFound && result.newElementsFound.length > 0) {
      // Filter out elements we've seen before
      const currentElements = new Set(result.newElementsFound.map(e => createElementIdentifier(e)));
      const trulyNewElements = result.newElementsFound.filter(e => {
        const key = createElementIdentifier(e);
        return !previousElements.has(key) && !processedElements.has(key);
      });

      if (trulyNewElements.length > 0) {
        console.log(`Adding ${trulyNewElements.length} truly new elements to process immediately`);
        elementsToProcess.unshift(...trulyNewElements);
        // Update our record of seen elements
        trulyNewElements.forEach(e => previousElements.add(createElementIdentifier(e)));
      }
    }
  }

  const stats = interactionTracker.getStats();
  console.log('\nInteraction Stats:', stats);

  return results;
}

function createElementIdentifier(element: ClickableElement): string {
  // Create a unique identifier based on element properties
  const parts = [
    element.type,                 // Element type (button, link, etc)
    element.text,                 // Visible text
    element.selector,            // DOM selector
    element.interactiveReason?.join(',') || '' // Why it's interactive
  ].filter(Boolean);
  
  return parts.join('|');
} 