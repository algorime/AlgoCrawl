import { chromium } from 'playwright';
import type { CrawlerConfig } from './types/config.js';
import { analyzePage } from './pageAnalyzer.js';
import { findClickableElements } from './interactions/elementFinder.js';
import { interactWithElements } from './interactions/elementInteractor.js';
import { interactWithForms } from './interactions/formHandler.js';
import { UrlQueue } from './utils/urlQueue.js';

export async function crawlPage(config: CrawlerConfig): Promise<void> {
  const browser = await chromium.launch({
    headless: config.headless,
    proxy: config.proxy
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: config.proxy?.ignoreHTTPSErrors ?? false
  });

  const urlQueue = new UrlQueue(
    config.maxDepth,
    config.maxPagesPerDomain,
    config.allowedDomains,
    config.ignoreQueryParams,
    config.ignoreHashFragments
  );

  urlQueue.add(config.startUrl);
  
  try {
    while (true) {
      const currentUrl = urlQueue.next();
      if (!currentUrl) break;

      const currentDepth = urlQueue.getCurrentDepth(currentUrl);
      console.log(`\nProcessing URL (depth ${currentDepth}): ${currentUrl}`);

      const page = await context.newPage();
      try {
        await page.goto(currentUrl, {
          timeout: config.timeout,
          waitUntil: 'networkidle'
        });

        console.log(`Page title: ${await page.title()}`);
        
        // Analyze page and extract links
        const analysis = await analyzePage(page);
        console.log('\nPage Analysis:');
        console.log('Found links:', analysis.links.length);
        console.log('Found forms:', analysis.forms.length);

        // Add new URLs to the queue
        for (const link of analysis.links) {
          // Get the actual URL from the href to preserve case
          let actualUrl = link;
          try {
            const url = new URL(link);
            // Only modify if it's our target domain to preserve case
            if (config.allowedDomains.includes(url.hostname)) {
              actualUrl = link;
            }
          } catch (e) {
            console.error(`Error parsing URL: ${e}`);
          }
          
          urlQueue.add(actualUrl, currentDepth + 1);
        }
        
        // Find and interact with clickable elements
        const clickableElements = await findClickableElements(page);
        console.log('Found clickable elements:', clickableElements.length);
        
        // Handle forms if configured
        if (config.interactWithForms) {
          console.log('\nStarting Form Interactions...');
          const formResults = await interactWithForms(page);
          console.log('Form Interaction Results:', formResults.length);
        }
        
        // Interact with elements if configured
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
          
          // Add any new URLs discovered through interactions
          for (const result of interactionResults) {
            if (result.causedNavigation && result.newUrl) {
              urlQueue.add(result.newUrl, currentDepth + 1);
            }
          }
        }

        if (config.saveScreenshots) {
          const screenshotPath = `${config.outputDir}/${new URL(currentUrl).pathname.replace(/\//g, '_')}.png`;
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });
        }

      } catch (error) {
        console.error(`Error processing ${currentUrl}:`, error);
      } finally {
        await page.close();
      }

      // Respect rate limiting
      if (config.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.requestDelay));
      }
    }

    console.log('\nCrawling completed!');
    console.log(`Total pages visited: ${urlQueue.getVisitedCount()}`);
    
  } catch (error) {
    console.error('Fatal error during crawl:', error);
  } finally {
    await browser.close();
  }
} 