# Patient Information System - Backend

This is the backend for the Patient Information System, providing both REST API and real-time WebSocket functionality.

## Features

- RESTful API for patient information management
- Real-time WebSocket events for updates using Socket.IO
- Hybrid persistence model for reliable event delivery
- Client-side demo page for WebSocket testing

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=sqlite:./database.sqlite
   EVENTS_DATABASE=sqlite:./events.sqlite
   FRONTEND_URL=http://localhost:3000
   ```

3. Initialize the database:
   ```
   node src/database/init.js
   ```

## Running the Application

Start the server:
```
npm start
```

Or in development mode with auto-restart:
```
npm run dev
```

## Documentation for Frontend Developers

Comprehensive documentation for frontend developers integrating with this API is available in the [API.md](./API.md) file. This includes:

- Complete REST API endpoints with request/response formats
- WebSocket integration instructions
- Event types and formats
- Code examples for common integration scenarios

## WebSocket Demo

A simple WebSocket demo is available to test the real-time functionality:

1. Start the server as described above
2. Open your browser and navigate to `http://localhost:5000`
3. Use the interface to connect, subscribe to events, and see real-time updates

## Available Real-time Events

The system supports the following event types:

### Patient Events
- `patient_created` - When a new patient is created
- `patient_updated` - When patient information is updated
- `patient_deleted` - When a patient is deleted
- `patients_updated` - When multiple patients are updated in batch

### OCR Events
- `ocr_started` - When OCR processing begins
- `ocr_progress` - Updates during OCR processing
- `ocr_completed` - When OCR processing completes
- `ocr_failed` - When OCR processing fails

### Caution Card Events
- `caution_card_created` - When a new caution card is created
- `caution_card_updated` - When a caution card is updated
- `caution_card_ready_for_review` - When OCR processing completes and the card is ready for review
- `caution_card_finalized` - When a caution card is finalized

### System Events
- `system_alert` - General system alerts
- `system_error` - System errors

## WebSocket Client Library

The system provides a client-side WebSocket library (`/public/websocket-client.js`) that simplifies integration with the real-time API. See the [API.md](./API.md) file for usage examples and complete documentation. 