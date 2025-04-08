import * as Yup from 'yup';

// Define the shape of the phenotype - can be refined based on specific requirements
const phenotypeSchema = Yup.object().shape({
    // Example: require at least one selection or specific combinations?
    // For now, just defining the shape
    D: Yup.boolean(),
    C: Yup.boolean(),
    E: Yup.boolean(),
    c: Yup.boolean(),
    e: Yup.boolean(),
});

const antigenPresenceSchema = Yup.object().shape({
    K: Yup.boolean(),
    k: Yup.boolean(),
    // ... other antigens like Fya, Fyb, Jka, Jkb, M, N, S, s
    Fya: Yup.boolean(),
    Fyb: Yup.boolean(),
    Jka: Yup.boolean(),
    Jkb: Yup.boolean(),
    M: Yup.boolean(),
    N: Yup.boolean(),
    S: Yup.boolean(),
    s: Yup.boolean(),
});

export const patientValidationSchema = Yup.object().shape({
    identification: Yup.object().shape({
        mrn: Yup.string()
            .required('MRN is required')
            .matches(/^[A-Za-z0-9]+$/, 'MRN must be alphanumeric') // Example validation
            .min(5, 'MRN must be at least 5 characters'),
        ssn: Yup.string()
            .matches(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format (###-##-####)')
            .optional(), // Make optional if not always required
        fmp: Yup.string().optional(),
    }),
    demographics: Yup.object().shape({
        firstName: Yup.string().required('First name is required').min(2, 'First name is too short'),
        lastName: Yup.string().required('Last name is required').min(2, 'Last name is too short'),
        dateOfBirth: Yup.string() // Treat as string for form input
            .required('Date of birth is required')
            .matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
            .test('is-past-date', 'Date of birth cannot be in the future', (value) => {
                if (!value) return true; // Allow empty if not required, or handle required separately
                try {
                    const date = new Date(value);
                    // Check if date is valid and not in the future (allow today)
                    return !isNaN(date.getTime()) && date <= new Date();
                } catch (e) {
                    return false; // Invalid date format
                }
            }),
        gender: Yup.string().required('Gender is required').oneOf(['M', 'F', 'O'], 'Invalid gender selected'),
    }),
    bloodProfile: Yup.object().shape({
        abo: Yup.string().required('Blood type (ABO) is required').oneOf(['A', 'B', 'AB', 'O'], 'Invalid ABO type'),
        rh: Yup.string().required('Rh factor is required').oneOf(['POS', 'NEG'], 'Invalid Rh factor'),
        phenotype: Yup.object().shape({ // Define structure for nested phenotype
             rh: phenotypeSchema,
             kell: antigenPresenceSchema, // Use the common schema
             duffy: antigenPresenceSchema,
             kidd: antigenPresenceSchema,
             mns: antigenPresenceSchema,
        }),
        antibodies: Yup.array().of(Yup.string().required()).optional(), // Array of required strings
    }),
    medicalHistory: Yup.object().shape({
        conditions: Yup.array().of(Yup.string().required()).optional(),
        allergies: Yup.array().of(Yup.string().required()).optional(),
        medications: Yup.array().of(Yup.string().required()).optional(),
    }),
});

// Define a type for the form data based on the schema
export type PatientFormData = Yup.InferType<typeof patientValidationSchema>; 