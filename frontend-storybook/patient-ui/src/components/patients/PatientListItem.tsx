import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Patient } from '../../types/patient';

interface PatientListItemProps {
  patient: Patient;
  onDelete: (id: string | number) => void;
  isDeleting: boolean;
}

const PatientListItem: React.FC<PatientListItemProps> = memo(
  ({ patient, onDelete, isDeleting }) => {
    const navigate = useNavigate();

    const handleClick = () => {
      navigate(`/patients/${patient.id}`);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(patient.id);
    };

    return (
      <div
        onClick={handleClick}
        className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-200"
      >
        <div className="text-sm font-medium text-gray-900">
          {patient.demographics.firstName} {patient.demographics.lastName}
        </div>
        <div className="text-sm text-gray-500">{patient.identification.mrn}</div>
        <div className="text-sm text-gray-500">
          {format(new Date(patient.demographics.dateOfBirth), 'MM/dd/yyyy')}
        </div>
        <div className="text-sm text-gray-500">
          {patient.bloodProfile.abo}
          {patient.bloodProfile.rh}
        </div>
        {/* Remove Status column as it doesn't exist on Patient type */}
        <div className="text-sm text-gray-500"></div>
        <div className="text-right text-sm font-medium">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`text-red-600 hover:text-red-900 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    );
  }
);

PatientListItem.displayName = 'PatientListItem';

export default PatientListItem;
