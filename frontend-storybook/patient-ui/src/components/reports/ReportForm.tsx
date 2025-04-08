import React from 'react';
import { Form, Input, Select, Button } from 'antd';
import { Report, ReportStatus, ReportType } from '../../types/report'; // Correct path (singular)
import { ReportAttachments } from './ReportAttachments';

const { TextArea } = Input;

interface ReportFormProps {
  initialValues?: Partial<Report>;
  onSubmit: (values: Partial<Report>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Define allowed values for selects
// Define allowed values for selects based on the type alias
// Define allowed values for selects based on the ReportType alias
const allowedReportTypes: ReportType[] = ['pdf', 'docx', 'txt', 'csv', 'xlsx'];
const allowedReportStatuses: ReportStatus[] = ['pending', 'processing', 'completed', 'error'];

export const ReportForm: React.FC<ReportFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      status: values.status || 'pending', // Use string literal, assuming DRAFT maps to pending
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues || {}} // Provide default empty object
      onFinish={handleSubmit}
      className="max-w-2xl"
    >
      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: 'Please enter a title' }]}
      >
        <Input placeholder="Enter report title" />
      </Form.Item>

      <Form.Item
        name="report_type"
        label="Report Type"
        rules={[{ required: true, message: 'Please select a report type' }]}
      >
        <Select placeholder="Select report type">
          {allowedReportTypes.map(type => (
            <Select.Option key={type} value={type}>
              {type} {/* Display the string value */}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="content"
        label="Content"
        rules={[{ required: true, message: 'Please enter report content' }]}
      >
        <TextArea rows={6} placeholder="Enter report content" />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        initialValue={'pending'} // Use string literal, assuming DRAFT maps to pending
      >
        <Select>
          {allowedReportStatuses.map(status => (
            <Select.Option key={status} value={status}>
              {status} {/* Display the string value */}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="attachments" label="Attachments">
        <ReportAttachments
          attachments={form.getFieldValue('attachments') || initialValues?.attachments || []}
        />
      </Form.Item>

      <Form.Item className="flex justify-end">
        <Button onClick={onCancel} className="mr-2">
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          {initialValues ? 'Update Report' : 'Create Report'}
        </Button>
      </Form.Item>
    </Form>
  );
};
