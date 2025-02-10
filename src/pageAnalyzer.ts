import type { Page } from 'playwright';

export async function analyzePage(page: Page): Promise<{ links: string[], forms: string[] }> {
  // Extract all hyperlinks on the page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(anchor => (anchor as HTMLAnchorElement).href);
  });

  // Extract identifiers for all form elements on the page
  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form'))
      .map(form => {
        // Use id if available, else name, else a placeholder
        return form.getAttribute('id') || form.getAttribute('name') || '<unnamed_form>';
      });
  });

  return { links, forms };
} 