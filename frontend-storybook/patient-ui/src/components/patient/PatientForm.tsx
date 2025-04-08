import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Patient } from '../../types/patient';
import { BloodPhenotype } from '../../types/blood'; // Import BloodPhenotype from blood.ts

interface PatientFormProps {
  patient?: Patient;
  // onSubmit expects data excluding id and audit fields
  onSubmit: (
    values: Omit<
      Patient,
      'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ) => Promise<void>;
  isSubmitting?: boolean;
}

const validationSchema = Yup.object().shape({
  demographics: Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    dateOfBirth: Yup.date()
      .required('Date of birth is required')
      .max(new Date(), 'Date of birth cannot be in the future'),
    gender: Yup.string().oneOf(['M', 'F', 'O'], 'Invalid gender').required('Gender is required'),
    contactNumber: Yup.string().required('Contact number is required'), // Add validation
    email: Yup.string().email('Invalid email format').required('Email is required'), // Add validation
  }),
  bloodProfile: Yup.object().shape({
    abo: Yup.string()
      .oneOf(['A', 'B', 'AB', 'O'], 'Invalid blood type')
      .required('Blood type is required'),
    rh: Yup.string().oneOf(['+', '-'], 'Invalid Rh factor').required('Rh factor is required'),
    // Note: Phenotype validation is complex and might be better handled server-side or with a custom component
  }),
  // Add other sections as needed (medicalHistory, etc.)
});

// Default phenotype structure matching BloodPhenotype from blood.ts
const defaultPhenotype: BloodPhenotype = {
  rh: {}, // Empty objects are valid per src/types/blood.ts
  kell: {},
  duffy: {},
  kidd: {},
  mns: {},
};

// Initial values for a new patient form
const initialValues = {
  demographics: {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'O' as 'M' | 'F' | 'O', // Explicit type assertion
    contactNumber: '',
    email: '',
  },
  bloodProfile: {
    abo: '',
    rh: '',
    phenotype: defaultPhenotype, // Use default phenotype
    antibodies: [],
    restrictions: [], // Add missing field
    requirements: {
      // Add missing field
      immediateSpinRequired: false,
      salineToAHGRequired: false,
      preWarmRequired: false,
    },
  },
  medicalHistory: {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [],
  },
  comments: [],
  notes: [],
  cautionFlags: [], // Add missing field
  specialProcedures: [], // Add missing field
};

