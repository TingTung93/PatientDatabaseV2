import React from 'react';
import { Box, FormControlLabel, Checkbox, Typography } from '@mui/material';
// Import the correct types from blood.ts
import {
  BloodPhenotype,
  RhPhenotype,
  KellPhenotype,
  DuffyPhenotype,
  KiddPhenotype,
  MNSPhenotype,
} from '../types/blood';

interface PhenotypeInputGridProps {
  value: BloodPhenotype;
  onChange: (value: BloodPhenotype) => void;
  disabled?: boolean;
}

// Helper type for phenotype categories
type PhenotypeCategory = keyof Omit<BloodPhenotype, 'other'>;

// Define the antigens for each category
const phenotypeAntigens: Record<PhenotypeCategory, string[]> = {
  rh: ['D', 'C', 'E', 'c', 'e'],
  kell: ['K', 'k'],
  duffy: ['Fya', 'Fyb'],
  kidd: ['Jka', 'Jkb'],
  mns: ['M', 'N', 'S', 's'],
};

export const PhenotypeInputGrid: React.FC<PhenotypeInputGridProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Ensure value and nested objects are initialized correctly
  const currentPhenotype: BloodPhenotype = {
    rh: value?.rh || {},
    kell: value?.kell || {},
    duffy: value?.duffy || {},
    kidd: value?.kidd || {},
    mns: value?.mns || {},
    other: value?.other || {},
  };

  const handleCheckboxChange = (category: PhenotypeCategory, antigen: string, checked: boolean) => {
    const categoryValue = currentPhenotype[category] || {};
    const updatedCategory = { ...categoryValue, [antigen]: checked };

    onChange({
      ...currentPhenotype,
      [category]: updatedCategory,
    });
  };

  // TODO: Implement handling for 'other' phenotypes if needed

  return (
    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Phenotype
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {(Object.keys(phenotypeAntigens) as PhenotypeCategory[]).map(category => (
          <Box
            key={category}
            sx={{
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 1 }}>
              {category}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {phenotypeAntigens[category].map(antigen => {
                const categoryData = currentPhenotype[category] as Record<string, boolean>;
                const isChecked = !!categoryData[antigen];

                return (
                  <FormControlLabel
                    key={`${category}-${antigen}`}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={e => handleCheckboxChange(category, antigen, e.target.checked)}
                        disabled={disabled}
                        size="small"
                      />
                    }
                    label={String(antigen)}
                    sx={{ mr: 1 }}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
        {/* TODO: Add input for 'other' phenotypes if needed */}
      </Box>
    </Box>
  );
};

export default PhenotypeInputGrid;
