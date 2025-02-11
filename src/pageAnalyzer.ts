/**
 * Page analysis module that extracts important elements from web pages.
 * Responsible for identifying and collecting links and forms for further processing.
 */

import type { Page } from 'playwright';

/**
 * Analyzes a webpage to extract all links and form elements
 * @param page - Playwright Page object representing the current webpage
 * @returns Object containing arrays of found links and form identifiers
 */
export async function analyzePage(page: Page): Promise<{ links: string[], forms: string[] }> {
  // Extract all hyperlinks on the page using DOM traversal
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(anchor => (anchor as HTMLAnchorElement).href);
  });

  // Extract form identifiers prioritizing id > name > placeholder
  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form'))
      .map(form => {
        return form.getAttribute('id') || 
               form.getAttribute('name') || 
               '<unnamed_form>';
      });
  });

  return { links, forms };
} 