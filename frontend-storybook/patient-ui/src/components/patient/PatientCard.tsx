import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Patient } from '../../types/patient';

export interface PatientCardProps {
  patient: Patient;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/patients/${patient.identification.id}`);
  };

  const createdDate = new Date(patient.createdAt).toLocaleDateString();

  const fullName = `${patient.demographics.firstName} ${patient.demographics.lastName}`;
  const bloodTypeDisplay = `${patient.bloodProfile.abo}${patient.bloodProfile.rh}`;

  return (
    <Card
      title={fullName}
      subtitle={`MRN: ${patient.identification.mrn}`}
      headerActions={
        onEdit && (
          <Button variant="secondary" size="sm" onClick={(e) => {
            e.stopPropagation();
            onEdit(patient.identification.id);
          }}>
            Edit
          </Button>
        )
      }
      footerActions={
        onDelete && (
          <Button variant="danger" size="sm" onClick={(e) => {
            e.stopPropagation();
            onDelete(patient.identification.id);
          }}>
            Delete
          </Button>
        )
      }
      onClick={handleViewDetails}
      className="hover:shadow-lg transition-shadow duration-200"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="font-medium">{createdDate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Date of Birth</p>
          <p className="font-medium">{new Date(patient.demographics.dateOfBirth).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Blood Type</p>
          <p className="font-medium">{bloodTypeDisplay}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ID</p>
          <p className="font-medium">#{patient.identification.id}</p>
        </div>
        {patient.cautionFlags && patient.cautionFlags.length > 0 && (
          <div className="col-span-2 md:col-span-3">
            <p className="text-sm text-red-500 font-medium">Caution Flags:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {patient.cautionFlags.map((flag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}; 