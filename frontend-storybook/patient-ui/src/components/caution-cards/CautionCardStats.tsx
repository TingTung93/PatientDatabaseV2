import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, WarningOutlined, LinkOutlined } from '@ant-design/icons';
import type { CautionCard } from '../../types/cautionCard';

interface CautionCardStatsProps {
  cards: CautionCard[];
  loading?: boolean;
}

export const CautionCardStats: React.FC<CautionCardStatsProps> = ({ cards, loading = false }) => {
  const totalCards = cards.length;
  const reviewedCards = cards.filter(card => card.status === 'reviewed').length;
  const linkedCards = cards.filter(card => card.patient_id).length;
  const reviewedPercentage = totalCards ? Math.round((reviewedCards / totalCards) * 100) : 0;
  const linkedPercentage = totalCards ? Math.round((linkedCards / totalCards) * 100) : 0;

  const bloodTypeDistribution = cards.reduce((acc, card) => {
    const bloodType = card.blood_type || 'Unknown';
    acc[bloodType] = (acc[bloodType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card loading={loading}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Statistic
            title="Total Cards"
            value={totalCards}
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Reviewed"
            value={reviewedCards}
            prefix={<CheckCircleOutlined />}
            suffix={`/ ${totalCards}`}
          />
          <Progress percent={reviewedPercentage} />
        </Col>
        <Col span={6}>
          <Statistic
            title="Linked to Patients"
            value={linkedCards}
            prefix={<LinkOutlined />}
            suffix={`/ ${totalCards}`}
          />
          <Progress percent={linkedPercentage} />
        </Col>
        <Col span={6}>
          <Statistic
            title="Pending Review"
            value={totalCards - reviewedCards}
            prefix={<WarningOutlined />}
            suffix={`/ ${totalCards}`}
          />
        </Col>
      </Row>

      <Card title="Blood Type Distribution" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(bloodTypeDistribution).map(([type, count]) => (
            <Col span={6} key={type}>
              <Statistic
                title={type}
                value={count}
                suffix={`(${Math.round((count / totalCards) * 100)}%)`}
              />
            </Col>
          ))}
        </Row>
      </Card>
    </Card>
  );
}; 