import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewLab — Real-Time AI Technical Interviewer",
  description:
    "Practice live, high-pressure technical interviews with an AI interviewer that watches your code, listens to your reasoning, and talks back in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-page font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
