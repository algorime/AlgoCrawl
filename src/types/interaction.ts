/**
 * Interaction Types Module
 * Defines types and interfaces for handling page interactions.
 * Includes types for clickable elements, AJAX responses, and interaction results.
 */

export interface ClickableElement {
  selector: string;             // CSS selector to find element
  type: 'button' | 'link' | 'div' | 'span' | 'other';  // Element type
  text: string;                 // Visible text content
  isVisible: boolean;           // Visibility state
  href?: string;                // URL for links
  isInteractive: boolean;       // Whether element can be interacted with
  interactiveReason?: string[]; // Why element is considered interactive
}

interface AjaxResponse {
  url: string;                  // Request URL
  status?: number;              // HTTP status code
  content?: string;             // Response content
  timing?: {                    // Request timing information
    started: number;            // Timestamp when request started
    completed: number;          // Timestamp when request completed
    duration: number;           // Total request duration
  };
}

export interface InteractionResult {
  element: ClickableElement;    // Element that was interacted with
  success: boolean;             // Whether interaction was successful
  error?: string;               // Error message if failed
  causedNavigation?: boolean;   // Whether interaction caused page navigation
  newUrl?: string;              // New URL after navigation
  returnedToPreviousPage?: boolean;  // Whether we returned to original page
  skippedDueToScope?: boolean;  // Whether skipped due to domain restrictions
  ajaxResponses?: AjaxResponse[];    // AJAX responses triggered
  dynamicChangesDetected?: boolean;  // Whether DOM changes were detected
  newElementsFound?: ClickableElement[];  // New elements found after interaction
}

declare global {
  interface Window {
    _dynamicChangeDetected?: boolean;  // Flag for dynamic content changes
  }
} 