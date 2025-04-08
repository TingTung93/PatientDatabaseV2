import React from 'react';
import { Modal } from 'antd';
import { Report } from '../../types/report'; // Correct path (singular)
import { ReportForm } from './ReportForm';

interface ReportModalProps {
  visible: boolean;
  title: string;
  initialValues?: Partial<Report>;
  onSubmit: (values: Partial<Report>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  title,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <ReportForm
        initialValues={initialValues || {}} // Provide default empty object
        onSubmit={onSubmit}
        onCancel={onCancel}
        loading={loading}
      />
    </Modal>
  );
};
