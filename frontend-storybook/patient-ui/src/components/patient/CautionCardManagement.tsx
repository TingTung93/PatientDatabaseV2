/**
 * @module CautionCardManagement
 * @description A component for managing patient caution cards, including creating, viewing, and updating caution alerts.
 *
 * @example
 * ```tsx
 * <CautionCardManagement
 *   patientId="123"
 *   cautionCards={patientCautionCards}
 *   isLoading={false}
 *   onAdd={(data) => handleAddCaution(data)}
 *   onUpdate={(id, data) => handleUpdateCaution(id, data)}
 *   onDelete={(id) => handleDeleteCaution(id)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface CautionCard {
  id: string;
  patientId: string;
  type: 'ALLERGY' | 'MEDICATION' | 'CONDITION' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  active: boolean;
}

interface CautionCardManagementProps {
  /** The ID of the patient whose caution cards are being managed */
  patientId?: string;
  /** Array of caution cards to display */
  cautionCards?: readonly CautionCard[]; // Use readonly array for props
  /** Loading state indicator */
  isLoading?: boolean;
  /** Callback function for adding a new caution card */
  onAdd?: (data: Omit<CautionCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{
    success: boolean;
    message: string;
    cautionCard: CautionCard;
  }>;
  /** Callback function for updating a caution card */
  onUpdate?: (
    id: string,
    data: Partial<CautionCard>
  ) => Promise<{
    success: boolean;
    message: string;
    cautionCard: CautionCard;
  }>;
  /** Callback function for deleting a caution card */
  onDelete?: (id: string) => Promise<{
    success: boolean;
    message: string;
  }>;
}

interface CautionCardFormData {
  type: CautionCard['type'];
  severity: CautionCard['severity'];
  title: string;
  description: string;
}

/**
 * A component that displays a form for adding/editing caution cards
 */
const CautionCardForm: React.FC<{
  initialData?: Partial<CautionCardFormData>;
  onSubmit: (data: CautionCardFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<CautionCardFormData>({
    type: initialData?.type || 'OTHER',
    severity: initialData?.severity || 'MEDIUM',
    title: initialData?.title || '',
    description: initialData?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={e => setFormData({ ...formData, type: e.target.value as CautionCard['type'] })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="ALLERGY">Allergy</option>
          <option value="MEDICATION">Medication</option>
          <option value="CONDITION">Condition</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Severity</label>
        <select
          value={formData.severity}
          onChange={e =>
            setFormData({ ...formData, severity: e.target.value as CautionCard['severity'] })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          maxLength={100}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

/**
 * A component that displays a single caution card with actions
 */
const CautionCardItem: React.FC<{
  card: CautionCard;
  onUpdate?: (
    id: string,
    data: Partial<CautionCard>
  ) => Promise<{ success: boolean; message: string; cautionCard: CautionCard }>;
  onDelete?: (id: string) => Promise<{ success: boolean; message: string }>;
}> = ({ card, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this caution card?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete caution card');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (data: CautionCardFormData) => {
    if (!onUpdate) return;

    try {
      await onUpdate(card.id, data);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update caution card');
    }
  };

  const getSeverityColor = (severity: CautionCard['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isEditing) {
    return (
      <CautionCardForm
        initialData={card}
        onSubmit={handleUpdate}
        onCancel={() => setIsEditing(false)}
        isSubmitting={false}
      />
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(card.severity)}`}
            >
              {card.severity}
            </span>
            <span className="text-sm font-medium text-gray-500">{card.type}</span>
          </div>
          <h3 className="text-lg font-semibold">{card.title}</h3>
          <p className="text-gray-600">{card.description}</p>
          <p className="text-sm text-gray-500">
            Created by {card.createdBy} on {new Date(card.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2">
          {onUpdate && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
              disabled={isDeleting}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * The main CautionCardManagement component
 * @component
 */
export const CautionCardManagement: React.FC<CautionCardManagementProps> = ({
  patientId,
  cautionCards = [],
  isLoading = false,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async (data: CautionCardFormData) => {
    if (!onAdd || !patientId) return;

    try {
      await onAdd({
        ...data,
        patientId,
        createdBy: 'current-user', // This should come from auth context
        active: true,
      });
      setIsAdding(false);
      setAddError(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add caution card');
    }
  };

  return (
    <ErrorBoundary>
      <div className="caution-card-management p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Caution Cards</h2>
          {patientId && onAdd && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Caution Card
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mb-6">
            <CautionCardForm
              onSubmit={handleAdd}
              onCancel={() => setIsAdding(false)}
              isSubmitting={false}
            />
            {addError && (
              <div className="mt-2 text-red-600 text-sm" role="alert">
                {addError}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner size="large" message="Loading caution cards..." />
        ) : cautionCards.length > 0 ? (
          <div className="space-y-4">
            {(cautionCards || []).map(card => (
              <CautionCardItem
                key={card.id}
                card={card}
                {...(onUpdate && { onUpdate })}
                {...(onDelete && { onDelete })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No caution cards available</div>
        )}
      </div>
    </ErrorBoundary>
  );
};
