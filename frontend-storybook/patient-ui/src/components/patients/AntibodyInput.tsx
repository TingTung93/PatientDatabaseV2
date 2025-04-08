import React, { useState } from 'react';
import { Autocomplete, TextField, Chip, Box } from '@mui/material';

// Common antibodies for suggestions
const COMMON_ANTIBODIES = [
  'Anti-D',
  'Anti-C',
  'Anti-c',
  'Anti-E',
  'Anti-e',
  'Anti-K',
  'Anti-k',
  'Anti-Kpa',
  'Anti-Kpb',
  'Anti-Fya',
  'Anti-Fyb',
  'Anti-Jka',
  'Anti-Jkb',
  'Anti-M',
  'Anti-N',
  'Anti-S',
  'Anti-s',
  'Anti-Lea',
  'Anti-Leb',
  'Anti-P1',
  'Anti-Lua',
  'Anti-Lub',
];

interface AntibodyInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export const AntibodyInput: React.FC<AntibodyInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (_: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  const handleChange = (_: React.SyntheticEvent, newValue: string[]) => {
    onChange(newValue);
  };

  // Format new options to ensure "Anti-" prefix
  const formatNewOption = (option: string) => {
    const formatted = option.trim();
    return formatted.startsWith('Anti-') ? formatted : `Anti-${formatted}`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Autocomplete
        multiple
        freeSolo
        disabled={disabled}
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={COMMON_ANTIBODIES.filter(option => !value.includes(option))}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              color="primary"
              variant="outlined"
              size="small"
            />
          ))
        }
        renderInput={params => {
          // Extract and sanitize InputLabelProps
          const { InputLabelProps, ...otherParams } = params;
          const inputLabelProps = {
            ...InputLabelProps,
            className: InputLabelProps?.className ?? '', // Ensure className is string
            style: InputLabelProps?.style ?? {}, // Ensure style is object
          };
          return (
            <TextField
              {...otherParams} // Spread the rest of the params
              InputLabelProps={inputLabelProps} // Pass sanitized InputLabelProps
              size="small" // Explicitly set size
              variant="outlined"
              placeholder={disabled ? '' : 'Type to add antibodies...'}
              helperText="Type and press enter to add custom antibodies"
              fullWidth
            />
          );
        }}
        // Removed erroneous closing tags
        // Rename to filterOptions and add types
        filterOptions={(options: string[], params) => {
          // Remove explicit type for params
          const filtered = options.filter(
            (
              option // option is now string
            ) => option.toLowerCase().includes(params.inputValue.toLowerCase())
          );

          // Add the custom option if it doesn't exist
          const input = params.inputValue.trim();
          if (input !== '' && !options.includes(input) && !value.includes(formatNewOption(input))) {
            filtered.push(input);
          }

          return filtered;
        }}
        getOptionLabel={option => {
          // Format new options when they are selected
          if (typeof option === 'string' && !COMMON_ANTIBODIES.includes(option)) {
            return formatNewOption(option);
          }
          return option;
        }}
      />
    </Box>
  );
};
