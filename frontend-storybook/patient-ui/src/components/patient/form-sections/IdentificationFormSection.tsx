import React from 'react';
import { Field, ErrorMessage } from 'formik';

// Assuming a common FormikField component exists or using basic Field
// import FormikField from '../../common/FormikField';

export const IdentificationFormSection: React.FC = () => {
  return (
    <section className="mb-6 border p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-4">Identification</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="identification.mrn" className="block text-sm font-medium text-gray-700">Medical Record Number (MRN)*</label>
          <Field
            id="identification.mrn"
            name="identification.mrn"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="identification.mrn" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="identification.ssn" className="block text-sm font-medium text-gray-700">Social Security Number</label>
          <Field
            id="identification.ssn"
            name="identification.ssn"
            type="text"
            placeholder="###-##-####"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="identification.ssn" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="identification.fmp" className="block text-sm font-medium text-gray-700">FMP</label>
          <Field
            id="identification.fmp"
            name="identification.fmp"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="identification.fmp" component="div" className="text-red-600 text-sm mt-1" />
        </div>
      </div>
    </section>
  );
}; 