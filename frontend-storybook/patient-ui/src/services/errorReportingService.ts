interface ErrorContext {
  componentStack?: string;
  additionalInfo?: Record<string, unknown>;
  userId?: string;
  timestamp?: string;
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private initialized: boolean = false;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  public initialize(config: { environment: string; version: string }) {
    if (this.initialized) {
      console.warn('ErrorReportingService already initialized');
      return;
    }

    // Initialize error reporting service
    // You could add integration with services like Sentry here
    this.initialized = true;
    console.log('ErrorReportingService initialized with config:', config);
  }

  public logError(error: Error, context?: ErrorContext) {
    if (!this.initialized) {
      console.warn('ErrorReportingService not initialized');
      return;
    }

    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...context,
        timestamp: context?.timestamp || new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Report');
      console.error(error);
      console.log('Context:', errorReport.context);
      console.groupEnd();
    }

    // Here you would typically send the error to your error reporting service
    // Example: Sentry.captureException(error, { extra: context });

    return errorReport;
  }

  public logInfo(message: string, data?: Record<string, unknown>) {
    if (!this.initialized) {
      console.warn('ErrorReportingService not initialized');
      return;
    }

    const logEntry = {
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Info Log:', logEntry);
    }

    // Here you would typically send the log to your logging service
    return logEntry;
  }

  public setUser(userId: string) {
    if (!this.initialized) {
      console.warn('ErrorReportingService not initialized');
      return;
    }

    // Set user context for error reporting
    // Example: Sentry.setUser({ id: userId });
    console.log('User context set:', userId);
  }

  public clearUser() {
    if (!this.initialized) {
      console.warn('ErrorReportingService not initialized');
      return;
    }

    // Clear user context
    // Example: Sentry.setUser(null);
    console.log('User context cleared');
  }
}

export const errorReportingService = ErrorReportingService.getInstance(); 