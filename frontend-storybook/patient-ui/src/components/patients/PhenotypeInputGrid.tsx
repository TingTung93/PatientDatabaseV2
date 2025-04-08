import React from 'react';
import { Box, FormControlLabel, Checkbox, Typography, Paper } from '@mui/material';

// Define the phenotype groups and their antigens
const PHENOTYPE_GROUPS = {
  'Rh System': ['D', 'C', 'c', 'E', 'e'],
  'Kell System': ['K', 'k', 'Kpa', 'Kpb', 'Jsa', 'Jsb'],
  'Duffy System': ['Fya', 'Fyb'],
  'Kidd System': ['Jka', 'Jkb'],
  'MNS System': ['M', 'N', 'S', 's'],
  'Lewis System': ['Lea', 'Leb'],
  'P System': ['P1'],
  'Lutheran System': ['Lua', 'Lub'],
};

export interface PhenotypeData {
  [key: string]: boolean;
}

interface PhenotypeInputGridProps {
  value: PhenotypeData;
  onChange: (value: PhenotypeData) => void;
  disabled?: boolean;
}

export const PhenotypeInputGrid: React.FC<PhenotypeInputGridProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (antigen: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      [antigen]: event.target.checked,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Replace Grid with Box using flexbox */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {Object.entries(PHENOTYPE_GROUPS).map(([groupName, antigens]) => (
          <Box
            key={groupName}
            sx={{
              flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, // Adjust basis for gap
              flexGrow: 1,
            }}
          >
            <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
              {' '}
              {/* Ensure paper fills height */}
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {groupName}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {antigens.map(antigen => (
                  <FormControlLabel
                    key={antigen}
                    control={
                      <Checkbox
                        checked={value[antigen] || false}
                        onChange={handleChange(antigen)}
                        disabled={disabled}
                        size="small"
                      />
                    }
                    label={antigen}
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
