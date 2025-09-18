export interface Recipient {
  email: string;
  name: string;
  [key: string]: string;
}

export interface EmailTemplate {
  content: string;
  variables: string[];
}

export interface FileUploadState {
  template: File | null;
  recipients: File | null;
  attachments: File[];
}

export interface Attachment {
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'other';
}