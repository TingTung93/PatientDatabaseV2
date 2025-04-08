import React from 'react';
import { Field, ErrorMessage, FieldArray } from 'formik';
import { PhenotypeCheckboxGroup } from './PhenotypeCheckboxGroup';

// Define antigen groups
const phenotypeSystems = {
  Rh: { base: 'bloodProfile.phenotype.rh', antigens: ['D', 'C', 'E', 'c', 'e'] },
  Kell: { base: 'bloodProfile.phenotype.kell', antigens: ['K', 'k'] },
  Duffy: { base: 'bloodProfile.phenotype.duffy', antigens: ['Fya', 'Fyb'] },
  Kidd: { base: 'bloodProfile.phenotype.kidd', antigens: ['Jka', 'Jkb'] },
  MNS: { base: 'bloodProfile.phenotype.mns', antigens: ['M', 'N', 'S', 's'] },
};

export const BloodProfileFormSection: React.FC = () => {
  return (
    <section className="mb-6 border p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-4">Blood Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="form-group">
          <label htmlFor="bloodProfile.abo" className="block text-sm font-medium text-gray-700">Blood Type (ABO)*</label>
          <Field
            as="select"
            id="bloodProfile.abo"
            name="bloodProfile.abo"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select Blood Type</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </Field>
          <ErrorMessage name="bloodProfile.abo" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="bloodProfile.rh" className="block text-sm font-medium text-gray-700">Rh Factor*</label>
          <Field
            as="select"
            id="bloodProfile.rh"
            name="bloodProfile.rh"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select Rh Factor</option>
            <option value="POS">Positive</option>
            <option value="NEG">Negative</option>
          </Field>
          <ErrorMessage name="bloodProfile.rh" component="div" className="text-red-600 text-sm mt-1" />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Phenotype</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-2 border rounded">
          {Object.entries(phenotypeSystems).map(([systemName, config]) => (
            <PhenotypeCheckboxGroup 
              key={systemName}
              systemName={systemName}
              baseFieldName={config.base}
              antigens={config.antigens}
            />
          ))}
        </div>
        <ErrorMessage name="bloodProfile.phenotype" component="div" className="text-red-600 text-sm mt-1" />
      </div>

      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1">Antibodies</label>
        <FieldArray name="bloodProfile.antibodies">
          {({ push, remove, form }) => (
            <div>
              {form.values.bloodProfile.antibodies?.map((_: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 mb-1">
                  <Field 
                    name={`bloodProfile.antibodies[${index}]`} 
                    type="text" 
                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button type="button" onClick={() => remove(index)} className="text-red-600 hover:text-red-800">Remove</button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => push('')} 
                className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add Antibody
              </button>
            </div>
          )}
        </FieldArray>
        <ErrorMessage name="bloodProfile.antibodies" component="div" className="text-red-600 text-sm mt-1" />
      </div>
    </section>
  );
}; 