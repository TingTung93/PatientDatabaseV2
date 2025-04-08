import { interceptWebSocket } from '../support/websocket';

describe('OCR Visual Regression', () => {
  beforeEach(() => {
    // Reset API mocks and visit the OCR page
    cy.intercept('GET', '/api/ocr/results*', {
      statusCode: 200,
      body: {
        data: [],
        total: 0,
        page: 1,
        limit: 10
      }
    }).as('getResults');

    cy.visit('/ocr');
    cy.wait('@getResults');
  });

  describe('Upload Component States', () => {
    it('should match empty state snapshot', () => {
      cy.get('[data-testid="ocr-upload"]')
        .should('be.visible')
        .matchImageSnapshot('ocr-upload-empty');
    });

    it('should match drag-over state snapshot', () => {
      cy.get('[data-testid="file-input"]')
        .trigger('dragenter')
        .parent()
        .matchImageSnapshot('ocr-upload-dragover');
    });

    it('should match file selected state snapshot', () => {
      cy.get('[data-testid="file-input"]')
        .attachFile('test.jpg');
      
      cy.get('[data-testid="ocr-upload"]')
        .matchImageSnapshot('ocr-upload-file-selected');
    });

    it('should match uploading state snapshot', () => {
      // Setup upload intercept
      cy.intercept('POST', '/api/ocr/upload', (req) => {
        req.reply({
          delay: 2000,
          statusCode: 200,
          body: {
            id: 1,
            status: 'pending'
          }
        });
      }).as('uploadFile');

      // Upload file
      cy.get('[data-testid="file-input"]')
        .attachFile('test.jpg');
      cy.get('[data-testid="upload-button"]')
        .click();

      // Capture uploading state
      cy.get('[data-testid="ocr-upload"]')
        .matchImageSnapshot('ocr-upload-uploading');
    });

    it('should match error state snapshot', () => {
      cy.intercept('POST', '/api/ocr/upload', {
        statusCode: 500,
        body: {
          error: 'Server error'
        }
      }).as('uploadError');

      cy.get('[data-testid="file-input"]')
        .attachFile('test.jpg');
      cy.get('[data-testid="upload-button"]')
        .click();

      cy.get('[data-testid="ocr-upload"]')
        .matchImageSnapshot('ocr-upload-error');
    });
  });

  describe('Results Component States', () => {
    it('should match empty results snapshot', () => {
      cy.get('[data-testid="ocr-results"]')
        .matchImageSnapshot('ocr-results-empty');
    });

    it('should match loaded results snapshot', () => {
      // Setup results
      cy.intercept('GET', '/api/ocr/results*', {
        statusCode: 200,
        body: {
          data: [{
            id: 1,
            file_name: 'test.jpg',
            status: 'completed',
            text: 'Sample OCR text',
            confidence: 0.95
          }],
          total: 1,
          page: 1,
          limit: 10
        }
      }).as('getResults');

      cy.visit('/ocr');
      cy.wait('@getResults');

      cy.get('[data-testid="ocr-results"]')
        .matchImageSnapshot('ocr-results-loaded');
    });

    it('should match processing state snapshot', () => {
      // Setup WebSocket for progress updates
      interceptWebSocket((socket) => {
        socket.send(JSON.stringify({
          type: 'ocr_progress',
          data: {
            id: 1,
            status: 'processing',
            progress: 50
          }
        }));
      });

      cy.get('[data-testid="ocr-results"]')
        .matchImageSnapshot('ocr-results-processing');
    });
  });

  describe('Modal States', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/ocr/results*', {
        statusCode: 200,
        body: {
          data: [{
            id: 1,
            file_name: 'test.jpg',
            status: 'completed',
            text: 'Sample OCR text',
            confidence: 0.95
          }],
          total: 1,
          page: 1,
          limit: 10
        }
      }).as('getResults');

      cy.visit('/ocr');
      cy.wait('@getResults');
    });

    it('should match delete confirmation modal snapshot', () => {
      cy.get('[data-testid="delete-button"]')
        .click();

      cy.get('[data-testid="confirm-modal"]')
        .matchImageSnapshot('ocr-delete-modal');
    });

    it('should match image preview modal snapshot', () => {
      cy.get('[data-testid="preview-button"]')
        .click();

      cy.get('[data-testid="preview-modal"]')
        .matchImageSnapshot('ocr-preview-modal');
    });
  });

  describe('Responsive Design', () => {
    const sizes = ['iphone-6', 'ipad-2', [1024, 768]];

    sizes.forEach((size) => {
      it(`should render correctly on ${size}`, () => {
        if (Array.isArray(size)) {
          cy.viewport(size[0], size[1]);
        } else {
          cy.viewport(size);
        }

        cy.get('[data-testid="ocr-container"]')
          .matchImageSnapshot(`ocr-responsive-${Array.isArray(size) ? size.join('x') : size}`);
      });
    });
  });

  describe('Theme Variations', () => {
    it('should match dark theme snapshot', () => {
      // Assuming theme toggle is available
      cy.get('[data-testid="theme-toggle"]')
        .click();

      cy.get('[data-testid="ocr-container"]')
        .matchImageSnapshot('ocr-dark-theme');
    });
  });
}); 