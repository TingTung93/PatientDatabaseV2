import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { userService } from '../services/userService';

interface UserProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const UserProfilePage: React.FC = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const { data: user, isLoading } = useQuery('userProfile', userService.getCurrentUser);

  const [formData, setFormData] = useState<UserProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }));
    }
  }, [user]);

  const updateProfileMutation = useMutation(
    (data: Partial<UserProfileForm>) => userService.updateProfile(data),
    {
      onSuccess: () => {
        setSuccessMessage('Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error: Error) => {
        setError(error.message);
      },
    }
  );

  const changePasswordMutation = useMutation(
    (data: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(data),
    {
      onSuccess: () => {
        setSuccessMessage('Password changed successfully');
        setIsChangingPassword(false);
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error: Error) => {
        setError(error.message);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isChangingPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      changePasswordMutation.mutate({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
    } else {
      const { currentPassword, newPassword, confirmPassword, ...profileData } = formData;
      updateProfileMutation.mutate(profileData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) return <div>Loading profile...</div>;

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>User Profile</h1>
      </div>

      <div className="profile-content">
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Profile Information</h2>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isChangingPassword ? (
            <div className="form-section">
              <h2>Change Password</h2>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
            </div>
          ) : null}

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={updateProfileMutation.isLoading || changePasswordMutation.isLoading}
            >
              {updateProfileMutation.isLoading || changePasswordMutation.isLoading
                ? 'Saving...'
                : 'Save Changes'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
            >
              {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 