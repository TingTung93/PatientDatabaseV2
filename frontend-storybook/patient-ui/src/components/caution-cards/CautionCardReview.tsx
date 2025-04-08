import { Card, Form, Input, Button, Space, message } from 'antd';
import { useMarkCautionCardAsReviewed } from '../../hooks/useCautionCards';
import type { CautionCard } from '../../types/cautionCard';

interface ReviewData {
  id: string; // Change id type to string
  reviewedBy: string;
  updatedBy: string; // Add updatedBy
  notes?: string; // Add optional notes based on ReviewCardParams
}

interface CautionCardReviewProps {
  card: CautionCard;
  onCancel: () => void;
  onSuccess?: () => void;
  currentUser: string;
}

export const CautionCardReview: React.FC<CautionCardReviewProps> = ({
  card,
  onCancel,
  onSuccess,
  currentUser,
}): JSX.Element => {
  const [form] = Form.useForm();
  const { mutate, isPending } = useMarkCautionCardAsReviewed();

  const handleSubmit = async (values: { comments: string }): Promise<void> => {
    try {
      // Restructure data for the mutation hook
      const mutationPayload = {
        id: String(card.id), // Extract ID
        data: {
          reviewedBy: currentUser, // Only include reviewedBy in data
          // notes: values.comments, // Notes might not be supported here, remove if causing errors
        },
      };

      await mutate(mutationPayload, {
        // Pass the structured payload
        onSuccess: () => {
          message.success('Caution card reviewed successfully');
          onSuccess?.();
        },
        onError: (error: Error) => {
          // Add Error type
          message.error('Failed to review caution card');
          console.error('Review error:', error);
        },
      });
    } catch (err) {
      message.error('An unexpected error occurred');
      console.error('Submit error:', err);
    }
  };

  return (
    <Card title="Review Caution Card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <h4>Blood Type</h4>
          <p>{card.blood_type || 'Not specified'}</p>
        </div>

        <div>
          <h4>Antibodies</h4>
          <p>{card.antibodies?.join(', ') || 'None'}</p>
        </div>

        <div>
          <h4>Transfusion Requirements</h4>
          <p>{card.transfusion_requirements?.join(', ') || 'None'}</p>
        </div>

        {card.ocr_text && (
          <div>
            <h4>OCR Text</h4>
            <p>{card.ocr_text}</p>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="comments"
            label="Review Comments"
            rules={[{ required: true, message: 'Please enter review comments' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter your review comments..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPending}>
                Submit Review
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
};