export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onSubmit,
  isSubmitting = false,
}) => {
  // Use patient data if provided, otherwise use initialValues
  const formInitialValues = patient || initialValues;

  return (
    <Formik
      initialValues={formInitialValues}
      validationSchema={validationSchema}
      enableReinitialize // Allow form to reinitialize if patient prop changes
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        try {
          // Construct the object to be submitted, ensuring type correctness
          const submitValues = {
            // Start with Formik values
            ...values,
            // Ensure demographics has the correct gender type and required fields
            demographics: {
              ...values.demographics,
              gender: values.demographics.gender as 'M' | 'F' | 'O',
              contactNumber: values.demographics.contactNumber || '', // Ensure string
              email: values.demographics.email || '', // Ensure string
            },
            // Ensure bloodProfile and phenotype are correctly structured
            bloodProfile: {
              ...values.bloodProfile,
              // Use existing phenotype if valid, otherwise use default
              // Check for existence of a key property (e.g., rh) instead of type checking string
              phenotype:
                values.bloodProfile?.phenotype && values.bloodProfile.phenotype.rh !== undefined
                  ? values.bloodProfile.phenotype
                  : defaultPhenotype,
              antibodies: values.bloodProfile?.antibodies || [],
              restrictions: values.bloodProfile?.restrictions || [],
              requirements: values.bloodProfile?.requirements || {
                immediateSpinRequired: false,
                salineToAHGRequired: false,
                preWarmRequired: false,
              },
            },
            // Ensure medicalHistory and its arrays exist
            medicalHistory: {
              allergies: values.medicalHistory?.allergies || [],
              conditions: values.medicalHistory?.conditions || [],
              medications: values.medicalHistory?.medications || [],
              surgeries: values.medicalHistory?.surgeries || [],
              procedures: values.medicalHistory?.procedures || [],
            },
            // Ensure other arrays exist
            comments: values.comments || [],
            notes: values.notes || [],
            cautionFlags: values.cautionFlags || [],
            specialProcedures: values.specialProcedures || [],
          };

          // Remove properties not expected by the onSubmit prop based on its type
          // (id, identification, createdAt, updatedAt, createdBy, updatedBy)
          const {
            id,
            identification,
            createdAt,
            updatedAt,
            createdBy,
            updatedBy,
            ...valuesToSubmit
          } = submitValues as any; // Use 'as any' carefully for stripping props

          await onSubmit(valuesToSubmit);
          setStatus({ success: true });
        } catch (error) {
          setStatus({
            success: false,
            error: error instanceof Error ? error.message : 'An error occurred',
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ errors, touched, status }) => (
        <Form className="patient-form space-y-6 p-4 border rounded-lg shadow-md bg-white">
          {status?.error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{status.error}</span>
            </div>
          )}

          <div className="form-section border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label
                  htmlFor="demographics.firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  First Name
                </label>
                <Field
                  type="text"
                  id="demographics.firstName"
                  name="demographics.firstName"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.firstName && touched.demographics?.firstName ? 'border-red-500' : ''}`}
                />
                {errors.demographics?.firstName && touched.demographics?.firstName && (
                  <div className="text-red-600 text-sm mt-1">{errors.demographics.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="demographics.lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>
                <Field
                  type="text"
                  id="demographics.lastName"
                  name="demographics.lastName"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.lastName && touched.demographics?.lastName ? 'border-red-500' : ''}`}
                />
                {errors.demographics?.lastName && touched.demographics?.lastName && (
                  <div className="text-red-600 text-sm mt-1">{errors.demographics.lastName}</div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="demographics.dateOfBirth"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date of Birth
                </label>
                <Field
                  type="date"
                  id="demographics.dateOfBirth"
                  name="demographics.dateOfBirth"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.dateOfBirth && touched.demographics?.dateOfBirth ? 'border-red-500' : ''}`}
                />
                {errors.demographics?.dateOfBirth && touched.demographics?.dateOfBirth && (
                  <div className="text-red-600 text-sm mt-1">{errors.demographics.dateOfBirth}</div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="demographics.gender"
                  className="block text-sm font-medium text-gray-700"
                >
                  Gender
                </label>
                <Field
                  as="select"
                  id="demographics.gender"
                  name="demographics.gender"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.gender && touched.demographics?.gender ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </Field>
                {errors.demographics?.gender && touched.demographics?.gender && (
                  <div className="text-red-600 text-sm mt-1">{errors.demographics.gender}</div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="demographics.contactNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact Number
                </label>
                <Field
                  type="tel"
                  id="demographics.contactNumber"
                  name="demographics.contactNumber"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.contactNumber && touched.demographics?.contactNumber ? 'border-red-500' : ''}`}
                />
                {errors.demographics?.contactNumber && touched.demographics?.contactNumber && (
                  <div className="text-red-600 text-sm mt-1">
                    {errors.demographics.contactNumber}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="demographics.email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <Field
                  type="email"
                  id="demographics.email"
                  name="demographics.email"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.demographics?.email && touched.demographics?.email ? 'border-red-500' : ''}`}
                />
                {errors.demographics?.email && touched.demographics?.email && (
                  <div className="text-red-600 text-sm mt-1">{errors.demographics.email}</div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Blood Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label
                  htmlFor="bloodProfile.abo"
                  className="block text-sm font-medium text-gray-700"
                >
                  Blood Type (ABO)
                </label>
                <Field
                  as="select"
                  id="bloodProfile.abo"
                  name="bloodProfile.abo"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.bloodProfile?.abo && touched.bloodProfile?.abo ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Blood Type</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </Field>
                {errors.bloodProfile?.abo && touched.bloodProfile?.abo && (
                  <div className="text-red-600 text-sm mt-1">{errors.bloodProfile.abo}</div>
                )}
              </div>

              <div className="form-group">
                <label
                  htmlFor="bloodProfile.rh"
                  className="block text-sm font-medium text-gray-700"
                >
                  Rh Factor
                </label>
                <Field
                  as="select"
                  id="bloodProfile.rh"
                  name="bloodProfile.rh"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.bloodProfile?.rh && touched.bloodProfile?.rh ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Rh Factor</option>
                  <option value="+">Positive (+)</option>
                  <option value="-">Negative (-)</option>
                </Field>
                {errors.bloodProfile?.rh && touched.bloodProfile?.rh && (
                  <div className="text-red-600 text-sm mt-1">{errors.bloodProfile.rh}</div>
                )}
              </div>
            </div>
            {/* Add fields for phenotype, antibodies, etc. if they are editable */}
          </div>

          {/* Add sections for Medical History, Comments, Notes etc. if needed */}

          <div className="form-actions pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
