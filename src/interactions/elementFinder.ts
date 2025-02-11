/**
 * Element Discovery Module
 * Responsible for finding and analyzing interactive elements on web pages.
 * Uses multiple strategies to identify clickable elements including:
 * - Standard HTML elements (links, buttons)
 * - ARIA roles
 * - Custom attributes
 * - CSS properties
 */

import type { Page } from 'playwright';
import { normalizeUrl } from '../utils/urlUtils.js';

export interface ClickableElement {
  selector: string;             // CSS selector to find the element
  type: 'button' | 'link' | 'div' | 'span' | 'other';  // Element type
  text: string;                 // Visible text content
  isVisible: boolean;           // Visibility state
  href?: string;                // URL for links
  isInteractive: boolean;       // Whether element can be interacted with
  interactiveReason?: string[]; // Why element is considered interactive
}

/**
 * Creates a robust selector for an element using multiple strategies:
 * 1. Role-based selectors
 * 2. Text-based selectors
 * 3. Data attribute selectors
 * 4. Tag + attributes combination
 */
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

/**
 * Main function to discover and analyze clickable elements on a page
 * Implements comprehensive detection of interactive elements using:
 * - Standard HTML interactive elements
 * - ARIA roles and attributes
 * - Event handlers
 * - Testing attributes
 */
export async function findClickableElements(page: Page): Promise<ClickableElement[]> {
  // First, find all potentially interactive elements using comprehensive selector
  const elements = await page.$$([
    'a[href]',                    // Links with href
    'button:not([disabled])',     // Enabled buttons
    'input[type="button"]:not([disabled])',  // Button inputs
    'input[type="submit"]:not([disabled])',  // Submit inputs
    '[role="button"]',            // ARIA button role
    '[role="link"]',              // ARIA link role
    '[role="tab"]',               // ARIA tab role
    '[role="menuitem"]',          // ARIA menu items
    '[onclick]',                  // Elements with click handlers
    '[tabindex]',                 // Focusable elements
    '[data-testid]',              // Testing attributes
    '[data-qa]',                  // QA attributes
    '[data-cy]'                   // Cypress attributes
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