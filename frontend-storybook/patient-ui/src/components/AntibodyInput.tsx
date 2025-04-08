import React from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';

interface AntibodyInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const COMMON_ANTIBODIES = [
  'Anti-A',
  'Anti-B',
  'Anti-D',
  'Anti-C',
  'Anti-c',
  'Anti-E',
  'Anti-e',
  'Anti-K',
  'Anti-k',
  'Anti-Fya',
  'Anti-Fyb',
  'Anti-Jka',
  'Anti-Jkb',
  'Anti-M',
  'Anti-N',
  'Anti-S',
  'Anti-s',
];

export const AntibodyInput: React.FC<AntibodyInputProps> = ({
  value = [],
  onChange,
  disabled = false,
}): JSX.Element => {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Antibodies
      </Typography>
      <Autocomplete
        multiple
        options={COMMON_ANTIBODIES}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        renderInput={params => (
          <TextField
            label="Antibodies"
            placeholder="Select or type antibodies"
            disabled={disabled}
            size="small"
            variant="standard"
          />
        )}
        freeSolo
        filterSelectedOptions
        disabled={disabled}
      />
    </Box>
  );
};
