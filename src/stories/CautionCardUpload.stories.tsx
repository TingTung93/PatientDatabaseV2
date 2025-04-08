export const SimpleUpload: Story = {
  args: {
    onUpload: async (file: File) => {
      console.log('Processing file:', file.name);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'File processed successfully',
        cardId: 123,
      };
    },
    onUploadSuccess: () => console.log('Upload successful'),
  },
};

export const WithValidation: Story = {
  args: {
    onUpload: async (file: File) => {
      if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'File validated and processed successfully',
        cardId: 124,
      };
    },
    onUploadSuccess: () => console.log('Upload successful'),
    acceptedFileTypes: ['.pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
};

export const WithError: Story = {
  args: {
    onUpload: async () => {
      throw new Error('Failed to process file');
    },
    onUploadSuccess: () => console.log('Upload successful'),
  },
};

export const WithLoading: Story = {
  args: {
    isLoading: true,
    onUpload: async (file: File) => {
      // Simulate long processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {
        success: true,
        message: 'File processed after long wait',
        cardId: 125,
      };
    },
    onUploadSuccess: () => console.log('Upload successful'),
  },
}; 