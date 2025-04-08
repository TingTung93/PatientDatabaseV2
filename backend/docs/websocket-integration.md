# WebSocket Integration Documentation

## Overview

This document provides comprehensive documentation for the real-time WebSocket integration implemented in the PatientDatabaseV2 project. The implementation enables real-time progress updates for OCR (Optical Character Recognition) processing of patient documents and images.

## Architecture

The WebSocket integration follows a modular architecture with the following components:

### Backend Components

1. **OcrProgressManager**: Manages OCR processing tasks and their progress states
2. **ConnectionManager**: Handles WebSocket client connections and reconnection logic
3. **ErrorRecoveryService**: Provides error recovery mechanisms for WebSocket connections
4. **WebSocketIntegration**: Integrates the WebSocket system with the OCR service
5. **WebSocketServer**: Core server implementation for WebSocket communication

### Frontend Components

1. **useOcrProgress**: React hook for tracking OCR processing progress
2. **OcrProgressTracker**: Component to display OCR processing progress
3. **ActiveTasksList**: Component to display a list of active OCR tasks

## Backend Implementation Details

### OcrProgressManager

The `OcrProgressManager` is responsible for tracking the progress of OCR processing tasks. It maintains a task registry with the following features:

- Task initialization with metadata (patient ID, document type, filename)
- Progress updates with percentage completion
- Step-by-step tracking of processing stages
- Error handling and task failure management
- Task timeout monitoring
- Task completion with results

```javascript
// Example: Initializing a new OCR task
const taskId = OcrProgressManager.initializeTask({
  patientId: '12345',
  documentType: 'caution-card',
  filename: 'patient-record.jpg'
});

// Example: Updating task progress
OcrProgressManager.updateTaskProgress(taskId, {
  progress: 50,
  status: 'processing',
  message: 'Analyzing image content...'
});

// Example: Completing a task
OcrProgressManager.completeTask(taskId, {
  text: 'Extracted text content...',
  confidence: 0.95,
  metadata: { ... }
});
```

### ConnectionManager

The `ConnectionManager` handles WebSocket client connections with the following features:

- Connection registration and tracking
- Client metadata storage
- Disconnection handling
- Automatic reconnection attempts
- Connection status monitoring
- Inactive connection cleanup

```javascript
// Example: Registering a new connection
ConnectionManager.registerConnection(clientId, socket, {
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.1',
  userId: 'user-123'
});

// Example: Handling disconnection
ConnectionManager.handleDisconnection(clientId, 'client_closed');
```

### ErrorRecoveryService

The `ErrorRecoveryService` provides robust error recovery mechanisms:

- Event buffering for potential retries
- Exponential backoff retry logic
- Client state tracking for reconciliation
- Event delivery confirmation
- Missed event recovery

```javascript
// Example: Buffering an event
const eventId = ErrorRecoveryService.bufferEvent(clientId, 'ocr_progress', {
  taskId: 'task-123',
  progress: 75
});

// Example: Handling event failure
ErrorRecoveryService.handleEventFailure(clientId, eventId, new Error('Network error'));

// Example: Reconciling client state
const reconciliation = ErrorRecoveryService.reconcileState(
  clientId,
  'ocr_tasks',
  clientVersion,
  serverState,
  serverVersion
);
```

### WebSocketIntegration

The `WebSocketIntegration` connects the OCR service with the WebSocket notification system:

- Event listener setup for OCR processing events
- WebSocket event emission
- Client state management
- Periodic cleanup tasks

```javascript
// Example: Initializing the WebSocket integration
WebSocketIntegration.initialize(ocrService);

// Example: Getting integration status
const status = WebSocketIntegration.getStatus();
```

## Frontend Implementation Details

### useOcrProgress Hook

The `useOcrProgress` React hook provides a simple interface for tracking OCR progress:

- WebSocket connection management
- Progress state tracking
- Automatic reconnection
- Missed event recovery
- Multiple task subscription

```javascript
// Example: Using the hook in a React component
const { 
  connected,
  progress,
  status,
  message,
  result,
  error
} = useOcrProgress(taskId);

// Example: Subscribing to a different task
subscribeToTask(newTaskId);
```

