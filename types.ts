// FIX: Add 'activity-detail-view' to ViewType to allow navigation to the new component.
export type ViewType = 'pei-form-view' | 'activity-bank-view' | 'pei-list-view' | 'files-view' | 'privacy-policy-view' | 'activity-detail-view';

export interface PeiFormField {
    id: string;
    label: string;
}

export interface PeiFormSection {
    title: string;
    fields: PeiFormField[];
}

export interface PeiData {
    [key: string]: string;
}

export interface PeiRecord {
    id: string;
    alunoNome: string;
    data: PeiData;
    timestamp: string;
    aiGeneratedFields?: string[];
    smartAnalysisResults?: Record<string, any | null>;
    // FIX: Renamed 'suggestedGoalActivities' to 'goalActivities' and updated its type to align with the implementation in PeiFormView.
    goalActivities?: Record<string, Activity[]>;
}

// FIX: Define and export NewPeiRecordData type. This fixes an import error in storageService.ts.
export type NewPeiRecordData = Omit<PeiRecord, 'id' | 'timestamp' | 'alunoNome'>;

// FIX: Expanded RagFile to support different file types (text/image) and include mimeType.
export interface RagFile {
    name: string;
    type: 'text' | 'image';
    mimeType: string;
    content: string; // text content or base64 data for images
    selected: boolean;
}

export interface Activity {
    id: string;
    title: string;
    description: string;
    discipline: string;
    // FIX: Allow skills and needs to be string or string[] to handle form input and API responses correctly.
    skills: string[] | string;
    needs: string[] | string;
    goalTags: string[];
    isFavorited: boolean;
    rating: 'like' | 'dislike' | null;
    comments: string;
    sourcePeiId: string | null;
    isDUA?: boolean;
}
