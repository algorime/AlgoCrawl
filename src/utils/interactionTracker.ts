/**
 * Interaction Tracking Module
 * Comprehensive tracking system for all types of page interactions:
 * - Form submissions
 * - Element clicks
 * - URL visits
 * 
 * Prevents duplicate interactions and maintains interaction history.
 */

export class InteractionTracker {
  // Core tracking sets for different interaction types
  private interactedForms: Set<string> = new Set();    // Tracks form submissions
  private interactedElements: Set<string> = new Set(); // Tracks element clicks
  private visitedUrls: Set<string> = new Set();        // Tracks URL visits

  constructor() {}

  // Form tracking methods
  /**
   * Records a form interaction and its associated URL
   * @param formIdentifier - Unique form identifier
   * @param url - URL where form was found
   */
  public addInteractedForm(formIdentifier: string, url: string): void {
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    this.interactedForms.add(uniqueId);
    this.addVisitedUrl(url);
  }

  /**
   * Checks if a form has been previously interacted with
   * Considers both exact matches and form matches across different pages
   */
  public hasFormBeenInteracted(formIdentifier: string, url: string): boolean {
    // Check if we've interacted with this exact form
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    if (this.interactedForms.has(uniqueId)) return true;

    // Check if we've interacted with this form on any page
    const formWithoutUrl = formIdentifier.replace(/[<>]/g, '');
    return Array.from(this.interactedForms).some(id => id.includes(formWithoutUrl));
  }

  /**
   * Creates a unique identifier for a form
   * @private
   */
  private createUniqueFormId(formIdentifier: string, url: string): string {
    return `${url}#${formIdentifier}`;
  }

  // Element tracking methods
  /**
   * Records an element interaction
   */
  public addInteractedElement(elementIdentifier: string): void {
    this.interactedElements.add(elementIdentifier);
  }

  /**
   * Checks if an element has been previously interacted with
   */
  public hasElementBeenInteracted(elementIdentifier: string): boolean {
    return this.interactedElements.has(elementIdentifier);
  }

  // URL tracking methods
  /**
   * Records a URL visit after normalizing the URL
   */
  public addVisitedUrl(url: string): void {
    this.visitedUrls.add(this.normalizeUrl(url));
  }

  /**
   * Checks if a URL has been previously visited
   */
  public hasUrlBeenVisited(url: string): boolean {
    return this.visitedUrls.has(this.normalizeUrl(url));
  }

  /**
   * Normalizes a URL by removing query parameters and hash
   * @private
   */
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.search = '';
      parsedUrl.hash = '';
      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  /**
   * Returns statistics about tracked interactions
   */
  public getStats(): {
    formsCount: number;
    elementsCount: number;
    urlsCount: number;
  } {
    return {
      formsCount: this.interactedForms.size,
      elementsCount: this.interactedElements.size,
      urlsCount: this.visitedUrls.size
    };
  }
} 