export interface ChatAttachment {
  type: 'image';
  uri: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  attachments?: ChatAttachment[];
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
}