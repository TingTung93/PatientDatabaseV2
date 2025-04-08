import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { MINIMAL_VIEWPORTS } from '@storybook/addon-viewport';

const config: TestRunnerConfig = {
  // Hook that is executed before the test runner starts running tests
  async preRender(page) {
    // Ensure viewport is consistent for all tests
    await page.setViewportSize({ width: 1280, height: 720 });
  },
  
  // Hook that is executed before each individual story test
  async preVisit(page) {
    // Add any setup needed before each story test
  },
  
  // Hook that is executed after each individual story test
  async postVisit(page, context) {
    // Test accessibility for every story
    const storyContext = await getStoryContext(page, context);
    
    // Skip accessibility tests if story explicitly disables them
    if (storyContext.parameters['a11y']?.disable) {
      return;
    }
    
    // Run accessibility tests
    await page.evaluate(async () => {
      const { axe } = await import('@axe-core/playwright');
      const results = await axe(document.body);
      
      if (results.violations.length > 0) {
        throw new Error(
          `Accessibility violations found:\n${JSON.stringify(results.violations, null, 2)}`
        );
      }
    });
  },
  
  // Test each story in different viewports
  async postRender(page, context) {
    const storyContext = await getStoryContext(page, context);
    
    // Skip viewport tests if story explicitly disables them
    if (storyContext.parameters['viewport']?.disable) {
      return;
    }
    
    // Test story in different viewports
    for (const [name, viewport] of Object.entries(MINIMAL_VIEWPORTS)) {
      await page.setViewportSize({
        width: viewport.styles?.width?.replace('px', '') as unknown as number,
        height: viewport.styles?.height?.replace('px', '') as unknown as number,
      });
      
      // Take a screenshot for visual regression testing
      await page.screenshot({
        path: `__screenshots__/${context.id}--${name}.png`,
      });
    }
  },
}; 