/**
 * Form Tracking Module
 * Tracks form interactions across pages to prevent duplicate submissions
 * and maintain interaction history.
 */

export class FormTracker {
  // Track forms using unique identifiers combining form ID and URL
  private interactedForms: Set<string> = new Set();
  // Track URLs that have had their forms processed
  private interactedUrls: Set<string> = new Set();

  constructor() {}

  /**
   * Records a form interaction
   * @param formIdentifier - Unique identifier for the form
   * @param url - URL where the form was found
   */
  public addInteractedForm(formIdentifier: string, url: string): void {
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    this.interactedForms.add(uniqueId);
    this.interactedUrls.add(url);
  }

  /**
   * Checks if a form has been previously interacted with
   * @param formIdentifier - Unique identifier for the form
   * @param url - URL where the form was found
   * @returns boolean indicating if form was previously processed
   */
  public hasBeenInteracted(formIdentifier: string, url: string): boolean {
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    return this.interactedForms.has(uniqueId);
  }

  /**
   * Checks if a URL's forms have been processed
   * @param url - URL to check
   * @returns boolean indicating if URL was processed
   */
  public hasUrlBeenInteracted(url: string): boolean {
    return this.interactedUrls.has(url);
  }

  /**
   * Creates a unique identifier for a form
   * @private
   */
  private createUniqueFormId(formIdentifier: string, url: string): string {
    return `${url}#${formIdentifier}`;
  }

  /**
   * Returns the total number of forms interacted with
   */
  public getInteractedFormsCount(): number {
    return this.interactedForms.size;
  }

  /**
   * Returns the total number of URLs processed
   */
  public getInteractedUrlsCount(): number {
    return this.interactedUrls.size;
  }
} 