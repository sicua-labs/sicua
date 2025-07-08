/**
 * Types for progress tracking
 */

// Progress tracking types
export interface ProgressStep {
  description: string;
  completed: boolean;
  startTime: number;
  duration: number;
}
