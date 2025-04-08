// Base event interface
export interface BaseEvent {
  type: string;
  version: number;
  timestamp: number;
}

// Patient event interfaces
export interface PatientCreatedEvent extends BaseEvent {
  type: 'patient_created';
  data: {
    patient: {
      id: number;
      name: string;
      species: string;
      breed: string;
      bloodType: string;
      mrn: string;
    };
  };
}

export interface PatientUpdatedEvent extends BaseEvent {
  type: 'patient_updated';
  data: {
    patient: {
      id: number;
      name: string;
      species: string;
      breed: string;
      bloodType: string;
      mrn: string;
    };
  };
}

export interface PatientDeletedEvent extends BaseEvent {
  type: 'patient_deleted';
  data: {
    patientId: number;
  };
}

export interface PatientsUpdatedEvent extends BaseEvent {
  type: 'patients_updated';
  data: {
    timestamp: number;
  };
}

// OCR event interfaces
export interface OCRStartedEvent extends BaseEvent {
  type: 'ocr_started';
  data: {
    jobId: string;
    patientId: number;
  };
}

export interface OCRProgressEvent extends BaseEvent {
  type: 'ocr_progress';
  data: {
    jobId: string;
    progress: number;
  };
}

export interface OCRCompletedEvent extends BaseEvent {
  type: 'ocr_completed';
  data: {
    jobId: string;
    results: {
      extractedText: string;
      bloodType?: string;
      [key: string]: any;
    };
  };
}

export interface OCRFailedEvent extends BaseEvent {
  type: 'ocr_failed';
  data: {
    jobId: string;
    error: string;
  };
}

// Caution Card event interfaces
export interface CautionCardCreatedEvent extends BaseEvent {
  type: 'caution_card_created';
  data: {
    card: {
      id: number;
      patientId: number;
      imagePath: string;
      bloodType: string;
    };
  };
}

export interface CautionCardUpdatedEvent extends BaseEvent {
  type: 'caution_card_updated';
  data: {
    card: {
      id: number;
      patientId: number;
      imagePath: string;
      bloodType: string;
    };
  };
}

export interface CautionCardReadyForReviewEvent extends BaseEvent {
  type: 'caution_card_ready_for_review';
  data: {
    cardId: number;
  };
}

export interface CautionCardFinalizedEvent extends BaseEvent {
  type: 'caution_card_finalized';
  data: {
    cardId: number;
  };
}

// System event interfaces
export interface SystemAlertEvent extends BaseEvent {
  type: 'system_alert';
  data: {
    message: string;
    level: 'info' | 'warning' | 'error';
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: 'system_error';
  data: {
    message: string;
    code: string;
  };
}

// Union type for all events
export type WebSocketEvent =
  | PatientCreatedEvent
  | PatientUpdatedEvent
  | PatientDeletedEvent
  | PatientsUpdatedEvent
  | OCRStartedEvent
  | OCRProgressEvent
  | OCRCompletedEvent
  | OCRFailedEvent
  | CautionCardCreatedEvent
  | CautionCardUpdatedEvent
  | CautionCardReadyForReviewEvent
  | CautionCardFinalizedEvent
  | SystemAlertEvent
  | SystemErrorEvent;

// Event handler type
export type EventHandler<T extends WebSocketEvent> = (data: T['data'], event: T) => void;

// Generic event handler type
export type GenericEventHandler = (data: any, event: WebSocketEvent) => void; 