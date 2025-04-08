import React from 'react';
import { Table, Card, Space, Input, Select, Tag, Button, Alert } from 'antd';
import { useCautionCards } from '../../hooks/useCautionCards';
import { formatDate } from '../../utils/dateUtils';
import type { CautionCard } from '../../types/cautionCard';

const { Search } = Input;

export const CautionCardList: React.FC = () => {
  const [searchParams, setSearchParams] = React.useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
  });

  const { data, isLoading, error } = useCautionCards({
    page: searchParams.page,
    limit: searchParams.limit,
    status: searchParams.status,
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Blood Type',
      dataIndex: 'bloodType',
      key: 'bloodType',
      width: 100,
      render: (bloodType: string) => <Tag color="red">{bloodType}</Tag>,
    },
    {
      title: 'Antibodies',
      dataIndex: 'antibodies',
      key: 'antibodies',
      render: (antibodies: string[]) => (
        <Space size={[0, 4]} wrap>
          {antibodies?.map(antibody => (
            <Tag key={antibody} color="blue">
              {antibody}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Requirements',
      dataIndex: 'transfusionRequirements',
      key: 'transfusionRequirements',
      render: (requirements: string[]) => (
        <Space size={[0, 4]} wrap>
          {requirements?.map(req => (
            <Tag key={req} color="green">
              {req}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const color =
          status === 'REVIEWED' ? 'success' : status === 'PENDING' ? 'warning' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: CautionCard) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => window.open(`/api/v1/caution-cards/${record.id}/image`, '_blank')}
          >
            View Image
          </Button>
          <Button type="link" size="small">
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchParams(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setSearchParams(prev => ({ ...prev, status: value, page: 1 }));
  };

  const handleTableChange = (pagination: any) => {
    setSearchParams(prev => ({
      ...prev,
      page: pagination.current,
      limit: pagination.pageSize,
    }));
  };

  if (error) {
    return (
      <Card>
        <Alert message="Error" description="Failed to load caution cards" type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card title="Caution Cards">
      <Space className="mb-4" wrap>
        <Search
          placeholder="Search cards..."
          allowClear
          onSearch={handleSearch}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Filter by status"
          allowClear
          onChange={handleStatusFilter}
          style={{ width: 150 }}
        >
          <Select.Option value="PENDING">Pending</Select.Option>
          <Select.Option value="REVIEWED">Reviewed</Select.Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: searchParams.page,
          pageSize: searchParams.limit,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: total => `Total ${total} items`,
        }}
        onChange={handleTableChange}
      />
    </Card>
  );
};
