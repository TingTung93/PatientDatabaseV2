import React from 'react';
import { Card, Form, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface FilterValues {
  search?: string;
  status?: string[];
  bloodType?: string[];
  antibodies?: string[];
  transfusionRequirements?: string[];
  dateRange?: [Dayjs, Dayjs];
}

interface CautionCardFilterProps {
  onFilter: (values: FilterValues) => void;
  loading?: boolean;
}

export const CautionCardFilter: React.FC<CautionCardFilterProps> = ({
  onFilter,
  loading = false
}) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    form.resetFields();
    onFilter({});
  };

  const handleFinish = (values: FilterValues) => {
    onFilter(values);
  };

  return (
    <Card title="Advanced Filter">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item name="search" label="Search">
          <Input
            placeholder="Search by ID, notes, or OCR text..."
            prefix={<SearchOutlined />}
            allowClear
          />
        </Form.Item>

        <Form.Item name="status" label="Status">
          <Select
            mode="multiple"
            placeholder="Select status"
            allowClear
          >
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="REVIEWED">Reviewed</Select.Option>
            <Select.Option value="LINKED">Linked to Patient</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="bloodType" label="Blood Type">
          <Select
            mode="multiple"
            placeholder="Select blood type"
            allowClear
          >
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
          <Select
            mode="multiple"
            placeholder="Select antibodies"
            allowClear
          >
            <Select.Option value="Anti-K">Anti-K</Select.Option>
            <Select.Option value="Anti-D">Anti-D</Select.Option>
            <Select.Option value="Anti-E">Anti-E</Select.Option>
            <Select.Option value="Anti-c">Anti-c</Select.Option>
            <Select.Option value="Anti-M">Anti-M</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="transfusionRequirements" label="Transfusion Requirements">
          <Select
            mode="multiple"
            placeholder="Select requirements"
            allowClear
          >
            <Select.Option value="Washed">Washed</Select.Option>
            <Select.Option value="Irradiated">Irradiated</Select.Option>
            <Select.Option value="Leukoreduced">Leukoreduced</Select.Option>
            <Select.Option value="CMV Negative">CMV Negative</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="dateRange" label="Date Range">
          <RangePicker
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              htmlType="submit"
              loading={loading}
            >
              Apply Filters
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}; 