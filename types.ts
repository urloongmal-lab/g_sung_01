export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface StarData {
  id: string;
  content: string; // The user's question
  answer: string; // The AI's answer
  position: Vector3;
  createdAt: string;
  topic?: string;
  embedding?: number[]; // Simulated embedding vector
  similarityScore?: number; // For visualization context
}

export enum AppState {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  VIEWING = 'VIEWING'
}

export interface ChatSession {
  streamingContent: string;
  isThinking: boolean;
}
