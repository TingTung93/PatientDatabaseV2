import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Patient } from '../../types/patient';
import PatientListItem from './PatientListItem';

interface VirtualizedPatientListProps {
  patients: readonly Patient[]; // Use readonly array
  onDelete: (id: string | number) => void;
  isDeleting: boolean;
  deletingId?: string | number;
}

const ROW_HEIGHT = 64; // Height of each patient row [CMV]

export const VirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
  patients,
  onDelete,
  isDeleting,
  deletingId,
}) => {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const patient = patients[index];

      // Handle potential undefined patient (shouldn't happen with react-window, but satisfies TS)
      if (!patient) {
        return <div style={style}>Error: Patient data missing for index {index}</div>;
      }

      return (
        <div style={style}>
          <PatientListItem
            patient={patient} // Now guaranteed to be Patient
            onDelete={onDelete}
            isDeleting={isDeleting && deletingId === patient.id} // Safe to access patient.id
          />
        </div>
      );
    },
    [patients, onDelete, isDeleting, deletingId]
  );

  return (
    <div className="flex-1 min-h-0" style={{ height: '70vh' }}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            className="bg-white shadow rounded-lg overflow-hidden"
            height={height}
            itemCount={patients.length}
            itemSize={ROW_HEIGHT}
            width={width}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedPatientList;
