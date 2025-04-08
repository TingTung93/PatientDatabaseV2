import { message } from 'antd';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface ToastOptions {
  duration?: number;
  onClose?: () => void;
}

const defaultOptions: ToastOptions = {
  duration: 3, // 3 seconds
};

export const showToast = (
  content: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
): void => {
  const { duration, onClose } = { ...defaultOptions, ...options };

  switch (type) {
    case 'success':
      message.success(content, duration, onClose);
      break;
    case 'error':
      message.error(content, duration, onClose);
      break;
    case 'warning':
      message.warning(content, duration, onClose);
      break;
    case 'loading':
      message.loading(content, duration, onClose);
      break;
    case 'info':
    default:
      message.info(content, duration, onClose);
      break;
  }
};

// Helper functions for common use cases
export const showSuccessToast = (content: string, options?: ToastOptions): void =>
  showToast(content, 'success', options);

export const showErrorToast = (content: string, options?: ToastOptions): void =>
  showToast(content, 'error', options);

export const showWarningToast = (content: string, options?: ToastOptions): void =>
  showToast(content, 'warning', options);

export const showInfoToast = (content: string, options?: ToastOptions): void =>
  showToast(content, 'info', options);

export const showLoadingToast = (content: string, options?: ToastOptions): void =>
  showToast(content, 'loading', options);

// For destroying all toasts
export const destroyAllToasts = (): void => {
  message.destroy();
};
