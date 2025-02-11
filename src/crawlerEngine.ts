/* 
  File: crawlerEngine.ts
  Summary: This module implements the main crawl engine for the web crawler.
  It launches a Playwright browser, creates a context, and manages a queue of URLs (using UrlQueue)
  for progressive crawling. The function processes each URL by navigating to it, analyzing the page
  for new links and forms, interacting with clickable elements, handling form submissions, capturing
  screenshots, and enforcing rate limits between requests.
*/

import { chromium } from 'playwright';
import type { CrawlerConfig } from './types/config.js';
import { analyzePage } from './pageAnalyzer.js';
import { findClickableElements } from './interactions/elementFinder.js';
import { interactWithElements } from './interactions/elementInteractor.js';
import { interactWithForms } from './interactions/formHandler.js';
import { UrlQueue } from './utils/urlQueue.js';

export async function crawlPage(config: CrawlerConfig): Promise<void> {
  // Launch the browser using Playwright with specified headless mode and proxy settings.
  const browser = await chromium.launch({
    headless: config.headless,
    proxy: config.proxy
  });
  
  // Create a browser context with standard viewport and HTTPS error configuration.
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: config.proxy?.ignoreHTTPSErrors ?? false
  });

  // Initialize the URL queue with crawl restrictions and normalization parameters.
  const urlQueue = new UrlQueue(
    config.maxDepth,
    config.maxPagesPerDomain,
    config.allowedDomains,
    config.ignoreQueryParams,
    config.ignoreHashFragments
  );

  // Seed the URL queue with the starting URL from the configuration.
  urlQueue.add(config.startUrl);
  
  try {
    // Process URLs until the queue is empty.
    while (true) {
      // Retrieve the next URL to process; exit the loop if none are available.
      const currentUrl = urlQueue.next();
      if (!currentUrl) break;

      // Determine the current crawl depth for proper depth tracking.
      const currentDepth = urlQueue.getCurrentDepth(currentUrl);
      console.log(`\nProcessing URL (depth ${currentDepth}): ${currentUrl}`);

      // Open a new page within the browser context.
      const page = await context.newPage();
      try {
        // Navigate to the current URL with specified timeout and network idle waiting.
        await page.goto(currentUrl, {
          timeout: config.timeout,
          waitUntil: 'networkidle'
        });

        console.log(`Page title: ${await page.title()}`);
        
        // Analyze the page to extract links and form elements.
        const analysis = await analyzePage(page);
        console.log('\nPage Analysis:');
        console.log('Found links:', analysis.links.length);
        console.log('Found forms:', analysis.forms.length);

        // Enqueue each link discovered in the page analysis.
        for (const link of analysis.links) {
          // Preserve original URL casing if within allowed domains.
          let actualUrl = link;
          try {
            const url = new URL(link);
            if (config.allowedDomains.includes(url.hostname)) {
              actualUrl = link;
            }
          } catch (e) {
            console.error(`Error parsing URL: ${e}`);
          }
          
          // Add the link to the URL queue with an incremented crawl depth.
          urlQueue.add(actualUrl, currentDepth + 1);
        }
        
        // Identify clickable elements on the page for potential UI interactions.
        const clickableElements = await findClickableElements(page);
        console.log('Found clickable elements:', clickableElements.length);
        
        // Perform form interactions if enabled in the configuration.
        if (config.interactWithForms) {
          console.log('\nStarting Form Interactions...');
          const formResults = await interactWithForms(page);
          console.log('Form Interaction Results:', formResults.length);
        }
        
        // Perform other element interactions if configured.
        if (config.interactWithElements) {
          console.log('\nStarting Element Interactions...');
          const interactionResults = await interactWithElements(page, clickableElements, {
            timeout: config.timeout,
            allowedDomains: config.allowedDomains,
            startUrl: currentUrl,
            urlQueue: urlQueue,
            frameworkTimeout: config.frameworkTimeout,
            retryDelay: config.retryDelay,
            networkIdleTime: config.networkIdleTime
          });
          
          // Enqueue any new URLs discovered as a result of interacting with elements.
          for (const result of interactionResults) {
            if (result.causedNavigation && result.newUrl) {
              urlQueue.add(result.newUrl, currentDepth + 1);
            }
          }
        }

        // Capture a full-page screenshot if configured to do so.
        if (config.saveScreenshots) {
          const screenshotPath = `${config.outputDir}/${new URL(currentUrl).pathname.replace(/\//g, '_')}.png`;
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });
        }

      } catch (error) {
        // Log errors encountered while processing the current URL.
        console.error(`Error processing ${currentUrl}:`, error);
      } finally {
        // Ensure the page is closed to free resources regardless of processing outcome.
        await page.close();
      }

      // Implement rate limiting: wait for the configured delay before processing the next URL.
      if (config.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.requestDelay));
      }
    }

    console.log('\nCrawling completed!');
    console.log(`Total pages visited: ${urlQueue.getVisitedCount()}`);
    
  } catch (error) {
    // Log any fatal errors that occur during the crawling process.
    console.error('Fatal error during crawl:', error);
  } finally {
    // Close the browser to clean up resources after crawling finishes.
    await browser.close();
  }
}