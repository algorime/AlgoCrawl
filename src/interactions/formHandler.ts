import { Page, ElementHandle } from 'playwright';
import { InteractionTracker } from '../utils/interactionTracker.js';

interface FormField {
  type: string;
  name: string;
  required: boolean;
  placeholder: string;
}

interface FormInteractionResult {
  formId: string;
  success: boolean;
  error?: string;
  fields: string[];
  skipped?: boolean;
  skippedReason?: string;
  debug?: {
    formDetails?: any;
    formIndex?: number;
    formCount?: number;
    formHtml?: string;
    fieldsFound?: number;
    submitButtonFound?: boolean;
    submitButtonType?: string;
  };
}

// Create a singleton instance of InteractionTracker
const interactionTracker = new InteractionTracker();

export async function findAndAnalyzeForms(page: Page): Promise<FormField[][]> {
  return await page.$$eval('form', (forms) => {
    return forms.map(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      return Array.from(inputs).map(input => ({
        type: input.getAttribute('type') || input.tagName.toLowerCase(),
        name: input.getAttribute('name') || '',
        required: input.hasAttribute('required'),
        placeholder: input.getAttribute('placeholder') || ''
      }));
    });
  });
}

export async function interactWithForms(page: Page): Promise<FormInteractionResult[]> {
  const results: FormInteractionResult[] = [];
  const forms = await page.$$('form');
  const currentUrl = page.url();

  console.log(`\nFound ${forms.length} forms on page ${currentUrl}`);

  // Skip if URL has been fully processed before
  if (interactionTracker.hasUrlBeenVisited(currentUrl)) {
    console.log(`Skipping already processed URL: ${currentUrl}`);
    return [{
      formId: 'page_forms',
      success: true,
      skipped: true,
      skippedReason: 'URL already processed',
      fields: []
    }];
  }

  // Process forms in parallel with a maximum of 3 concurrent form submissions
  const batchSize = 3;
  for (let i = 0; i < forms.length; i += batchSize) {
    const batch = forms.slice(i, i + batchSize);
    console.log(`\nProcessing batch of forms (${i + 1}-${Math.min(i + batchSize, forms.length)} of ${forms.length})`);
    
    const promises = batch.map(async (form, batchIndex) => {
      const formIndex = i + batchIndex;
      console.log(`\nProcessing form ${formIndex + 1} of ${forms.length}`);
      
      try {
        // Get form details before any interaction
        const formDetails = await form.evaluate(el => ({
          id: el.getAttribute('id') || '',
          name: el.getAttribute('name') || '',
          action: el.getAttribute('action') || '',
          method: el.getAttribute('method') || 'get',
          html: el.outerHTML,
          submitButton: el.querySelector('input[type="submit"], button[type="submit"]')?.outerHTML || 'none'
        }));

        console.log('Form details:', {
          id: formDetails.id,
          name: formDetails.name,
          action: formDetails.action,
          method: formDetails.method,
          hasSubmitButton: formDetails.submitButton !== 'none'
        });

        const formId = formDetails.id || formDetails.name || `<unnamed_form_${formDetails.method}_${formDetails.action}>`;

        // Skip if this form has been interacted with before
        if (interactionTracker.hasFormBeenInteracted(formId, currentUrl)) {
          console.log(`Skipping already processed form: ${formId}`);
          results.push({
            formId,
            success: true,
            skipped: true,
            skippedReason: 'Form already processed',
            fields: [],
            debug: {
              formDetails,
              formIndex: formIndex + 1,
              formCount: forms.length
            }
          });
          return;
        }

        // Create a new page for form submission to avoid navigation issues
        const formPage = await page.context().newPage();
        try {
          console.log(`Opening new page for form ${formId}`);
          await formPage.goto(currentUrl, { waitUntil: 'networkidle' });
          
          // Find the same form in the new page
          const formSelector = formDetails.id ? `form#${formDetails.id}` :
                             formDetails.name ? `form[name="${formDetails.name}"]` :
                             `form[action="${formDetails.action}"]`;
          
          console.log(`Looking for form with selector: ${formSelector}`);
          
          const newPageForm = await formPage.$(formSelector) || 
                            await formPage.$(`form[method="${formDetails.method}"]`) ||
                            (await formPage.$$('form'))[formIndex];

          if (!newPageForm) {
            throw new Error('Could not find corresponding form in new page');
          }

          const fields = await newPageForm.$$('input, textarea, select');
          console.log(`Found ${fields.length} fields in form`);
          
          const fieldNames: string[] = [];

          // Fill form fields with appropriate dummy data
          for (const field of fields) {
            const [type, name, isVisible] = await Promise.all([
              field.evaluate(el => el.getAttribute('type') || el.tagName.toLowerCase()),
              field.evaluate(el => el.getAttribute('name') || ''),
              field.isVisible()
            ]);

            console.log(`Processing field: ${name} (type: ${type}, visible: ${isVisible})`);
            fieldNames.push(name);

            // Skip submit/button type inputs
            if (['submit', 'button', 'image', 'reset'].includes(type)) {
              console.log(`Skipping submit/button field: ${name}`);
              continue;
            }

            try {
              // Handle different field types
              switch (type) {
                case 'hidden':
                  // For hidden fields, use JavaScript to set the value
                  await field.evaluate((el, value) => {
                    (el as HTMLInputElement).value = value;
                  }, 'Test Input');
                  console.log(`Set hidden field ${name} via JavaScript`);
                  break;
                case 'email':
                  if (isVisible) await field.fill('test@example.com');
                  break;
                case 'password':
                  if (isVisible) await field.fill('DummyPassword123!');
                  break;
                case 'tel':
                  if (isVisible) await field.fill('1234567890');
                  break;
                case 'number':
                  if (isVisible) await field.fill('42');
                  break;
                case 'checkbox':
                  if (isVisible) await field.check();
                  break;
                case 'radio':
                  if (isVisible) await field.check();
                  break;
                case 'textarea':
                  // For textareas, try both fill and evaluate methods
                  try {
                    if (isVisible) {
                      await field.fill('Test Message Content');
                    } else {
                      await field.evaluate((el) => {
                        (el as HTMLTextAreaElement).value = 'Test Message Content';
                      });
                    }
                    console.log(`Set textarea ${name} content`);
                  } catch (e) {
                    console.log(`Failed to set textarea ${name} content:`, e);
                  }
                  break;
                default:
                  if (isVisible) {
                    await field.fill('Test Input');
                  } else {
                    // For non-visible fields, try setting value via JavaScript
                    await field.evaluate((el) => {
                      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        el.value = 'Test Input';
                      }
                    });
                  }
              }
              console.log(`Successfully handled field ${name}`);
            } catch (fieldError) {
              console.log(`Error handling field ${name}:`, fieldError);
            }
          }

          // Check if form has AJAX submission
          const isAjaxForm = await newPageForm.evaluate(f => {
            const hasPreventDefault = (f as HTMLFormElement).onsubmit?.toString().includes('preventDefault');
            const hasAjaxAttributes = f.hasAttribute('data-remote') || 
                                    f.getAttribute('data-ajax')?.toLowerCase() === 'true';
            return hasPreventDefault || hasAjaxAttributes;
          });

          console.log(`Form ${formId} is ${isAjaxForm ? 'an AJAX' : 'a traditional'} form`);

          // Find submit button details
          const submitButtonDetails = await newPageForm.evaluate(() => {
            const submitBtn = document.querySelector('input[type="submit"], button[type="submit"]');
            return submitBtn ? {
              type: submitBtn.tagName.toLowerCase(),
              value: (submitBtn as HTMLInputElement).value || '',
              text: submitBtn.textContent || '',
              exists: true
            } : { exists: false };
          });

          console.log('Submit button details:', submitButtonDetails);

          if (isAjaxForm) {
            console.log('Submitting AJAX form...');
            
            // Setup response listener before submitting
            const responsePromise = formPage.waitForResponse(response => {
              const responseUrl = response.url();
              const matchesCurrentUrl = responseUrl.includes(currentUrl);
              const matchesAction = formDetails.action ? responseUrl.includes(formDetails.action) : false;
              return matchesCurrentUrl || matchesAction;
            }, { timeout: 5000 }).catch(e => console.log('Response wait timeout:', e));

            // Submit form and wait for response
            await Promise.all([
              responsePromise,
              newPageForm.evaluate(f => {
                const submitBtn = f.querySelector('input[type="submit"], button[type="submit"]');
                if (submitBtn) {
                  (submitBtn as HTMLElement).click();
                } else {
                  (f as HTMLFormElement).submit();
                }
              })
            ]);
          } else {
            console.log('Submitting traditional form...');
            
            // For traditional forms, wait for both response and navigation
            await Promise.all([
              formPage.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {
                console.log('Navigation timeout reached');
              }),
              newPageForm.evaluate(f => {
                const submitBtn = f.querySelector('input[type="submit"], button[type="submit"]');
                if (submitBtn) {
                  (submitBtn as HTMLElement).click();
                } else {
                  (f as HTMLFormElement).submit();
                }
              })
            ]);
          }

          // Track this form interaction
          interactionTracker.addInteractedForm(formId, currentUrl);
          console.log(`Successfully processed form ${formId}`);

          results.push({
            formId,
            success: true,
            fields: fieldNames,
            debug: {
              formDetails,
              formIndex: formIndex + 1,
              formCount: forms.length,
              formHtml: formDetails.html,
              fieldsFound: fields.length,
              submitButtonFound: submitButtonDetails.exists,
              submitButtonType: submitButtonDetails.exists ? submitButtonDetails.type : 'none'
            }
          });

        } finally {
          await formPage.close();
          console.log(`Closed form page for ${formId}`);
        }

      } catch (error: unknown) {
        console.error(`Error processing form:`, error);
        results.push({
          formId: await form.evaluate(el => 
            el.getAttribute('id') || el.getAttribute('name') || '<unnamed_form>'
          ).catch(() => '<unnamed_form>'),
          success: false,
          error: error instanceof Error ? error.message : String(error),
          fields: [],
          debug: {
            formIndex: formIndex + 1,
            formCount: forms.length
          }
        });
      }
    });

    // Wait for all forms in the batch to complete
    await Promise.all(promises);
  }

  console.log(`\nCompleted processing all forms. Results:`, 
    results.map(r => ({
      formId: r.formId,
      success: r.success,
      skipped: r.skipped,
      fieldsCount: r.fields.length,
      error: r.error
    }))
  );

  return results;
} 