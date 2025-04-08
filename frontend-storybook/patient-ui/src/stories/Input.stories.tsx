import type { Meta, StoryObj } from '@storybook/react';
import { Input, InputProps } from '../components/common/Input';

const meta: Meta<InputProps> = {
  title: 'Common/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    hint: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    type: {
      control: {
        type: 'select',
      },
      options: ['text', 'password', 'email', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    onChange: { action: 'changed' },
    onFocus: { action: 'focused' },
    onBlur: { action: 'blurred' },
  },
};

export default meta;
type Story = StoryObj<InputProps>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Password',
    hint: 'Must be at least 8 characters',
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Username',
    error: 'Username already exists',
    placeholder: 'Enter username',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'You cannot edit this field',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    label: 'Address',
    placeholder: 'Enter your address',
    fullWidth: true,
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    leftIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    rightIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
}; 