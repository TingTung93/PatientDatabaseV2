import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardProps } from '../components/common/Card';
import { Button } from '../components/common/Button';

const meta: Meta<CardProps> = {
  title: 'Common/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    hoverable: {
      control: 'boolean',
    },
    bordered: {
      control: 'boolean',
    },
    padding: {
      control: {
        type: 'select',
      },
      options: ['none', 'small', 'medium', 'large'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<CardProps>;

export const Default: Story = {
  args: {
    children: <p>This is a basic card component</p>,
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: <p>This card has a title</p>,
  },
};

export const WithTitleAndSubtitle: Story = {
  args: {
    title: 'Card Title',
    subtitle: 'Card subtitle with additional information',
    children: <p>This card has both a title and subtitle</p>,
  },
};

export const WithHeaderActions: Story = {
  args: {
    title: 'Card with Actions',
    headerActions: (
      <Button variant="secondary" size="sm">
        Action
      </Button>
    ),
    children: <p>This card has a button in the header</p>,
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Card with Footer',
    children: <p>This card has a footer section</p>,
    footer: (
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" size="sm">
          Cancel
        </Button>
        <Button size="sm">Save</Button>
      </div>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    title: 'Hoverable Card',
    hoverable: true,
    children: <p>Hover over this card to see the effect</p>,
  },
};

export const NoBorder: Story = {
  args: {
    title: 'Card without Border',
    bordered: false,
    children: <p>This card has no border</p>,
  },
};

export const DifferentPadding: Story = {
  args: {
    title: 'Card with Large Padding',
    padding: 'large',
    children: <p>This card has larger padding</p>,
  },
};

export const ComplexExample: Story = {
  args: {
    title: 'Patient Information',
    subtitle: 'Last updated: 2 hours ago',
    headerActions: (
      <Button variant="secondary" size="sm">
        Edit
      </Button>
    ),
    children: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">John Doe</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Species</p>
            <p className="font-medium">Canine</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Breed</p>
            <p className="font-medium">Golden Retriever</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Blood Type</p>
            <p className="font-medium">DEA 1.1-</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Notes</p>
          <p>Patient has a history of allergies to certain medications.</p>
        </div>
      </div>
    ),
    footer: (
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">ID: P123456</p>
        <div className="flex space-x-2">
          <Button variant="info" size="sm">
            View Reports
          </Button>
          <Button variant="primary" size="sm">
            Schedule Visit
          </Button>
        </div>
      </div>
    ),
    hoverable: true,
    bordered: true,
    padding: 'medium',
  },
}; 