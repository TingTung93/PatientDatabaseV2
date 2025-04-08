import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../services/authService';
import { Button } from '../components/common'; // Assuming Button component exists

const loginValidationSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  
  // Get redirect location from state or default to home
  const from = location.state?.from?.pathname || "/";

  const initialValues: LoginCredentials = { username: '', password: '' };

  const handleSubmit = async (values: LoginCredentials, { setSubmitting, setStatus }: any) => {
    setStatus({ loginError: null }); // Clear previous errors
    try {
      await auth.login(values);
      navigate(from, { replace: true }); // Redirect to original destination
    } catch (error: any) {
      console.error("Login failed:", error);
      setStatus({ loginError: error.message || 'Invalid username or password' });
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg sm:w-full md:w-1/2 lg:w-1/3">
        <h3 className="text-2xl font-bold text-center">Login to your account</h3>
        <Formik
          initialValues={initialValues}
          validationSchema={loginValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, status }) => (
            <Form className="mt-4">
              <div className="mt-4">
                <label className="block" htmlFor="username">Username</label>
                <Field 
                    type="text" 
                    name="username"
                    placeholder="Username"
                    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                 />
                <ErrorMessage name="username" component="div" className="text-xs text-red-600" />
              </div>
              <div className="mt-4">
                <label className="block" htmlFor="password">Password</label>
                 <Field 
                    type="password" 
                    name="password"
                    placeholder="Password"
                    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <ErrorMessage name="password" component="div" className="text-xs text-red-600" />
              </div>
              
              {/* Display login errors */}
              {status?.loginError && (
                 <div className="mt-3 text-xs text-red-600">
                   {status.loginError}
                 </div>
               )} 
               
              <div className="flex items-baseline justify-between">
                <Button 
                    type="submit" 
                    className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 w-full"
                    disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
                {/* Optional: Add Forgot Password link */}
                {/* <a href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</a> */}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}; 