export interface ClickableElement {
  selector: string;
  type: 'button' | 'link' | 'div' | 'span' | 'other';
  text: string;
  isVisible: boolean;
  href?: string;
  isInteractive: boolean;
  interactiveReason?: string[];
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

export interface InteractionResult {
  element: ClickableElement;
  success: boolean;
  error?: string;
  causedNavigation?: boolean;
  newUrl?: string;
  returnedToPreviousPage?: boolean;
  skippedDueToScope?: boolean;
  ajaxResponses?: AjaxResponse[];
  dynamicChangesDetected?: boolean;
  newElementsFound?: ClickableElement[];
}

declare global {
  interface Window {
    _dynamicChangeDetected?: boolean;
  }
} 