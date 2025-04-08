import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { ReportAttachment } from '../../types/report';

export interface ReportAttachmentsProps {
  attachments: ReportAttachment[];
  onDownload?: (attachment: ReportAttachment) => void;
  readOnly?: boolean;
}

export const ReportAttachments: React.FC<ReportAttachmentsProps> = ({
  attachments,
  onDownload,
  readOnly = false,
}) => {
  if (attachments.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No attachments available
        </Typography>
      </Box>
    );
  }

  return (
    <List dense>
      {attachments.map(attachment => (
        <ListItem key={attachment.id}>
          <ListItemText
            primary={attachment.name}
            secondary={new Date(attachment.uploaded_at).toLocaleString()}
          />
          {!readOnly && onDownload && (
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="download"
                onClick={() => onDownload(attachment)}
                size="small"
              >
                <DownloadIcon />
              </IconButton>
            </ListItemSecondaryAction>
          )}
        </ListItem>
      ))}
    </List>
  );
};
