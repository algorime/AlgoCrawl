export class FormTracker {
  private interactedForms: Set<string> = new Set();
  private interactedUrls: Set<string> = new Set();

  constructor() {}

  public addInteractedForm(formIdentifier: string, url: string): void {
    // Create a unique identifier combining form and URL
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    this.interactedForms.add(uniqueId);
    this.interactedUrls.add(url);
  }

  public hasBeenInteracted(formIdentifier: string, url: string): boolean {
    const uniqueId = this.createUniqueFormId(formIdentifier, url);
    return this.interactedForms.has(uniqueId);
  }

  public hasUrlBeenInteracted(url: string): boolean {
    return this.interactedUrls.has(url);
  }

  private createUniqueFormId(formIdentifier: string, url: string): string {
    return `${url}#${formIdentifier}`;
  }

  public getInteractedFormsCount(): number {
    return this.interactedForms.size;
  }

  public getInteractedUrlsCount(): number {
    return this.interactedUrls.size;
  }
} 