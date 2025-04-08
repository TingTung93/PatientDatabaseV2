import type { Meta, StoryObj } from '@storybook/react';
import { Button, ButtonProps } from '../components/common/Button';

const meta: Meta<ButtonProps> = {
  title: 'Common/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: {
        type: 'select',
      },
      options: ['primary', 'secondary', 'danger', 'success', 'warning', 'info', 'text'],
    },
    size: {
      control: {
        type: 'select',
      },
      options: ['sm', 'md', 'lg'],
    },
    fullWidth: {
      control: {
        type: 'boolean',
      },
    },
    isLoading: {
      control: {
        type: 'boolean',
      },
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<ButtonProps>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success Button',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning Button',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Info Button',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'Text Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Loading Button',
  },
};

export const WithLeftIcon: Story = {
  args: {
    leftIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    children: 'Button with Left Icon',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    ),
    children: 'Button with Right Icon',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};
