import React, { useState } from 'react';
import { Card, Form, Select, DatePicker, Button, Space, Alert, Checkbox } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { CautionCard } from '../../types/cautionCard';

const { RangePicker } = DatePicker;

interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  dateRange?: [Dayjs, Dayjs];
  includeFields: string[];
  status?: string[];
}

interface CautionCardExportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  loading?: boolean;
  totalCards: number;
}

export const CautionCardExport: React.FC<CautionCardExportProps> = ({
  onExport,
  loading = false,
  totalCards
}) => {
  const [form] = Form.useForm();
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id',
    'blood_type',
    'status',
    'created_at'
  ]);

  const handleSubmit = async (values: any) => {
    try {
      await onExport({
        ...values,
        includeFields: selectedFields
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const availableFields = [
    { label: 'ID', value: 'id' },
    { label: 'Blood Type', value: 'blood_type' },
    { label: 'Status', value: 'status' },
    { label: 'Created Date', value: 'created_at' },
    { label: 'Updated Date', value: 'updated_at' },
    { label: 'Antibodies', value: 'antibodies' },
    { label: 'Transfusion Requirements', value: 'transfusion_requirements' },
    { label: 'Notes', value: 'notes' },
    { label: 'Patient ID', value: 'patient_id' },
    { label: 'Reviewed By', value: 'reviewed_by' },
    { label: 'Review Date', value: 'reviewed_at' }
  ];

  return (
    <Card title="Export Caution Cards">
      <Alert
        message={`${totalCards} cards available for export`}
        type="info"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          format: 'csv',
          status: ['PENDING', 'REVIEWED']
        }}
      >
        <Form.Item
          name="format"
          label="Export Format"
          rules={[{ required: true, message: 'Please select export format' }]}
        >
          <Select>
            <Select.Option value="csv">CSV</Select.Option>
            <Select.Option value="excel">Excel</Select.Option>
            <Select.Option value="pdf">PDF</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="status"
          label="Status Filter"
        >
          <Select
            mode="multiple"
            placeholder="Filter by status"
            allowClear
          >
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="REVIEWED">Reviewed</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Date Range"
        >
          <RangePicker
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Include Fields">
          <Checkbox.Group
            options={availableFields}
            value={selectedFields}
            onChange={(values) => setSelectedFields(values as string[])}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <DownloadOutlined />}
              htmlType="submit"
              loading={loading}
            >
              Export
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}; 