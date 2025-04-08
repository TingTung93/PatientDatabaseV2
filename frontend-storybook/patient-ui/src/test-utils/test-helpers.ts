import { expect } from '@storybook/jest';
import { within, userEvent } from '@storybook/testing-library';
import { Page } from '@playwright/test';

export const waitForElement = async (page: Page, selector: string, timeout = 5000) => {
  return await page.waitForSelector(selector, { timeout });
};

export const fillPatientForm = async (canvasElement: HTMLElement, data: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'O';
  bloodType?: 'A' | 'B' | 'AB' | 'O';
  rhFactor?: '+' | '-';
}) => {
  const canvas = within(canvasElement);

  if (data.firstName) {
    await userEvent.type(canvas.getByLabelText(/first name/i), data.firstName);
  }
  
  if (data.lastName) {
    await userEvent.type(canvas.getByLabelText(/last name/i), data.lastName);
  }
  
  if (data.dateOfBirth) {
    await userEvent.type(canvas.getByLabelText(/date of birth/i), data.dateOfBirth);
  }
  
  if (data.gender) {
    await userEvent.selectOptions(canvas.getByLabelText(/gender/i), data.gender);
  }
  
  if (data.bloodType) {
    await userEvent.selectOptions(canvas.getByLabelText(/blood type/i), data.bloodType);
  }
  
  if (data.rhFactor) {
    await userEvent.selectOptions(canvas.getByLabelText(/rh factor/i), data.rhFactor);
  }
};

export const expectFormValidation = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const submitButton = canvas.getByRole('button', { name: /create patient|update patient/i });
  
  await userEvent.click(submitButton);
  
  // Check for validation messages
  expect(await canvas.findByText(/first name is required/i)).toBeInTheDocument();
  expect(await canvas.findByText(/last name is required/i)).toBeInTheDocument();
  expect(await canvas.findByText(/date of birth is required/i)).toBeInTheDocument();
  expect(await canvas.findByText(/blood type is required/i)).toBeInTheDocument();
  expect(await canvas.findByText(/rh factor is required/i)).toBeInTheDocument();
}; 