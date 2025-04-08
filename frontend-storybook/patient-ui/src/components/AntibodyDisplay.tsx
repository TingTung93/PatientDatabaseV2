import React from 'react';
import { Box, Typography } from '@mui/material';

interface AntibodyDisplayProps {
  antibodies?: readonly string[]; // Use readonly array for props
}

export const AntibodyDisplay: React.FC<AntibodyDisplayProps> = ({ antibodies = [] }) => {
  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      {antibodies.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {' '}
          {/* Use Box with flexbox instead */}
          {antibodies.map(antibody => (
            // Removed the Grid item wrapper
            <Typography key={antibody} variant="body2">
              {antibody}
            </Typography>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No antibodies recorded
        </Typography>
      )}
    </Box>
  );
};

export default AntibodyDisplay;
