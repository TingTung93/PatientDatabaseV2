import React from 'react';
import { Field, ErrorMessage, FieldArray } from 'formik';

// Reusable component for handling array inputs (Conditions, Allergies, Medications)
const ArrayInputSection: React.FC<{ fieldName: string; label: string; placeholder: string }> = ({
  fieldName,
  label,
  placeholder,
}) => {
  return (
    <div className="form-group mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <FieldArray name={fieldName}>
        {({ push, remove, form }) => (
          <div>
            {(() => {
              const historyKey = fieldName.split('.')[1] as
                | keyof typeof form.values.medicalHistory
                | undefined;
              if (!historyKey || !(historyKey in form.values.medicalHistory)) {
                return null; // Or some error indication
              }
              const items = form.values.medicalHistory[historyKey] as string[] | undefined;
              return items?.map((_: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 mb-1">
                  <Field
                    name={`${fieldName}[${index}]`}
                    type="text"
                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div> // Closing div is now correctly inside map return
              ));
            })()}
            {/* Input to add new item - Using a simple input, could be more sophisticated */}
            <input
              type="text"
              placeholder={placeholder}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onKeyDown={e => {
                // Add on Enter key press
                if (e.key === 'Enter' && e.currentTarget.value) {
                  e.preventDefault();
                  push(e.currentTarget.value);
                  e.currentTarget.value = ''; // Clear input
                }
              }}
            />
            <button
              type="button"
              onClick={e => {
                // Find the related input (sibling)
                const input = (e.target as HTMLElement)
                  .previousElementSibling as HTMLInputElement | null;
                if (input?.value) {
                  push(input.value);
                  input.value = '';
                }
              }}
              className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              + Add {label.slice(0, -1)} {/* Remove trailing 's' */}
            </button>
          </div>
        )}
      </FieldArray>
      <ErrorMessage name={fieldName} component="div" className="text-red-600 text-sm mt-1" />
    </div>
  );
};

export const MedicalHistoryFormSection: React.FC = () => {
  return (
    <section className="mb-6 border p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-4">Medical History</h2>
      <ArrayInputSection
        fieldName="medicalHistory.conditions"
        label="Conditions"
        placeholder="Add condition and press Enter"
      />
      <ArrayInputSection
        fieldName="medicalHistory.allergies"
        label="Allergies"
        placeholder="Add allergy and press Enter"
      />
      <ArrayInputSection
        fieldName="medicalHistory.medications"
        label="Medications"
        placeholder="Add medication and press Enter"
      />
    </section>
  );
};
