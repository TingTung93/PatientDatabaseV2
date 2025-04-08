import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { websocketService } from '../services/websocketService'; // Import the singleton service

// Define the shape of the context data
interface WebSocketContextProps {
  isConnected: boolean;
  sendMessage: (data: any) => void;
  addMessageHandler: (handler: (event: MessageEvent) => void) => void;
  removeMessageHandler: (handler: (event: MessageEvent) => void) => void;
  // Add other methods from websocketService if needed globally, e.g., requestReconciliation
}

// Create the context
const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

// Define the props for the provider component
interface WebSocketProviderProps {
  children: ReactNode;
}

// Create the provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Define handlers
    const handleStatusChange = (status: boolean) => {
      setIsConnected(status);
    };

    // Add status handler
    websocketService.addStatusHandler(handleStatusChange);

    // Attempt to connect when the provider mounts
    // websocketService.connect(); // Disabled as WebSocket endpoints are not documented/confirmed

    // Cleanup on unmount
    return () => {
      websocketService.removeStatusHandler(handleStatusChange);
      // Optionally disconnect if the provider unmounts (depends on app lifecycle)
      // websocketService.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected,
      // Expose necessary service methods through the context
      sendMessage: websocketService.send.bind(websocketService),
      addMessageHandler: websocketService.addMessageHandler.bind(websocketService),
      removeMessageHandler: websocketService.removeMessageHandler.bind(websocketService),
    }),
    [isConnected]
  ); // Re-memoize only when isConnected changes

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
};

// Create a custom hook for using the context
export const useWebSocketContext = (): WebSocketContextProps => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
