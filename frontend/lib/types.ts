export interface FeedbackSection {
  strengths: string[];
  improvements: string[];
}

export interface Report {
  codingScore: number;
  communicationScore: number;
  decision: "HIRE" | "NO_HIRE";
  summary: string;
  codingFeedback: FeedbackSection;
  communicationFeedback: FeedbackSection;
  hintsUsed: number;
  error?: boolean;
}

// One utterance in the live conversation (streamed from LiveKit transcriptions).
export interface TranscriptSegment {
  id: string;
  speaker: "interviewer" | "you";
  text: string;
  final: boolean;
  at: number;
}

// A finished interview persisted to localStorage on this device only.
export interface HistoryEntry {
  id: string;
  date: string;
  problemId: string;
  problemTitle: string;
  durationMin: number;
  report: Report;
}

export const HISTORY_KEY = "interviewlab_history";

// Data-channel topics shared with the Python agent.
export const TOPIC_CODE_UPDATE = "code_update";
export const TOPIC_CONTROL = "control";
export const TOPIC_REPORT = "report";
// Judge outcomes stream to Alex so the interviewer reacts to red/green tests.
export const TOPIC_TEST_RESULTS = "test_results";
// LiveKit's built-in text-stream topic for speech transcriptions.
export const TOPIC_TRANSCRIPTION = "lk.transcription";
