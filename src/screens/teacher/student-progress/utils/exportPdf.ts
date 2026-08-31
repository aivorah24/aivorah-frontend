import { Platform } from 'react-native';
import type { RosterStudent } from '../types';

interface ExportParams {
  teacherName: string;
  filters: { subject?: string; grade?: string; curriculum?: string; class?: string; section?: string };
  activityStudents: RosterStudent[];
  activityMode: 'today' | 'overall';
}

// Web-only, real-time snapshot of the CURRENTLY filtered Activity &
// Performance table — deliberately just this one section (not Subject
// Progress or Topic Exploration, which are dense on-screen but don't
// summarize well as flat PDF text). Styled after the Parent AI Report's
// jsPDF report (../../../.legacy-screens/parent/ParentAIReportsScreen.tsx:
// banner header, rounded card, score bars) but in Aivorah's gold/cream
// teacher palette instead of that report's teal.
export function exportStudentProgressPdf(params: ExportParams): void {
  if (Platform.OS !== 'web') return;
  const { jsPDF } = require('jspdf');
  const { teacherName, filters, activityStudents, activityMode } = params;
  const generatedAt = new Date();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const ML = 16;
  const MR = 16;
  const col = W - ML - MR;

  // Aivorah teacher palette — gold on cream, matching src/theme/index.ts's
  // light-theme `accentYellow` (#9A7B2E, chosen there for readability on
  // cream — same reasoning applies to a printed white page).
  const GOLD: [number, number, number] = [154, 123, 46];
  const GOLD_BG: [number, number, number] = [250, 244, 229];
  const GOLD_BAR_BG: [number, number, number] = [232, 220, 189];
  const DARK: [number, number, number] = [30, 27, 20];
  const MUTED: [number, number, number] = [120, 112, 95];
  const BORDER: [number, number, number] = [225, 215, 190];
  const RED: [number, number, number] = [176, 58, 46]; // needsAttention dot

  let y = 0;
  const pageH = 297;

  function checkY(need: number) {
    if (y + need > pageH - 18) addPage();
  }
  function addPage() {
    doc.addPage();
    y = 14;
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, W, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text('AIVORAH', ML, 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('Activity & Performance Report', ML + 18, 10);
    y = 18;
  }

  // ── Banner header ────────────────────────────────────────────────────
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Aivorah', ML, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 236, 214);
  doc.text('Teaching Platform', ML, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Activity & Performance Report', W - MR, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(245, 236, 214);
  doc.text(`Generated on ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`, W - MR, 25, { align: 'right' });

  y = 48;

  // ── Class context card ───────────────────────────────────────────────
  doc.setFillColor(...GOLD_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, col, 22, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(teacherName, ML + 6, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const contextLine = [
    filters.curriculum ?? 'All curricula',
    filters.grade ?? 'All grades',
    filters.section ?? 'All sections',
    filters.subject ?? 'All subjects',
  ].join('  ·  ');
  doc.text(contextLine, ML + 6, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(activityMode === 'today' ? 'TODAY' : 'OVERALL', W - MR - 6, y + 12, { align: 'right' });

  y += 30;

  // ── Activity & Performance rows ──────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('ACTIVITY & PERFORMANCE', ML, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 1.5, ML + col, y + 1.5);
  y += 8;

  if (activityStudents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text('No students to show for this filter.', ML, y);
  } else {
    activityStudents.forEach((s, i) => {
      checkY(24);
      const rowH = 22;
      if (i % 2 === 1) {
        doc.setFillColor(...GOLD_BG);
        doc.roundedRect(ML, y, col, rowH, 1.5, 1.5, 'F');
      }

      // Name + needsAttention dot
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      doc.text(s.name, ML + 4, y + 7);
      if (s.needsAttention) {
        doc.setFillColor(...RED);
        doc.circle(ML + 4 + doc.getTextWidth(s.name) + 3, y + 5.3, 1.1, 'F');
      }

      // Time spent — Path / Assignments / Challenges
      const pathMin = activityMode === 'today' ? s.learningPathTimeToday : s.learningPathTime;
      const assignMin = activityMode === 'today' ? null : s.assignmentTime;
      const challengeMin = activityMode === 'today' ? null : s.challengeTime;
      const timeLabel = (m: number | null) => (m == null ? '—' : `${m}m`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Path ${timeLabel(pathMin)}  ·  Assignments ${timeLabel(assignMin)}  ·  Challenges ${timeLabel(challengeMin)}`, ML + 4, y + 13);

      // Best quiz score
      const quiz = s.quizAttempts === 0 ? 'No quiz attempts' : (s.quizBestScore != null ? `${s.quizBestScore}%` : '—');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...GOLD);
      doc.text(`Best quiz: ${quiz}`, ML + 4, y + 19);

      // Learning Path progress bar (right side)
      const barX = ML + col - 62;
      const barW = 62;
      if (s.totalTopics > 0) {
        const pct = Math.min(100, Math.max(0, s.progressPct));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text(`${s.completedTopics.length} / ${s.totalTopics} topics`, barX, y + 6, { align: 'left' });
        doc.setFillColor(...GOLD_BAR_BG);
        doc.roundedRect(barX, y + 9, barW - 20, 4, 1, 1, 'F');
        doc.setFillColor(...GOLD);
        doc.roundedRect(barX, y + 9, (barW - 20) * (pct / 100), 4, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GOLD);
        doc.text(`${pct}%`, barX + barW - 18, y + 12.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text('No topic data', barX, y + 12);
      }

      y += rowH + 3;
    });
  }

  const footerY = pageH - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Aivorah — real-time snapshot, not a live document', ML, footerY);

  doc.save(`activity-performance-${generatedAt.toISOString().slice(0, 10)}.pdf`);
}
