import React from 'react';
import { Box, Typography } from '@mui/material';
import { BloodPhenotype } from '../types/blood';

interface PhenotypeDisplayProps {
  phenotypeData?: BloodPhenotype;
}

export const PhenotypeDisplay: React.FC<PhenotypeDisplayProps> = ({ phenotypeData }) => {
  if (!phenotypeData) {
    return (
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No phenotype data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      {/* Replace Grid with Box using flexbox */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Object.entries(phenotypeData).map(
          ([antigen, value]) =>
            value && (
              <Box key={antigen}>
                {' '}
                {/* Use Box instead of Grid item */}
                <Typography variant="body2">
                  {antigen}: {value ? 'Positive' : 'Negative'}
                </Typography>
              </Box>
            )
        )}
      </Box>
      {Object.values(phenotypeData).every(v => !v) && (
        <Typography variant="body2" color="text.secondary">
          No phenotype data available
        </Typography>
      )}
    </Box>
  );
};
