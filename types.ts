// FIX: Replaced incorrect file content with proper type definitions for the application.
export enum Tab {
  Nexus = 'Nexus',
  Image = 'Image',
  Video = 'Video',
  Chat = 'Chat',
  ImageEditor = 'ImageEditor',
  Story = 'Story',
  Security = 'Security',
}

export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export interface VideoHistoryItem {
  id: number;
  prompt: string;
  url: string;
  aspectRatio: VideoAspectRatio;
  style: string;
}

export interface MessagePart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string; // base64
    };
}

export interface Message {
    role: 'user' | 'model';
    parts: MessagePart[];
}

export interface ChatSession {
    id: string;
    name: string;
    messages: Message[];
    personaId: string;
    modelId: string;
}

export interface Persona {
    id: string;
    name: string;
    instruction: string;
    welcomeMessage: string;
}

export const defaultPersonas: Record<string, Persona> = {
    Nexus: {
        id: 'Nexus',
        name: 'Nexus AI (Default)',
        instruction: 'You are Nexus AI, a helpful and versatile symbiotic assistant. Be concise, knowledgeable, and friendly. Your goal is to provide accurate information and complete tasks efficiently.',
        welcomeMessage: 'Hello! I am Nexus AI. How can I assist you today?',
    },
    Creative: {
        id: 'Creative',
        name: 'Creative Muse',
        instruction: 'You are a Creative Muse, an AI specialized in brainstorming, writing, and artistic inspiration. Be imaginative, eloquent, and encouraging. Provide unique ideas and help users overcome creative blocks.',
        welcomeMessage: 'Greetings! I am your Creative Muse. What wonders shall we imagine today?',
    },
    Technical: {
        id: 'Technical',
        name: 'Code Architect',
        instruction: 'You are a Code Architect, a master of software engineering, algorithms, and system design. Provide clear, optimal, and well-explained code. Prioritize best practices, security, and performance. Explain complex technical concepts simply.',
        welcomeMessage: 'Code Architect initialized. Provide the technical challenge.',
    },
    Business: {
        id: 'Business',
        name: 'Strategic Analyst',
        instruction: 'You are a Strategic Analyst AI. You are an expert in business strategy, market analysis, and financial planning. Provide data-driven insights, create professional reports, and help users make informed business decisions. Your tone is professional and insightful.',
        welcomeMessage: 'Welcome. I am your Strategic Analyst. How can we optimize for success today?',
    }
};
