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

// Data-channel topics shared with the Python agent.
export const TOPIC_CODE_UPDATE = "code_update";
export const TOPIC_CONTROL = "control";
export const TOPIC_REPORT = "report";
