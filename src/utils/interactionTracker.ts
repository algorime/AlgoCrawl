export class InteractionTracker {
  private interactedForms: Set<string> = new Set();
  private interactedElements: Set<string> = new Set();
  private visitedUrls: Set<string> = new Set();

  constructor() {}

  // Form tracking
  public addInteractedForm(formIdentifier: string, url: string): void {
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    this.interactedForms.add(uniqueId);
    this.addVisitedUrl(url);
  }

  public hasFormBeenInteracted(formIdentifier: string, url: string): boolean {
    // Check if we've interacted with this exact form
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    if (this.interactedForms.has(uniqueId)) return true;

    // Check if we've interacted with this form on any page
    const formWithoutUrl = formIdentifier.replace(/[<>]/g, '');
    return Array.from(this.interactedForms).some(id => id.includes(formWithoutUrl));
  }

  private createUniqueFormId(formIdentifier: string, url: string): string {
    return `${url}#${formIdentifier}`;
  }

  // Element tracking
  public addInteractedElement(elementIdentifier: string): void {
    this.interactedElements.add(elementIdentifier);
  }

  public hasElementBeenInteracted(elementIdentifier: string): boolean {
    return this.interactedElements.has(elementIdentifier);
  }

  // URL tracking
  public addVisitedUrl(url: string): void {
    this.visitedUrls.add(this.normalizeUrl(url));
  }

  public hasUrlBeenVisited(url: string): boolean {
    return this.visitedUrls.has(this.normalizeUrl(url));
  }

  private normalizeUrl(url: string): string {
    // Remove query parameters and hash
    try {
      const parsedUrl = new URL(url);
      parsedUrl.search = '';
      parsedUrl.hash = '';
      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  // Stats
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