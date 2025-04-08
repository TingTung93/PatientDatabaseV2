import React from 'react';
import { Card, Descriptions, Tag, Space, Button, Image } from 'antd';
import { EditOutlined, LinkOutlined } from '@ant-design/icons';
import type { CautionCard } from '../../types/cautionCard';
import { formatDate } from '../../utils/dateUtils';

interface CautionCardDetailsProps {
  card: CautionCard;
  onEdit?: () => void;
  onLinkPatient?: () => void;
}

export const CautionCardDetails: React.FC<CautionCardDetailsProps> = ({
  card,
  onEdit,
  onLinkPatient,
}) => {
  return (
    <Card
      title="Caution Card Details"
      extra={
        <Space>
          {onEdit && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Edit
            </Button>
          )}
          {onLinkPatient && !card.patient_id && (
            <Button icon={<LinkOutlined />} onClick={onLinkPatient}>
              Link to Patient
            </Button>
          )}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Image
          src={`/api/v1/caution-cards/${card.id}/image`}
          alt="Caution Card"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Space>
    </Card>
  );
};
