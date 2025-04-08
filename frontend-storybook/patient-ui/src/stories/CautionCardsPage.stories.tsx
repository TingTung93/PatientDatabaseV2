import type { Meta, StoryObj } from '@storybook/react';
import { CautionCardsPage } from '../pages/CautionCardsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { mockCautionCards } from '../mocks/cautionCardMocks';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrap the component with necessary providers
const PageWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <CautionCardsPage />
  </QueryClientProvider>
);

const meta = {
  title: 'Pages/CautionCardsPage',
  component: PageWithProviders,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        // Handle GET caution cards
        http.get('/api/caution-cards', async ({ request }) => {
          const url = new URL(request.url);
          const page = Number(url.searchParams.get('page')) || 1;
          const limit = Number(url.searchParams.get('limit')) || 10;
          const status = url.searchParams.get('status');
          const search = url.searchParams.get('search');

          let filteredCards = [...mockCautionCards];

          // Apply status filter
          if (status) {
            filteredCards = filteredCards.filter((card) => card.status === status);
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            filteredCards = filteredCards.filter(
              (card) =>
                card.blood_type?.toLowerCase().includes(searchLower) ||
                card.antibodies.some((ab) =>
                  ab.toLowerCase().includes(searchLower)
                ) ||
                card.transfusion_requirements.some((req) =>
                  req.toLowerCase().includes(searchLower)
                )
            );
          }

          // Calculate pagination
          const start = (page - 1) * limit;
          const paginatedCards = filteredCards.slice(start, start + limit);

          // Use HttpResponse
          await new Promise(resolve => setTimeout(resolve, 500)); // Add delay before response
          return HttpResponse.json(
            {
              cards: paginatedCards,
              total: filteredCards.length,
            }
          );
        }),

        // Handle PUT review
        http.put('/api/caution-cards/:id/review', async ({ request, params }) => {
          const { id } = params;
          const { reviewedBy } = await request.json() as { reviewedBy: string };

          await new Promise(resolve => setTimeout(resolve, 500)); // Add delay before response
          return HttpResponse.json(
            {
              ...mockCautionCards[0],
              id: Number(id),
              status: 'reviewed',
              reviewed_by: reviewedBy,
              reviewed_date: new Date().toISOString(),
            }
          );
        }),

        // Handle PUT link to patient
        http.put('/api/caution-cards/:id/link', async ({ request, params }) => {
          const { id } = params;
          const { patientId, updatedBy } = await request.json() as {
            patientId: number;
            updatedBy: string;
          };
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Add delay before response
          return HttpResponse.json(
            {
              ...mockCautionCards[0],
              id: Number(id),
              patient_id: patientId,
              updated_by: updatedBy,
            }
          );
        }),
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/caution-cards', () => {
          return new Promise(() => {});
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/caution-cards', () => {
          return HttpResponse.json({
            cards: [],
            total: 0,
          });
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/caution-cards', () => {
          return new HttpResponse(null, { status: 500 });
        }),
      ],
    },
  },
}; 