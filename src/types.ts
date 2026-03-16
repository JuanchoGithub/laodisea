
export type Difficulty = 'primaria' | 'secundaria' | 'adulto';
export type ReadingMode = 'full' | 'page';
export type Theme = 'light' | 'sepia' | 'dark';
export type Font = 'serif' | 'sans' | 'mono';

export interface ReaderSettings {
  fontSize: number;
  theme: Theme;
  font: Font;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface VocabularyItem {
  word: string;
  explanation: string;
}

export interface Chapter {
  id: number;
  title: string;
  pages: {
    number: number;
    content: string;
  }[];
  fullText: string;
}

export interface Attempt {
  timestamp: number;
  chapterId: number;
  difficulty: Difficulty;
  questions: {
    question: string;
    givenAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
  }[];
  score: number;
}

export interface UserProgress {
  difficulty: Difficulty;
  attempts: Attempt[];
  lastRead: {
    full: { chapterId: number };
    page: { chapterId: number; pageIndex: number };
  };
}
