import type { Meta, StoryObj } from '@storybook/react';
import { message } from 'antd';
import { ReportAttachments } from '../components/reports/ReportAttachments';
import { ReportAttachment } from '../types/report'; // Correct import path

const meta = {
  title: 'Components/ReportAttachments',
  component: ReportAttachments,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ReportAttachments>;

export default meta;
type Story = StoryObj<typeof meta>;

// Update mock data to match ReportAttachment from report.ts
const mockAttachments: ReportAttachment[] = [
  {
    id: 'att-1', // Use string or number
    name: 'blood-test-results.pdf', // Use 'name'
    type: 'application/pdf',
    size: 1024576, // 1MB
    uploaded_at: '2024-03-15T10:30:00Z', // Use 'uploaded_at'
    url: 'https://example.com/files/blood-test-results.pdf',
  },
  {
    id: 'att-2', // Use string or number
    name: 'x-ray-scan.jpg', // Use 'name'
    type: 'image/jpeg',
    size: 2048576, // 2MB
    uploaded_at: '2024-03-15T11:15:00Z', // Use 'uploaded_at'
    url: 'https://example.com/files/x-ray-scan.jpg',
  },
];

export const Default: Story = {
  args: {
    attachments: mockAttachments,
    onDownload: attachment => {
      console.log('Downloading:', attachment.name); // Use 'name'
    },
  },
};

export const Empty: Story = {
  args: {
    attachments: [],
    onDownload: attachment => {
      console.log('Downloading:', attachment.name); // Use 'name'
    },
  },
};

export const WithDownloadHandler: Story = {
  args: {
    attachments: mockAttachments,
    onDownload: attachment => {
      message.info(`Downloading ${attachment.name}...`); // Use 'name'
      // Simulate download delay
      setTimeout(() => {
        message.success(`${attachment.name} downloaded successfully`); // Use 'name'
      }, 1000);
    },
  },
};

export const WithDownloadError: Story = {
  args: {
    attachments: mockAttachments,
    onDownload: attachment => {
      message.error(`Failed to download ${attachment.name}`); // Use 'name'
    },
  },
};

export const ReadOnly: Story = {
  args: {
    attachments: mockAttachments,
    readOnly: true,
  },
};

// Note: For upload functionality, use the ReportAttachmentsManager component instead
// See ReportAttachmentsManager.stories.tsx for upload-related stories
