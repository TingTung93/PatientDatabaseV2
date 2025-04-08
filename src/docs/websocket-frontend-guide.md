# Frontend WebSocket Integration Guide

## Overview

This document provides guidance on using the WebSocket integration components in the frontend of the PatientDatabaseV2 project. These components enable real-time progress tracking for OCR (Optical Character Recognition) processing of patient documents and images.

## Components

The frontend WebSocket integration consists of:

1. **useOcrProgress Hook**: A React hook for tracking OCR processing progress
2. **OcrProgressTracker Component**: A visual component to display OCR processing progress
3. **ActiveTasksList Component**: A component to display a list of all active OCR tasks

## useOcrProgress Hook

The `useOcrProgress` hook provides a simple interface for tracking OCR progress in React components.

### Usage

```jsx
import { useOcrProgress } from '../hooks/useOcrProgress';

function MyComponent({ taskId }) {
  const { 
    connected,      // Boolean indicating connection status
    progress,       // Number (0-100) indicating progress percentage
    status,         // String: 'idle', 'initialized', 'processing', 'completed', 'error'
    message,        // String: Current status message
    result,         // Object: Processing result (when completed)
    error,          // Object: Error information (when failed)
    activeTasks,    // Object: Map of all active tasks
    reconnectAttempts, // Number: Current reconnection attempt count
    subscribeToTask, // Function: Subscribe to a different task
    resetProgress   // Function: Reset progress state
  } = useOcrProgress(taskId);
  
  // Use the progress information in your component
  return (
    <div>
      <p>Status: {status}</p>
      <p>Progress: {progress}%</p>
      <p>Message: {message}</p>
      {error && <p>Error: {error.message}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

### Parameters

- `taskId` (optional): The ID of the OCR task to track. If not provided, the hook will track all tasks but not subscribe to specific task updates.

### Return Values

- `connected`: Boolean indicating if the WebSocket connection is active
- `progress`: Number from 0 to 100 indicating the progress percentage
- `status`: String indicating the current status ('idle', 'initialized', 'processing', 'completed', 'error')
- `message`: String containing the current status message
- `result`: Object containing the processing result (when status is 'completed')
- `error`: Object containing error information (when status is 'error')
- `activeTasks`: Object mapping task IDs to their current status
- `reconnectAttempts`: Number indicating the current reconnection attempt count
- `subscribeToTask`: Function to subscribe to a different task
- `resetProgress`: Function to reset the progress state

### Example

```jsx
import React from 'react';
import { useOcrProgress } from '../hooks/useOcrProgress';

