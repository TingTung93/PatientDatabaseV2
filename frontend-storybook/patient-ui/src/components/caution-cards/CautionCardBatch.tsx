import React from 'react';
import { Card, Form, Select, Button, Space, Alert, message } from 'antd';
import {
  useMarkCautionCardAsReviewed,
  useLinkCautionCardToPatient,
} from '../../hooks/useCautionCards';
import type { CautionCard } from '../../types/cautionCard';

interface CautionCardBatchProps {
  selectedCards: CautionCard[];
  onSuccess?: () => void;
  onCancel: () => void;
  currentUser: string; // Assuming this is the username/identifier string
}

type BatchAction = 'review' | 'link' | 'delete'; // 'delete' might be added later

export const CautionCardBatch: React.FC<CautionCardBatchProps> = ({
  selectedCards,
  onSuccess,
  onCancel,
  currentUser,
}): JSX.Element => {
  const [form] = Form.useForm();
  const reviewMutation = useMarkCautionCardAsReviewed();
  const linkMutation = useLinkCautionCardToPatient();

  const handleSubmit = async (values: {
    action: BatchAction;
    patientId?: number;
  }): Promise<void> => {
    // Validate currentUser exists
    if (!currentUser) {
      message.error('Current user information is missing.');
      return;
    }

    try {
      const promises = selectedCards.map(card => {
        switch (values.action) {
          case 'review':
            // Correct parameters for review mutation
            return reviewMutation.mutateAsync({
              id: String(card.id), // Convert ID to string
              data: {
                // Nest data under 'data' property
                reviewedBy: currentUser, // Change to reviewedBy
              },
            });
          case 'link':
            if (values.patientId === undefined || values.patientId === null) {
              // Check for undefined or null
              throw new Error('Patient ID is required for linking');
            }
            // Correct parameters for link mutation
            return linkMutation.mutateAsync({
              id: String(card.id), // Use 'id' instead of 'cardId', convert to string
              data: {
                // Nest data under 'data' property
                patientId: String(values.patientId), // Convert patientId to string
                updatedBy: currentUser,
              },
            });
          default:
            // Handle potential future actions or throw error
            console.warn(`Unsupported batch action: ${values.action}`);
            return Promise.reject(new Error(`Invalid action: ${values.action}`));
        }
      });

      await Promise.all(promises);
      message.success(`Successfully processed ${selectedCards.length} cards`);
      onSuccess?.();
      form.resetFields(); // Reset form after success
    } catch (error) {
      message.error(
        `Failed to process batch operation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Batch operation error:', error);
    }
  };

  return (
    <Card title="Batch Operations">
      <Alert
        message={`Selected ${selectedCards.length} cards`}
        type="info"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ action: undefined, patientId: undefined }} // Set initial values
      >
        <Form.Item
          name="action"
          label="Action"
          rules={[{ required: true, message: 'Please select an action' }]}
        >
          <Select placeholder="Select action">
            <Select.Option value="review">Mark as Reviewed</Select.Option>
            <Select.Option value="link">Link to Patient</Select.Option>
            {/* Add other actions like delete here if needed */}
          </Select>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.action !== curr.action}>
          {({ getFieldValue }) =>
            getFieldValue('action') === 'link' && (
              <Form.Item
                name="patientId"
                label="Patient ID"
                // Ensure rules match expected type (number before conversion)
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                <Select
                  showSearch
                  placeholder="Search or select patient ID"
                  optionFilterProp="children"
                  // TODO: Implement patient search/fetch for options
                  // filterOption={(input, option) => ...}
                  // onSearch={handlePatientSearch}
                >
                  {/* Replace with actual patient data source */}
                  <Select.Option value={1}>Patient #1 (ID: 1)</Select.Option>
                  <Select.Option value={2}>Patient #2 (ID: 2)</Select.Option>
                  <Select.Option value={123}>Patient #123 (ID: 123)</Select.Option>
                </Select>
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              // Use isPending for React Query v5
              loading={reviewMutation.isPending || linkMutation.isPending}
              disabled={!form.getFieldValue('action')} // Disable if no action selected
            >
              Process Batch
            </Button>
            <Button
              onClick={onCancel}
              disabled={reviewMutation.isPending || linkMutation.isPending}
            >
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
