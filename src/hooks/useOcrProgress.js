// Frontend WebSocket client for OCR progress updates
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Custom hook for tracking OCR processing progress
 * @param {string} taskId - OCR task ID to track (optional)
 * @returns {Object} OCR progress state and control functions
 */
export const useOcrProgress = (taskId = null) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTasks, setActiveTasks] = useState({});
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(API_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setReconnectAttempts(0);
      
      // Subscribe to OCR events if taskId is provided
      if (taskId) {
        socketInstance.emit('subscribe_ocr', taskId);
      }
      
      // Request any missed events
      socketInstance.emit('get_missed_events', localStorage.getItem('lastEventId'));
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`WebSocket reconnection attempt ${attempt}`);
      setReconnectAttempts(attempt);
    });

    socketInstance.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err);
    });

    // Listen for OCR progress updates
    socketInstance.on('ocr_progress', (data) => {
      if (taskId && data.taskId === taskId) {
        setProgress(data.progress);
        setStatus(data.status);
        setMessage(data.message);
        
        // Store last event ID for reconnection
        localStorage.setItem('lastEventId', data.id);
      }
      
      // Update active tasks
      setActiveTasks(prev => ({
        ...prev,
        [data.taskId]: {
          progress: data.progress,
          status: data.status,
          message: data.message,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for OCR completion
    socketInstance.on('ocr_completed', (data) => {
      if (taskId && data.taskId === taskId) {
        setProgress(100);
        setStatus('completed');
        setMessage(data.message || 'Processing completed');
        setResult(data.result);
        
        // Store last event ID for reconnection
        localStorage.setItem('lastEventId', data.id);
      }
      
      // Update active tasks
      setActiveTasks(prev => ({
        ...prev,
        [data.taskId]: {
          progress: 100,
          status: 'completed',
          message: data.message || 'Processing completed',
          result: data.result,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for OCR errors
    socketInstance.on('ocr_error', (data) => {
      if (taskId && data.taskId === taskId) {
        setStatus('error');
        setMessage(data.error?.message || 'An error occurred');
        setError(data.error);
        
        // Store last event ID for reconnection
        localStorage.setItem('lastEventId', data.id);
      }
      
      // Update active tasks
      setActiveTasks(prev => ({
        ...prev,
        [data.taskId]: {
          status: 'error',
          message: data.error?.message || 'An error occurred',
          error: data.error,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for missed events
    socketInstance.on('missed_events', (events) => {
      if (events && events.length > 0) {
        console.log(`Received ${events.length} missed events`);
        
        // Process missed events
        events.forEach(event => {
          if (event.type === 'OCR_PROGRESS') {
            if (taskId && event.taskId === taskId) {
              setProgress(event.data.progress);
              setStatus(event.data.status);
              setMessage(event.data.message);
            }
            
            // Update active tasks
            setActiveTasks(prev => ({
              ...prev,
              [event.taskId]: {
                progress: event.data.progress,
                status: event.data.status,
                message: event.data.message,
                timestamp: event.timestamp
              }
            }));
          } else if (event.type === 'OCR_COMPLETED') {
            if (taskId && event.taskId === taskId) {
              setProgress(100);
              setStatus('completed');
              setMessage(event.data.message || 'Processing completed');
              setResult(event.data.result);
            }
            
            // Update active tasks
            setActiveTasks(prev => ({
              ...prev,
              [event.taskId]: {
                progress: 100,
                status: 'completed',
                message: event.data.message || 'Processing completed',
                result: event.data.result,
                timestamp: event.timestamp
              }
            }));
          } else if (event.type === 'OCR_ERROR') {
            if (taskId && event.taskId === taskId) {
              setStatus('error');
              setMessage(event.data.error?.message || 'An error occurred');
              setError(event.data.error);
            }
            
            // Update active tasks
            setActiveTasks(prev => ({
              ...prev,
              [event.taskId]: {
                status: 'error',
                message: event.data.error?.message || 'An error occurred',
                error: event.data.error,
                timestamp: event.timestamp
              }
            }));
          }
        });
        
        // Store last event ID for future reconnection
        const lastEvent = events[events.length - 1];
        if (lastEvent) {
          localStorage.setItem('lastEventId', lastEvent.id);
        }
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (taskId) {
        socketInstance.emit('unsubscribe_ocr', taskId);
      }
      socketInstance.disconnect();
    };
  }, [taskId]);

  // Function to subscribe to a specific OCR task
  const subscribeToTask = useCallback((newTaskId) => {
    if (socket && connected && newTaskId) {
      socket.emit('unsubscribe_ocr', taskId);
      socket.emit('subscribe_ocr', newTaskId);
    }
  }, [socket, connected, taskId]);

  // Function to reset the progress state
  const resetProgress = useCallback(() => {
    setProgress(0);
    setStatus('idle');
    setMessage('');
    setResult(null);
    setError(null);
  }, []);

  return {
    connected,
    progress,
    status,
    message,
    result,
    error,
    activeTasks,
    reconnectAttempts,
    subscribeToTask,
    resetProgress
  };
};

export default useOcrProgress;
