# Project Tasks: Frontend Implementation for Patient Information API

**Complexity Level:** 4

## 1. Goal
Create a functional frontend interface for the Patient Information API, including Patient, Report, and Caution Card management based on `API_DOCUMENTATION.md` and user clarifications.

## 2. Creative Design Decisions (Summary)

*   **Overall Layout:** Combined Sidebar (Primary Navigation: Patients, Reports, Cards) + Top Bar (User Profile/Logout, potentially Global Search). Implemented in `Layout.tsx`, `Sidebar.tsx`, `TopBar.tsx`.
*   **Patient Form (`PatientFormPage.tsx`):** Sectioned layout. Includes LAST NAME, FIRST NAME, MRN, Blood Type, Comments. Phenotype (Grid Input) and Antibodies (Tag Input) are conditionally editable (editable only if no Caution Card linked, otherwise read-only). *Requires backend API changes to Patient model/endpoint to store/retrieve Phenotype and Antibodies.*
*   **Report Upload:** Modal dialog triggered from relevant pages. Inputs for file, report type (dropdown), and optional patient search/selection. Uses `uploadService.uploadReport`.
*   **Caution Card Upload:** Simplified modal dialog triggered from relevant pages. Input only for the file. Backend handles OCR processing via `/caution-cards/process`. Uses simplified `uploadService.uploadCautionCard`.
*   **Linking Interface (Orphaned Cards):** Button on orphaned card list opens a modal. Modal includes patient search input. Uses `POST /caution-cards/:id/link`.

## 3. Implementation Plan (Phased)

### Phase 1: Core Patient Management (Current Focus)
*   [X] **Setup API Layer:** Create `src/api/client.ts`, `src/api/patientService.ts`.
*   [X] **Setup Hooks:** Create `src/hooks/usePatients.ts` (queries/mutations).
*   [X] **Implement Layout:**
    *   [X] Create `src/components/common/Sidebar.tsx`.
    *   [X] Create `src/components/common/TopBar.tsx`.
    *   [X] Update `src/components/common/Layout.tsx` to use Sidebar and TopBar.
*   [X] **Implement Patient List (`PatientsPage.tsx`):**
    *   [X] Use `usePatients` hook.
    *   [X] Render data in a table.
    *   [X] Add `Pagination` component (create if needed).
    *   [X] Add basic `SearchBar` component (create if needed).
    *   [X] Link to detail/new pages.
*   [X] **Implement Patient Detail (`PatientDetailPage.tsx`):**
    *   [X] Use `usePatient` hook.
    *   [X] Display basic patient fields (from current API model).
    *   [X] Add Edit/Delete buttons (placeholder functionality initially).
*   [X] **Implement Patient Form (`PatientFormPage.tsx` - Basic Structure):**
    *   [X] Use `usePatient` (edit), `useCreatePatient`, `useUpdatePatient`.
    *   [X] Set up `Formik` and `Yup`.
    *   [X] Create inputs for basic fields (Name, MRN, Blood Type, Comments/Notes).
    *   [X] Handle form submission for basic fields.
    *   [X] Implement "Cancel" navigation.
*   [X] **Implement Delete (Basic):**
    *   [X] Use `useDeletePatient` hook.
    *   [X] Add `ConfirmationModal` (create if needed).
    *   [X] Basic button implementation on detail/list page.

### Phase 2: Report Management
*   [X] Implement `reportService`, `uploadService` (report part), relevant hooks.
*   [X] Create `ReportsPage.tsx` (list all reports, filtering).
*   [X] Implement `ReportUploadModal.tsx`.
*   [X] Display reports list on `PatientDetailPage.tsx`.
*   [X] Implement report status updates, attachments (optional).
*   [X] Implement linking reports to patients (optional).

### Phase 3: Caution Card Management & Advanced Patient Form
*   [x] Implement `cautionCardService`, `uploadService` (card part), relevant hooks.
*   [x] Implement `CautionCardsPage.tsx` (list all/orphaned, filtering, search).
*   [x] Implement `CautionCardUploadModal.tsx` (simplified version).
*   [x] Implement Linking Interface (`LinkCardToPatientModal.tsx`, orphaned list view).
*   [x] **Update `PatientFormPage.tsx`:**
    *   [x] Implement conditional rendering logic based on linked cards.
    *   [x] Implement `PhenotypeInputGrid`, `PhenotypeDisplay`, `AntibodyInput`, `AntibodyDisplay`.
    *   [x] Integrate Phenotype/Antibody data with Formik state.
    *   [x] **Requires corresponding backend API changes.**
*   [x] Display caution cards on `PatientDetailPage.tsx`.
*   [x] Implement review marking, deletion for cards.

### Phase 4: Refinement & Polish
*   [x] Enhance code organization and remove duplicates:
    *   [x] Clean up `PatientDetailPage.tsx`
    *   [x] Standardize on Material-UI styling
*   [ ] Enhance search/filtering capabilities:
    *   [ ] Add advanced filters to patient list
    *   [ ] Implement global search in TopBar
    *   [ ] Add date range filters for reports
*   [ ] Improve UI/UX:
    *   [x] Add loading skeletons for better loading states
    *   [x] Implement error boundaries
    *   [x] Add success/error toasts for actions
*   [ ] Performance optimizations:
    *   [ ] Implement React.memo for list items
    *   [ ] Add pagination caching
    *   [ ] Optimize re-renders
*   [ ] Testing:
    *   [ ] Set up Jest and React Testing Library
    *   [ ] Write unit tests for hooks
    *   [ ] Write integration tests for forms
    *   [ ] Add E2E tests for critical flows

## 4. Dependencies Required (Check/Install)
*   `formik`
*   `yup`
*   `date-fns` (or other date utility)
*   `react-icons` (optional, for UI)
*   `react-dropzone` (optional, for uploads)
*   Tag input library (e.g., `react-select` in creatable mode or dedicated library)

## 5. Notes
*   Backend API changes are required for storing/retrieving Phenotype and Antibodies directly on the Patient record as designed in the Patient Form's editable state. 