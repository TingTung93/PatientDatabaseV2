import React, { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { Formik, Form, FormikHelpers } from 'formik'; // Import FormikHelpers
import * as Yup from 'yup';
import {
  Patient,
  PatientIdentification,
  Demographics,
  MedicalHistory,
  Note,
  Comment,
  CreatePatientRequest,
} from '../types/patient';
import {
  BloodProfile,
  BloodPhenotype,
  RhPhenotype,
  KellPhenotype,
  DuffyPhenotype,
  KiddPhenotype,
  MNSPhenotype,
  ABO,
  RhD,
} from '../types/blood'; // Import BloodPhenotype, etc. from blood
import { AuthContext } from '../context/AuthContext';
import { usePatient, useCreatePatient, useUpdatePatient } from '../hooks/usePatients';
import { usePatientCautionCards } from '../hooks/useCautionCards';
import { PhenotypeInputGrid } from '../components/PhenotypeInputGrid';
import { PhenotypeDisplay } from '../components/PhenotypeDisplay';
import { AntibodyInput } from '../components/AntibodyInput';
import AntibodyDisplay from '../components/AntibodyDisplay';
// import { createEmptyPatient } from '../utils/patientUtils';

// Blood type options
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodType = (typeof BLOOD_TYPES)[number];

const getBloodTypeComponents = (bloodType: BloodType): { abo: ABO; rh: RhD } => {
  const abo = bloodType.substring(0, bloodType.length - 1) as ABO;
  const rh = bloodType.substring(bloodType.length - 1) as RhD;
  return { abo, rh };
};

// Define simplified form values (only directly edited fields)
interface PatientFormValues {
  mrn: string;
  firstName: string;
  lastName: string;
  bloodType: BloodType;
  notes: string;
}

// Add validation schema with proper typing
const validationSchema = Yup.object().shape({
  identification: Yup.object().shape({
    mrn: Yup.string().required('MRN is required'),
  }),
  demographics: Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
  }),
  bloodProfile: Yup.object().shape({
    abo: Yup.string()
      .oneOf(['A', 'B', 'AB', 'O'], 'Invalid blood type')
      .required('Blood type is required'),
    rh: Yup.string().oneOf(['+', '-'], 'Invalid Rh factor').required('Rh factor is required'),
  }),
  notes: Yup.string(),
});

export const PatientFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const { data: existingPatient, isLoading: isLoadingPatient, refetch } = usePatient(id || '');
  const { data: linkedCards, isLoading: isLoadingCards } = usePatientCautionCards(id || '');
  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();

  const initialValues: PatientFormValues = {
    mrn: '',
    firstName: '',
    lastName: '',
    bloodType: 'O+',
    notes: '',
  };

  const handleSubmit = async (
    values: PatientFormValues, // Add type for values
    { setSubmitting, setStatus }: FormikHelpers<PatientFormValues> // Add type for helpers
  ) => {
    try {
      // Construct the full Patient object for the API call (simplified)
      const patientData: Omit<
        Patient,
        'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
      > = {
        demographics: {
          firstName: values.firstName,
          lastName: values.lastName,
          dateOfBirth: '2000-01-01', // Placeholder
          gender: 'O', // Placeholder
          contactNumber: '555-1212', // Placeholder
          email: 'test@example.com', // Placeholder
        },
        bloodProfile: {
          ...getBloodTypeComponents(values.bloodType),
          phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
          antibodies: [],
          restrictions: [],
          requirements: {
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
        }, // Placeholder
        comments: [],
        notes: [],
        cautionFlags: [],
        specialProcedures: [],
      };

      if (id) {
        await updatePatientMutation.mutateAsync({
          id,
          patient: patientData as any,
        });
      } else {
        const createData: CreatePatientRequest = {
          ...patientData,
          identification: { id: 'temp', mrn: values.mrn }, // Temporary ID
        };
        await createPatientMutation.mutateAsync(createData);
      }
      navigate('/patients');
    } catch (error) {
      setStatus({ error: 'Failed to save patient. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingPatient) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isEditMode ? 'Edit Patient' : 'New Patient'}
      </Typography>

      <Formik<PatientFormValues>
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
          <Form>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {' '}
                {/* Use flexbox for layout */}
                <Typography variant="h6" gutterBottom sx={{ width: '100%' }}>
                  Patient Information
                </Typography>
                {/* Use Box instead of Grid item, set width directly */}
                <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                  <TextField
                    fullWidth
                    id="mrn"
                    name="mrn"
                    label="Medical Record Number"
                    value={values.mrn}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={(touched.mrn && Boolean(errors.mrn)) || false}
                    helperText={touched.mrn && errors.mrn}
                  />
                </Box>
                {/* Use Box instead of Grid item, set width directly */}
                <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                  <TextField
                    fullWidth
                    id="lastName"
                    name="lastName"
                    label="Last Name"
                    value={values.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={(touched.lastName && Boolean(errors.lastName)) || false}
                    helperText={touched.lastName && errors.lastName}
                  />
                </Box>
                {/* Use Box instead of Grid item, set width directly */}
                <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                  <TextField
                    fullWidth
                    id="firstName"
                    name="firstName"
                    label="First Name"
                    value={values.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={(touched.firstName && Boolean(errors.firstName)) || false}
                    helperText={touched.firstName && errors.firstName}
                  />
                </Box>
                {/* Use Box instead of Grid item, set width directly */}
                <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel id="bloodType-label">Blood Type</InputLabel>
                    <Select<BloodType>
                      labelId="bloodType-label"
                      id="bloodType"
                      name="bloodType"
                      value={values.bloodType}
                      onChange={handleChange as (event: SelectChangeEvent<BloodType>) => void}
                      onBlur={handleBlur}
                      error={(touched.bloodType && Boolean(errors.bloodType)) || false}
                      label="Blood Type"
                    >
                      {BLOOD_TYPES.map(type => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.bloodType && errors.bloodType && (
                      <FormHelperText error>{errors.bloodType}</FormHelperText>
                    )}
                  </FormControl>
                </Box>
                {/* Use Box instead of Grid item, set width directly */}
                <Box sx={{ width: '100%', p: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    id="notes"
                    name="notes"
                    label="Notes"
                    value={values.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={(touched.notes && Boolean(errors.notes)) || false}
                    helperText={touched.notes && errors.notes}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Remove advanced sections for now */}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(isEditMode ? `/patients/${id}` : '/patients')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Patient'}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </Box>
  );
};
