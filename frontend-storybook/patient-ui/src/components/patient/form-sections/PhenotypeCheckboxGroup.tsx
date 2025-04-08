import React from 'react';
import { Field } from 'formik';

interface PhenotypeCheckboxGroupProps {
  systemName: string; // e.g., "Rh", "Kell"
  baseFieldName: string; // e.g., "bloodProfile.phenotype.rh"
  antigens: string[]; // e.g., ['D', 'C', 'E', 'c', 'e']
}

export const PhenotypeCheckboxGroup: React.FC<PhenotypeCheckboxGroupProps> = ({ 
    systemName, 
    baseFieldName, 
    antigens 
}) => {
  return (
    <div>
      <h4 className="font-medium text-sm mb-1">{systemName} System</h4>
      <div className="space-y-1">
        {antigens.map(antigen => (
          <label key={antigen} className="flex items-center space-x-2 text-sm">
            <Field 
              type="checkbox" 
              name={`${baseFieldName}.${antigen}`} 
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            <span>{antigen}</span>
          </label>
        ))}
      </div>
      {/* ErrorMessage could potentially be rendered here if needed per group */}
      {/* <ErrorMessage name={baseFieldName} component="div" className="text-red-600 text-xs mt-1" /> */}
    </div>
  );
}; 