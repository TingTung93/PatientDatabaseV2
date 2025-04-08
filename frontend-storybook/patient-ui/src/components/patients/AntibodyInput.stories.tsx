import type { Meta, StoryObj } from '@storybook/react';
import { AntibodyInput } from './AntibodyInput';
import { action } from '@storybook/addon-actions';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

const meta: Meta<typeof AntibodyInput> = {
  title: 'Patient/AntibodyInput',
  component: AntibodyInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof AntibodyInput>;

// Empty state
export const Empty: Story = {
  args: {
    value: [],
    onChange: action('onChange'),
  },
};

// With pre-selected antibodies
export const WithPreselected: Story = {
  args: {
    value: ['Anti-D', 'Anti-K', 'Anti-Fya'],
    onChange: action('onChange'),
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    value: ['Anti-D', 'Anti-K'],
    onChange: action('onChange'),
    disabled: true,
  },
};

// Adding from suggestions
export const AddFromSuggestions: Story = {
  args: {
    value: [],
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the input
    const input = canvas.getByPlaceholderText(/type to add antibodies/i);
    await userEvent.click(input);

    // Type to filter suggestions
    await userEvent.type(input, 'K');

    // Wait for and click the suggestion
    const suggestion = await canvas.findByText('Anti-K');
    await userEvent.click(suggestion);

    // Verify the chip is added
    const chip = await canvas.findByText('Anti-K');
    expect(chip).toBeInTheDocument();
  },
};

// Adding custom antibody
export const AddCustomAntibody: Story = {
  args: {
    value: [],
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the input
    const input = canvas.getByPlaceholderText(/type to add antibodies/i);
    await userEvent.click(input);

    // Type a custom antibody
    await userEvent.type(input, 'Anti-Xyz{enter}');

    // Verify the chip is added
    const chip = await canvas.findByText('Anti-Xyz');
    expect(chip).toBeInTheDocument();
  },
};

// Adding multiple antibodies
export const AddMultiple: Story = {
  args: {
    value: [],
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the input
    const input = canvas.getByPlaceholderText(/type to add antibodies/i);

    // Add from suggestions
    await userEvent.click(input);
    await userEvent.type(input, 'K');
    const suggestionK = await canvas.findByText('Anti-K');
    await userEvent.click(suggestionK);

    // Add custom antibody
    await userEvent.type(input, 'Anti-Xyz{enter}');

    // Add another from suggestions
    await userEvent.type(input, 'D');
    const suggestionD = await canvas.findByText('Anti-D');
    await userEvent.click(suggestionD);

    // Verify all chips are added
    const chipK = await canvas.findByText('Anti-K');
    const chipXyz = await canvas.findByText('Anti-Xyz');
    const chipD = await canvas.findByText('Anti-D');
    expect(chipK).toBeInTheDocument();
    expect(chipXyz).toBeInTheDocument();
    expect(chipD).toBeInTheDocument();
  },
};

// Removing antibodies
export const RemoveAntibodies: Story = {
  args: {
    value: ['Anti-D', 'Anti-K', 'Anti-Fya'],
    onChange: action('onChange'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and click the delete button on the first chip
    const deleteButtons = canvas.getAllByRole('button', { name: /delete/i });
    const firstDeleteButton = deleteButtons[0];
    // Add check before clicking
    if (!firstDeleteButton) throw new Error('Delete button not found');
    await userEvent.click(firstDeleteButton);

    // Verify the chip is removed
    const remainingChips = canvas.getAllByRole('button', { name: /delete/i });
    expect(remainingChips).toHaveLength(2);
  },
};

// With many antibodies
export const WithManyAntibodies: Story = {
  args: {
    value: [
      'Anti-D',
      'Anti-C',
      'Anti-c',
      'Anti-E',
      'Anti-e',
      'Anti-K',
      'Anti-k',
      'Anti-Kpa',
      'Anti-Kpb',
      'Anti-Fya',
      'Anti-Fyb',
      'Anti-Jka',
      'Anti-Jkb',
      'Anti-M',
      'Anti-N',
      'Anti-S',
      'Anti-s',
    ],
    onChange: action('onChange'),
  },
};
