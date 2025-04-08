import { interceptWebSocket } from '../support/websocket';

describe('OCR Workflow', () => {
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

  describe('File Upload', () => {
    it('should successfully upload and process a file', () => {
      // Intercept file upload request
      cy.intercept('POST', '/api/ocr/upload', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'pending',
          message: 'Upload successful'
        }
      }).as('uploadFile');

      // Setup WebSocket mock for progress updates
      interceptWebSocket((socket) => {
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'ocr_progress',
            data: {
              id: 1,
              status: 'processing',
              progress: 50
            }
          }));
        }, 1000);

        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'ocr_complete',
            data: {
              id: 1,
              file_name: 'test.jpg',
              status: 'completed',
              text: 'Sample OCR text',
              confidence: 0.95
            }
          }));
        }, 2000);
      });

      // Upload file
      cy.get('[data-testid="file-input"]')
        .attachFile('test.jpg');
      cy.get('[data-testid="upload-button"]')
        .click();

      // Verify upload request
      cy.wait('@uploadFile');

      // Verify progress updates
      cy.get('[data-testid="progress-indicator"]')
        .should('contain', '50%');

      // Verify completion
      cy.get('[data-testid="ocr-result"]')
        .should('contain', 'Sample OCR text');
    });

    it('should handle upload errors gracefully', () => {
      // Intercept file upload with error
      cy.intercept('POST', '/api/ocr/upload', {
        statusCode: 500,
        body: {
          error: 'Server error'
        }
      }).as('uploadError');

      // Upload file
      cy.get('[data-testid="file-input"]')
        .attachFile('test.jpg');
      cy.get('[data-testid="upload-button"]')
        .click();

      // Verify error display
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Server error');

      // Verify retry button
      cy.get('[data-testid="retry-button"]')
        .should('be.visible');
    });
  });

  describe('Result Management', () => {
    beforeEach(() => {
      // Setup initial results
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

    it('should display and manage OCR results', () => {
      // Verify result display
      cy.get('[data-testid="result-item"]')
        .should('have.length', 1)
        .and('contain', 'test.jpg');

      // Test deletion
      cy.intercept('DELETE', '/api/ocr/results/1', {
        statusCode: 200
      }).as('deleteResult');

      cy.get('[data-testid="delete-button"]')
        .click();

      cy.get('[data-testid="confirm-delete"]')
        .click();

      cy.wait('@deleteResult');

      // Verify deletion
      cy.get('[data-testid="result-item"]')
        .should('not.exist');
    });

    it('should handle pagination', () => {
      // Setup paginated results
      cy.intercept('GET', '/api/ocr/results?page=2*', {
        statusCode: 200,
        body: {
          data: [{
            id: 2,
            file_name: 'test2.jpg',
            status: 'completed',
            text: 'More OCR text',
            confidence: 0.92
          }],
          total: 2,
          page: 2,
          limit: 1
        }
      }).as('getPage2');

      // Navigate to next page
      cy.get('[data-testid="next-page"]')
        .click();

      cy.wait('@getPage2');

      // Verify second page content
      cy.get('[data-testid="result-item"]')
        .should('contain', 'test2.jpg');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket disconnection', () => {
      // Simulate WebSocket disconnection
      interceptWebSocket((socket) => {
        setTimeout(() => {
          socket.close();
        }, 1000);
      });

      // Verify disconnection message
      cy.get('[data-testid="connection-status"]')
        .should('contain', 'Disconnected');

      // Verify reconnection attempt
      cy.get('[data-testid="connection-status"]')
        .should('contain', 'Reconnecting');
    });

    it('should update results in real-time', () => {
      // Setup WebSocket for real-time updates
      interceptWebSocket((socket) => {
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'ocr_list_update',
            data: {
              id: 3,
              file_name: 'realtime.jpg',
              status: 'completed',
              text: 'Real-time OCR text',
              confidence: 0.98
            }
          }));
        }, 1000);
      });

      // Verify real-time update
      cy.get('[data-testid="result-item"]')
        .should('contain', 'realtime.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      // Test keyboard navigation
      cy.get('[data-testid="file-input"]')
        .focus()
        .type('{enter}');

      cy.get('[data-testid="upload-button"]')
        .focus()
        .type('{enter}');

      // Verify focus management
      cy.focused()
        .should('have.attr', 'data-testid', 'progress-indicator');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="file-input"]')
        .should('have.attr', 'aria-label');

      cy.get('[data-testid="upload-button"]')
        .should('have.attr', 'aria-label');

      cy.get('[data-testid="result-item"]')
        .should('have.attr', 'role', 'listitem');
    });
  });
}); 