function OcrMonitor({ taskId }) {
  const { connected, progress, status, message, result } = useOcrProgress(taskId);
  
  if (!connected) {
    return <p>Connecting to server...</p>;
  }
  
  if (status === 'idle') {
    return <p>Waiting for processing to start...</p>;
  }
  
  if (status === 'error') {
    return <p>Error: {message}</p>;
  }
  
  if (status === 'completed') {
    return (
      <div>
        <p>Processing completed!</p>
        <h3>Results:</h3>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  }
  
  return (
    <div>
      <p>Processing: {progress}% complete</p>
      <p>{message}</p>
      <progress value={progress} max="100" />
    </div>
  );
}
```

## OcrProgressTracker Component

The `OcrProgressTracker` component provides a visual representation of OCR processing progress.

### Usage

```jsx
import { OcrProgressTracker } from '../components/OcrProgressTracker';

function MyComponent() {
  const handleComplete = (result) => {
    console.log('Processing completed with result:', result);
    // Handle the completed result
  };
  
  return (
    <OcrProgressTracker
      taskId="task-123"
      title="Processing Medical Report"
      onComplete={handleComplete}
    />
  );
}
```

### Props

- `taskId` (required): The ID of the OCR task to track
- `title` (optional): Title to display above the progress tracker (default: "OCR Processing")
- `onComplete` (optional): Callback function called when processing completes, receives the result as parameter

### Example

```jsx
import React, { useState } from 'react';
import { OcrProgressTracker } from '../components/OcrProgressTracker';

function DocumentProcessor({ documentId }) {
  const [result, setResult] = useState(null);
  const [taskId, setTaskId] = useState(null);
  
  const startProcessing = async () => {
    // Call API to start OCR processing
    const response = await fetch(`/api/v1/documents/${documentId}/process`, {
      method: 'POST'
    });
    const data = await response.json();
    setTaskId(data.taskId);
  };
  
  const handleProcessingComplete = (result) => {
    setResult(result);
  };
  
  return (
    <div>
      <h2>Document Processor</h2>
      
      {!taskId && (
        <button onClick={startProcessing}>Start Processing</button>
      )}
      
      {taskId && (
        <OcrProgressTracker
          taskId={taskId}
          title={`Processing Document ${documentId}`}
          onComplete={handleProcessingComplete}
        />
      )}
      
      {result && (
        <div>
          <h3>Processing Results</h3>
          <p>Confidence: {result.confidence}</p>
          <p>Text:</p>
          <pre>{result.text}</pre>
        </div>
      )}
    </div>
  );
}
```

## ActiveTasksList Component

The `ActiveTasksList` component displays a list of all active OCR tasks with their current status.

### Usage

```jsx
import { ActiveTasksList } from '../components/ActiveTasksList';

function MyComponent() {
  const handleTaskSelection = (taskId) => {
    console.log('Selected task:', taskId);
    // Handle task selection
  };
  
  return (
    <ActiveTasksList onSelectTask={handleTaskSelection} />
  );
}
```

### Props

- `onSelectTask` (required): Callback function called when a task is selected, receives the taskId as parameter

### Example

```jsx
import React, { useState } from 'react';
import { ActiveTasksList } from '../components/ActiveTasksList';
import { OcrProgressTracker } from '../components/OcrProgressTracker';

function OcrDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  const handleTaskSelection = (taskId) => {
    setSelectedTaskId(taskId);
  };
  
  return (
    <div>
      <h1>OCR Processing Dashboard</h1>
      
      <div className="dashboard-layout">
        <div className="task-list-container">
          <h2>Active Tasks</h2>
          <ActiveTasksList onSelectTask={handleTaskSelection} />
        </div>
        
        <div className="task-details-container">
          <h2>Task Details</h2>
          {selectedTaskId ? (
            <OcrProgressTracker
              taskId={selectedTaskId}
              title="Selected Task Progress"
            />
          ) : (
            <p>Select a task to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Integration with OCR Service

To use these components with the OCR service:

1. Start OCR processing by calling the appropriate API endpoint
2. Get the task ID from the API response
3. Pass the task ID to the `useOcrProgress` hook or `OcrProgressTracker` component
4. Use the `ActiveTasksList` component to display all active tasks

```jsx
// Example: Starting OCR processing and tracking progress
async function processDocument(documentId) {
  // Call API to start processing
  const response = await fetch(`/api/v1/documents/${documentId}/process`, {
    method: 'POST'
  });
  
  const data = await response.json();
  const { taskId } = data;
  
  // Now you can use the taskId with the WebSocket components
  return taskId;
}
```

## Troubleshooting

### Connection Issues

If the WebSocket connection is not established:

1. Check that the backend server is running
2. Verify that the API_URL environment variable is correctly set
3. Check browser console for WebSocket-related errors
4. Ensure there are no network restrictions blocking WebSocket connections

### Missing Updates

If you're not receiving progress updates:

1. Verify that the correct taskId is being used
2. Check that the task is actually running on the server
3. Ensure you've subscribed to the correct task
4. Check the network tab in browser dev tools for WebSocket messages

## Conclusion

The WebSocket integration components provide a simple and effective way to track OCR processing progress in real-time. By using these components, you can create a responsive and user-friendly interface that keeps users informed about the status of their document processing tasks.
