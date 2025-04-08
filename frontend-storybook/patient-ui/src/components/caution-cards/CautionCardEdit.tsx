import React from 'react';
import { Form, Input, Select, Button, Card, Space, message } from 'antd';
import { useUpdateCautionCard } from '../../hooks/useCautionCards'; // Revert to original name
import type { CautionCard, CautionCardUpdateData } from '../../types/cautionCard';

interface CautionCardEditProps {
  card: CautionCard;
  onCancel: () => void;
  onSuccess?: () => void;
}

export const CautionCardEdit: React.FC<CautionCardEditProps> = ({ card, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const { mutate, isPending } = useUpdateCautionCard(); // Revert to original name

  const handleSubmit = async (values: CautionCardUpdateData) => {
    try {
      await mutate(
        {
          id: card.id,
          data: values,
        },
        {
          onSuccess: () => {
            message.success('Caution card updated successfully');
            onSuccess?.();
          },
          onError: (error: Error) => {
            // Add Error type
            message.error('Failed to update caution card');
            console.error('Update error:', error);
          },
        }
      );
    } catch (err) {
      message.error('An unexpected error occurred');
      console.error('Submit error:', err);
    }
  };

  return (
    <Card title="Edit Caution Card">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          bloodType: card.blood_type, // Use snake_case
          antibodies: card.antibodies,
          transfusionRequirements: card.transfusion_requirements, // Use snake_case
          // notes: card.notes // Property 'notes' does not exist on type 'CautionCard'.
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="bloodType"
          label="Blood Type"
          rules={[{ required: true, message: 'Please select blood type' }]}
        >
          <Select>
            <Select.Option value="A+">A+</Select.Option>
            <Select.Option value="A-">A-</Select.Option>
            <Select.Option value="B+">B+</Select.Option>
            <Select.Option value="B-">B-</Select.Option>
            <Select.Option value="AB+">AB+</Select.Option>
            <Select.Option value="AB-">AB-</Select.Option>
            <Select.Option value="O+">O+</Select.Option>
            <Select.Option value="O-">O-</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="antibodies" label="Antibodies">
          <Select mode="tags" placeholder="Enter or select antibodies">
            <Select.Option value="Anti-K">Anti-K</Select.Option>
            <Select.Option value="Anti-D">Anti-D</Select.Option>
            <Select.Option value="Anti-E">Anti-E</Select.Option>
            <Select.Option value="Anti-c">Anti-c</Select.Option>
            <Select.Option value="Anti-M">Anti-M</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="transfusionRequirements" label="Transfusion Requirements">
          <Select mode="tags" placeholder="Enter or select requirements">
            <Select.Option value="Washed">Washed</Select.Option>
            <Select.Option value="Irradiated">Irradiated</Select.Option>
            <Select.Option value="Leukoreduced">Leukoreduced</Select.Option>
            <Select.Option value="CMV Negative">CMV Negative</Select.Option>
          </Select>
        </Form.Item>

        {/* <Form.Item
          name="notes"
          label="Notes"
        >
          <Input.TextArea rows={4} placeholder="Enter any additional notes" />
        </Form.Item> */}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Save Changes
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