### OcrProgressTracker Component

The `OcrProgressTracker` component visualizes OCR processing progress:

- Progress bar with percentage
- Status indicators
- Error display
- Completion notification

```jsx
// Example: Using the component in a React component
<OcrProgressTracker
  taskId="task-123"
  title="Processing Medical Report"
  onComplete={handleProcessingComplete}
/>
```

### ActiveTasksList Component

The `ActiveTasksList` component displays all active OCR tasks:

- Real-time updates of task status
- Sorting by status and timestamp
- Task selection for detailed view
- Status indicators and progress bars

```jsx
// Example: Using the component in a React component
<ActiveTasksList onSelectTask={handleTaskSelection} />
```

## Event Flow

The real-time updates follow this event flow:

1. OCR service begins processing a document
2. OCR service emits processing events (start, progress, completion, error)
3. WebSocketIntegration captures these events
4. OcrProgressManager updates task status
5. WebSocketServer broadcasts updates to subscribed clients
6. Frontend components receive updates and update UI

## Error Handling and Recovery

The implementation includes robust error handling:

1. Connection failures trigger automatic reconnection attempts
2. Failed event deliveries are buffered for retry
3. Client reconnection triggers state reconciliation
4. Task timeouts are detected and reported
5. Processing errors are captured and displayed

## Performance Considerations

The implementation is designed with performance in mind:

1. Events are buffered and batched when possible
2. Inactive connections are periodically cleaned up
3. Old completed tasks are purged from memory
4. Clients receive only events they've subscribed to
5. Reconnection uses exponential backoff to prevent server overload

## Security Considerations

Security measures implemented:

1. Client authentication before connection acceptance
2. Input validation for all client messages
3. Rate limiting for connection attempts
4. Timeout for inactive connections
5. Sanitization of all data sent to clients

## Testing

The WebSocket integration includes comprehensive tests:

1. Unit tests for individual components
2. Integration tests for component interaction
3. End-to-end tests for full system functionality
4. Mock implementations for isolated testing

## Usage Examples

### Backend Integration

```javascript
// In server.js
const { WebSocketIntegration } = require('./websocket');
const ocrService = require('./services/OcrService');

// Initialize WebSocket integration with OCR service
WebSocketIntegration.initialize(ocrService);

// OCR service emits events during processing
ocrService.on('processing_started', (data) => {
  // Processing started, data contains patientId, documentType, filename
});

ocrService.on('processing_progress', (data) => {
  // Processing progress update, data contains progress percentage
});

ocrService.on('processing_completed', (data) => {
  // Processing completed, data contains result
});

ocrService.on('processing_error', (data) => {
  // Processing error, data contains error details
});
```

### Frontend Integration

```jsx
// In a React component
import React, { useState } from 'react';
import { OcrProgressTracker, ActiveTasksList } from '../components';
import { useOcrProgress } from '../hooks';

const OcrDashboard = () => {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const { result } = useOcrProgress(selectedTaskId);
  
  const handleTaskSelection = (taskId) => {
    setSelectedTaskId(taskId);
  };
  
  const handleProcessingComplete = (result) => {
    console.log('Processing completed with result:', result);
    // Handle the completed result
  };
  
  return (
    <div>
      <h1>OCR Processing Dashboard</h1>
      
      {selectedTaskId && (
        <OcrProgressTracker
          taskId={selectedTaskId}
          title="Selected Task Progress"
          onComplete={handleProcessingComplete}
        />
      )}
      
      <ActiveTasksList onSelectTask={handleTaskSelection} />
      
      {result && (
        <div>
          <h2>Processing Result</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default OcrDashboard;
```

## Conclusion

The WebSocket integration provides a robust, real-time update system for OCR processing in the PatientDatabaseV2 project. It enables users to monitor the progress of document processing, view active tasks, and receive immediate notifications when processing completes or encounters errors.

The modular architecture ensures maintainability and extensibility, allowing for future enhancements such as additional real-time features or integration with other processing systems.
