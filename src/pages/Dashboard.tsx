import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { cautionCardService } from '../services/cautionCardService';
import { reportService } from '../services/reportService';

export const Dashboard: React.FC = () => {
  const { data: patients } = useQuery(
    'recentPatients',
    () => patientService.getAllPatients({ page: 1, limit: 5 })
  );

  const { data: cautionCards } = useQuery(
    'recentCautionCards',
    () => cautionCardService.getAllCautionCards({ page: 1, limit: 5 })
  );

  const { data: reports } = useQuery(
    'recentReports',
    () => reportService.getAllReports({ page: 1, limit: 5 })
  );

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>Recent Patients</h2>
          {patients?.data.length === 0 ? (
            <p>No patients found</p>
          ) : (
            <ul>
              {patients?.data.map(patient => (
                <li key={patient.id}>
                  <Link to={`/patients/${patient.id}`}>
                    {patient.firstName} {patient.lastName}
                  </Link>
                  <span className="meta">
                    {patient.medicalRecordNumber} - {patient.bloodType}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/patients" className="view-all">
            View All Patients
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Recent Caution Cards</h2>
          {cautionCards?.data.length === 0 ? (
            <p>No caution cards found</p>
          ) : (
            <ul>
              {cautionCards?.data.map(card => (
                <li key={card.id}>
                  <Link to={`/caution-cards/${card.id}`}>
                    Blood Type: {card.blood_type}
                  </Link>
                  <span className="meta">
                    Status: {card.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/caution-cards" className="view-all">
            View All Caution Cards
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Recent Reports</h2>
          {reports?.data.length === 0 ? (
            <p>No reports found</p>
          ) : (
            <ul>
              {reports?.data.map(report => (
                <li key={report.id}>
                  <Link to={`/reports/${report.id}`}>
                    {report.type}: {report.file_name}
                  </Link>
                  <span className="meta">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/reports" className="view-all">
            View All Reports
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/patients/new" className="action-button">
              Add New Patient
            </Link>
            <Link to="/caution-cards/upload" className="action-button">
              Upload Caution Card
            </Link>
            <Link to="/reports/upload" className="action-button">
              Upload Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}; 