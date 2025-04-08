import type { Meta, StoryObj } from '@storybook/react';

import { CautionCardUpload } from './CautionCardUpload';

const meta = {
  component: CautionCardUpload,
} satisfies Meta<typeof CautionCardUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    acceptedFileTypes: ['.jpg', '.png', '.tiff', '.bmp']
  }
};