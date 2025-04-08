import React from 'react';
import { Modal, Form, Input, Select, Space, Button } from 'antd';
import type { CautionCard, CautionCardUpdateData } from '../../types/cautionCard';

const { Option } = Select;

interface CautionCardEditModalProps {
  visible: boolean;
  cautionCard: CautionCard;
  onClose: () => void;
  onUpdate: (data: CautionCardUpdateData) => Promise<void>;
  isSubmitting?: boolean;
}

export const CautionCardEditModal: React.FC<CautionCardEditModalProps> = ({
  visible,
  cautionCard,
  onClose,
  onUpdate,
  isSubmitting = false,
}): JSX.Element => {
  const [form] = Form.useForm();

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      await onUpdate(values);
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Validation or update failed:', error);
    }
  };

  React.useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        blood_type: cautionCard.blood_type,
        antibodies: cautionCard.antibodies,
        transfusion_requirements: cautionCard.transfusion_requirements,
        ocr_text: cautionCard.ocr_text,
      });
    }
  }, [visible, cautionCard, form]);

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const commonAntibodies = [
    'Anti-A',
    'Anti-B',
    'Anti-D',
    'Anti-C',
    'Anti-E',
    'Anti-K',
    'Anti-Fya',
    'Anti-Fyb',
    'Anti-Jka',
    'Anti-M',
  ];
  const commonRequirements = [
    'Washed',
    'Irradiated',
    'Leukoreduced',
    'CMV-Negative',
    'HLA-matched',
    'Antigen-matched',
  ];

  return (
    <Modal
      title="Edit Caution Card Details"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="blood_type"
          label="Blood Type"
          rules={[{ required: true, message: 'Please select a blood type' }]}
        >
          <Select placeholder="Select blood type">
            {bloodTypes.map(type => (
              <Option key={type} value={type}>
                {type}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="antibodies" label="Antibodies">
          <Select mode="tags" placeholder="Enter or select antibodies" allowClear>
            {commonAntibodies.map(antibody => (
              <Option key={antibody} value={antibody}>
                {antibody}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="transfusion_requirements" label="Transfusion Requirements">
          <Select mode="tags" placeholder="Enter or select requirements" allowClear>
            {commonRequirements.map(req => (
              <Option key={req} value={req}>
                {req}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="ocr_text" label="OCR Text">
          <Input.TextArea rows={4} placeholder="OCR extracted text" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Save Changes
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
