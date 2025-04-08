import React, { useState, useCallback, useRef, ChangeEvent, DragEvent } from 'react';
import styled, { DefaultTheme } from 'styled-components'; // Import DefaultTheme
import { Theme } from '@mui/material/styles'; // Import MUI Theme

// Augment the DefaultTheme interface for styled-components
// This tells styled-components about the structure of our MUI theme
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends Theme {}
}

// --- Styled Components ---

const Container = styled.div<{ $isDragging: boolean; disabled?: boolean; theme: DefaultTheme }>`
  border: 2px dashed
    ${({ theme, $isDragging }) =>
      $isDragging ? theme.palette.primary.main : theme.palette.divider};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px; // Use theme.shape.borderRadius
  padding: 2rem;
  text-align: center;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  background-color: ${({ theme, $isDragging }) =>
    $isDragging
      ? theme.palette.action.hover
      : theme.palette.background.paper}; // Use appropriate theme colors
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  transition:
    background-color 0.2s ease-in-out,
    border-color 0.2s ease-in-out;
  margin-bottom: 1rem;

  &:hover {
    border-color: ${({ theme, disabled }) => !disabled && theme.palette.primary.main};
  }
`;

const Input = styled.input`
  display: none; // Hide the default input
`;

const Label = styled.label<{ theme: DefaultTheme }>`
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.palette.text.secondary}; // Use theme color
`;

const Instructions = styled.p<{ theme: DefaultTheme }>`
  color: ${({ theme }) => theme.palette.text.secondary}; // Use theme color
  margin: 0.5rem 0;
`;

const SelectedFile = styled.div<{ theme: DefaultTheme }>`
  margin-top: 1rem;
  font-style: italic;
  color: ${({ theme }) => theme.palette.text.primary}; // Use theme color
`;

const ErrorMessage = styled.p<{ theme: DefaultTheme }>`
  color: ${({ theme }) => theme.palette.error.main}; // Use theme color
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

// --- Component Props ---

interface FileUploadUIProps {
  /** Label for the upload area */
  label: string;
  /** Function called when a valid file is selected */
  onFileSelect: (file: File) => void;
  /** Function called when validation fails */
  onValidationError?: (error: string) => void;
  /** Function to validate the selected file */
  validateFile: (file: File) => { message: string } | null;
  /** Accept attribute string for the file input (e.g., 'image/png,image/jpeg') */
  accept: string;
  /** Optional instructions text */
  instructions?: string;
  /** Disable the upload area */
  disabled?: boolean;
  /** Currently selected file (optional, for controlled component behavior) */
  selectedFile?: File | null;
  /** Reset function callback (optional) */
  onReset?: () => void;
}

// --- Component ---

export const FileUploadUI: React.FC<FileUploadUIProps> = ({
  label,
  onFileSelect,
  onValidationError,
  validateFile,
  accept,
  instructions = 'Drag & drop a file here, or click to select',
  disabled = false,
  selectedFile: controlledFile, // Allow controlling the file state externally
  onReset,
}) => {
  const [internalFile, setInternalFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use controlled file if provided, otherwise internal state
  const currentFile = controlledFile !== undefined ? controlledFile : internalFile;

  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      setError(null); // Clear previous errors
      if (!selectedFile) {
        setInternalFile(null);
        if (onReset) onReset(); // Notify parent about reset if needed
        return;
      }

      const validationError = validateFile(selectedFile);
      if (validationError) {
        const errorMessage = validationError.message;
        setError(errorMessage);
        setInternalFile(null); // Clear invalid file
        if (onValidationError) {
          onValidationError(errorMessage);
        }
      } else {
        setInternalFile(selectedFile);
        onFileSelect(selectedFile); // Pass valid file up
      }
    },
    [validateFile, onFileSelect, onValidationError, onReset]
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Safely access the first file
    if (file) {
      handleFileChange(file);
    } else {
      handleFileChange(null); // Handle case where selection is cancelled or no file exists
    }
    // Reset input value to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation(); // Necessary to allow drop
      setIsDragging(true); // Keep dragging state active
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0]; // Safely access the first file
      if (file) {
        handleFileChange(file);
        event.dataTransfer.clearData(); // Recommended practice
      }
    },
    [disabled, handleFileChange]
  );

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click(); // Trigger the hidden file input
    }
  };

  return (
    <div>
      <Label>{label}</Label> {/* Removed htmlFor */}
      <Container
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        $isDragging={isDragging}
        disabled={disabled}
        role="button"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <Input
          ref={inputRef}
          id="file-upload-input"
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
        />
        <Instructions>{instructions}</Instructions>
        {currentFile && !error && <SelectedFile>Selected: {currentFile.name}</SelectedFile>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Container>
    </div>
  );
};
