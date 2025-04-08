import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadUI } from '../FileUploadUI';

describe('FileUploadUI', () => {
  const mockOnFileSelect = jest.fn();
  const mockOnValidationError = jest.fn();
  const mockValidateFile = jest.fn();
  const mockOnReset = jest.fn();

  const defaultProps = {
    label: 'Test Upload',
    onFileSelect: mockOnFileSelect,
    onValidationError: mockOnValidationError,
    validateFile: mockValidateFile,
    accept: 'image/jpeg,image/png',
    selectedFile: null,
    onReset: mockOnReset,
    disabled: false,
    instructions: 'Drop files here or click to select',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload area with instructions', () => {
    render(<FileUploadUI {...defaultProps} />);
    expect(screen.getByText('Test Upload')).toBeInTheDocument();
    expect(screen.getByText('Drop files here or click to select')).toBeInTheDocument();
  });

  it('should handle file selection via click', async () => {
    render(<FileUploadUI {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');

    mockValidateFile.mockReturnValue(null); // No validation errors

    await act(async () => {
      await userEvent.upload(input, file);
    });

    expect(mockValidateFile).toHaveBeenCalledWith(file);
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(mockOnValidationError).not.toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    render(<FileUploadUI {...defaultProps} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');

    mockValidateFile.mockReturnValue({
      code: 'INVALID_FILE_TYPE',
      message: 'Invalid file type',
    });

    await act(async () => {
      await userEvent.upload(input, file);
    });

    expect(mockValidateFile).toHaveBeenCalledWith(file);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(mockOnValidationError).toHaveBeenCalledWith('Invalid file type');
  });

  it('should handle drag and drop', async () => {
    render(<FileUploadUI {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropzone = screen.getByTestId('dropzone');

    mockValidateFile.mockReturnValue(null);

    await act(async () => {
      fireEvent.dragOver(dropzone);
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    expect(mockValidateFile).toHaveBeenCalledWith(file);
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should display selected file name', () => {
    const selectedFile = new File(['test'], 'selected.jpg', { type: 'image/jpeg' });
    render(<FileUploadUI {...defaultProps} selectedFile={selectedFile} />);

    expect(screen.getByText('selected.jpg')).toBeInTheDocument();
  });

  it('should handle reset', async () => {
    const selectedFile = new File(['test'], 'selected.jpg', { type: 'image/jpeg' });
    render(<FileUploadUI {...defaultProps} selectedFile={selectedFile} />);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await userEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('should disable upload area when disabled prop is true', () => {
    render(<FileUploadUI {...defaultProps} disabled={true} />);

    const input = screen.getByTestId('file-input');
    expect(input).toBeDisabled();

    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
  });

  it('should prevent drag and drop when disabled', async () => {
    render(<FileUploadUI {...defaultProps} disabled={true} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropzone = screen.getByTestId('dropzone');

    await act(async () => {
      fireEvent.dragOver(dropzone);
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    expect(mockValidateFile).not.toHaveBeenCalled();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('should show drag over state', async () => {
    render(<FileUploadUI {...defaultProps} />);

    const dropzone = screen.getByTestId('dropzone');

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveClass('dragover');

    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('dragover');
  });

  it('should handle multiple files by taking only the first one', async () => {
    render(<FileUploadUI {...defaultProps} />);

    const files = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
    ];
    const dropzone = screen.getByTestId('dropzone');

    mockValidateFile.mockReturnValue(null);

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files,
        },
      });
    });

    expect(mockValidateFile).toHaveBeenCalledWith(files[0]);
    expect(mockOnFileSelect).toHaveBeenCalledWith(files[0]);
    expect(mockValidateFile).toHaveBeenCalledTimes(1);
  });
});
