import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Snackbar, Alert } from '@mui/material';
import { ReportAttachments } from '../components/reports/ReportAttachments';
import { ReportAttachment } from '../types/report';

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

const mockAttachments: ReportAttachment[] = [
  {
    id: 'att-1',
    name: 'blood-test-results.pdf',
    type: 'application/pdf',
    size: 1024576,
    uploaded_at: '2024-03-15T10:30:00Z',
    url: 'https://example.com/files/blood-test-results.pdf',
  },
  {
    id: 'att-2',
    name: 'x-ray-scan.jpg',
    type: 'image/jpeg',
    size: 2048576,
    uploaded_at: '2024-03-15T11:15:00Z',
    url: 'https://example.com/files/x-ray-scan.jpg',
  },
];

export const Default: Story = {
  args: {
    attachments: mockAttachments,
    onDownload: attachment => {
      console.log('Downloading:', attachment.name);
    },
  },
};

export const Empty: Story = {
  args: {
    attachments: [],
    onDownload: attachment => {
      console.log('Downloading:', attachment.name);
    },
  },
};

export const WithDownloadHandler: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [severity, setSeverity] = React.useState<'success' | 'info'>('info');

    const handleDownload = (attachment: ReportAttachment) => {
      setMessage(`Downloading ${attachment.name}...`);
      setSeverity('info');
      setOpen(true);
      
      // Simulate download delay
      setTimeout(() => {
        setMessage(`${attachment.name} downloaded successfully`);
        setSeverity('success');
      }, 1000);
    };

    return (
      <>
        <ReportAttachments {...args} onDownload={handleDownload} />
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={severity} onClose={() => setOpen(false)}>
            {message}
          </Alert>
        </Snackbar>
      </>
    );
  },
  args: {
    attachments: mockAttachments,
  },
};

export const WithDownloadError: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleDownload = (attachment: ReportAttachment) => {
      setMessage(`Failed to download ${attachment.name}`);
      setOpen(true);
    };

    return (
      <>
        <ReportAttachments {...args} onDownload={handleDownload} />
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setOpen(false)}>
            {message}
          </Alert>
        </Snackbar>
      </>
    );
  },
  args: {
    attachments: mockAttachments,
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
