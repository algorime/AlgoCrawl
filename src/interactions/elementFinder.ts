import type { Page } from 'playwright';
import { normalizeUrl } from '../utils/urlUtils.js';

export interface ClickableElement {
  selector: string;
  type: 'button' | 'link' | 'div' | 'span' | 'other';
  text: string;
  isVisible: boolean;
  href?: string;
  isInteractive: boolean;
  interactiveReason?: string[];
}

function createRobustSelector(element: Element): string {
  // Try role-based selector first
  const role = element.getAttribute('role');
  if (role) {
    const text = element.textContent?.trim();
    if (text) {
      return `[role="${role}"]:has-text("${text}")`;
    }
    return `[role="${role}"]`;
  }

  // Try text-based selector for links and buttons
  const text = element.textContent?.trim();
  if (text && (element instanceof HTMLAnchorElement || element instanceof HTMLButtonElement)) {
    return `:text("${text}")`;
  }

  // Try data attributes if present
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${attr.value}"]`)
    .join('');
  if (dataAttrs) {
    return dataAttrs;
  }

  // Fallback to tag + attributes combination
  const tag = element.tagName.toLowerCase();
  const href = element instanceof HTMLAnchorElement ? element.getAttribute('href') : null;
  const onclick = element.hasAttribute('onclick') ? '[onclick]' : '';
  const id = element.id ? `#${element.id}` : '';
  
  return `${tag}${href ? `[href="${href}"]` : ''}${onclick}${id}`;
}

export async function findClickableElements(page: Page): Promise<ClickableElement[]> {
  // First, find all potentially interactive elements
  const elements = await page.$$([
    'a[href]',
    'button:not([disabled])',
    'input[type="button"]:not([disabled])',
    'input[type="submit"]:not([disabled])',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[tabindex]',
    '[data-testid]', // Common testing attribute
    '[data-qa]',     // Common QA attribute
    '[data-cy]'      // Cypress testing attribute
  ].join(','));

  const clickableElements: ClickableElement[] = [];

  for (const element of elements) {
    // Check if element is visible
    const isVisible = await element.isVisible();
    if (!isVisible) continue;

    // Get element properties
    const properties = await element.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';
      const href = el instanceof HTMLAnchorElement ? el.href : 
                  el.getAttribute('href') || 
                  el.getAttribute('xlink:href') ||
                  undefined;
      const style = window.getComputedStyle(el);
      const role = el.getAttribute('role');
      const hasOnClick = el.hasAttribute('onclick');
      const hasTabIndex = el.hasAttribute('tabindex');
      const cursorStyle = style.cursor;
      
      return {
        tagName,
        text,
        href,
        role,
        hasOnClick,
        hasTabIndex,
        cursorStyle,
        isDisabled: el instanceof HTMLButtonElement ? el.disabled : false
      };
    });

    // Skip disabled buttons
    if (properties.isDisabled) continue;

    // Determine if element is interactive and why
    const interactiveReasons: string[] = [];

    if (properties.href && !properties.href.startsWith('mailto:') && !properties.href.startsWith('tel:')) {
      interactiveReasons.push('valid href');
    }

    if (properties.tagName === 'button') {
      interactiveReasons.push('button');
    }

    if (properties.role && ['button', 'link', 'menuitem', 'tab'].includes(properties.role)) {
      interactiveReasons.push(`aria-role:${properties.role}`);
    }

    if (properties.hasOnClick) {
      interactiveReasons.push('has onclick');
    }

    if (properties.hasTabIndex) {
      interactiveReasons.push('has tabindex');
    }

    if (properties.cursorStyle === 'pointer') {
      interactiveReasons.push('cursor:pointer');
    }

    // Skip if not interactive
    if (interactiveReasons.length === 0) continue;

    // Get a robust selector for this element
    const selector = await element.evaluate(createRobustSelector);

    clickableElements.push({
      selector,
      type: properties.tagName === 'button' ? 'button' :
            properties.tagName === 'a' ? 'link' :
            properties.tagName === 'div' ? 'div' :
            properties.tagName === 'span' ? 'span' : 'other',
      text: properties.text,
      isVisible: true,
      href: properties.href,
      isInteractive: true,
      interactiveReason: interactiveReasons
    });
  }

  return clickableElements;
} 