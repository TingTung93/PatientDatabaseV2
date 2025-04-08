export interface PaginatedResponse<T> {
  data: readonly T[]; // Use readonly array
  total: number;
  page: number;
  limit: number;
}
