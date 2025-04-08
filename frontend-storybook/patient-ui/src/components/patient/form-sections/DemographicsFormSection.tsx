import React from 'react';
import { Field, ErrorMessage } from 'formik';

export const DemographicsFormSection: React.FC = () => {
  return (
    <section className="mb-6 border p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-4">Demographics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="demographics.firstName" className="block text-sm font-medium text-gray-700">First Name*</label>
          <Field
            id="demographics.firstName"
            name="demographics.firstName"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="demographics.firstName" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="demographics.lastName" className="block text-sm font-medium text-gray-700">Last Name*</label>
          <Field
            id="demographics.lastName"
            name="demographics.lastName"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="demographics.lastName" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="demographics.dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth*</label>
          <Field
            id="demographics.dateOfBirth"
            name="demographics.dateOfBirth"
            type="date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <ErrorMessage name="demographics.dateOfBirth" component="div" className="text-red-600 text-sm mt-1" />
        </div>
        <div className="form-group">
          <label htmlFor="demographics.gender" className="block text-sm font-medium text-gray-700">Gender*</label>
          <Field
            as="select" // Use Field as select
            id="demographics.gender"
            name="demographics.gender"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </Field>
          <ErrorMessage name="demographics.gender" component="div" className="text-red-600 text-sm mt-1" />
        </div>
      </div>
    </section>
  );
}; 