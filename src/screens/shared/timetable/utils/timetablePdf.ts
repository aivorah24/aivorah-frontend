import { Timetable, fmtTime, DAY_LABELS, subjectColor } from '../services/timetableApi';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 240,
      parseInt(clean.slice(2, 4), 16) || 240,
      parseInt(clean.slice(4, 6), 16) || 240,
    ];
  }
  return [240, 248, 255];
}

/**
 * Renders the given timetable as a landscape A4 PDF and triggers a direct
 * browser download. Mirrors the previous inline downloadPdf() in
 * TimetableScreen.tsx verbatim — same layout constants, same logo fallback,
 * same page-overflow handling. Errors are swallowed (logged only), matching
 * the legacy behavior of never surfacing a PDF-generation failure to the UI.
 */
export async function downloadTimetablePdf(params: {
  tt: Timetable;
  classLabel: string;
  schoolName: string;
  studentSubtitle: string;
}): Promise<void> {
  const { tt, classLabel, schoolName, studentSubtitle } = params;
  try {
    // require(), not a dynamic import() — the latter needs a Node VM flag
    // Jest doesn't set, so it throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG
    // under test. Same lazy-load behavior either way (Metro/webpack still
    // code-split this at build time), matching the exportPdf.ts precedent.
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = 842;
    const H = 595;
    const ML = 28;
    const MR = 28;
    const MT = 36;
    const MB = 28;
    const usableW = W - ML - MR;
    const axisW = 72;
    const days = tt.days || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const colW = (usableW - axisW) / Math.max(1, days.length);

    // Try to load stored TSRA / School Logo (from Cloudinary/Backend)
    let logoDataUrl: string | null = null;
    try {
      const logoTargetUrl = 'https://res.cloudinary.com/di5iq2mmb/image/upload/v1783659219/aivorah/branding/school_THE_SHRI_RAM_ACADEMY.png';
      const imgRes = await fetch(logoTargetUrl);
      const blob = await imgRes.blob();
      logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('[downloadPdf] could not load logo image, falling back to crest badge:', err);
    }

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', ML, MT - 2, 28, 28);
      } catch (err) {
        doc.setFillColor(27, 54, 93);
        doc.circle(ML + 14, MT + 12, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('S', ML + 14, MT + 16, { align: 'center' });
      }
    } else {
      doc.setFillColor(27, 54, 93);
      doc.circle(ML + 14, MT + 12, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('S', ML + 14, MT + 16, { align: 'center' });
    }

    // School Name & Class Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(26, 26, 26);
    doc.text(schoolName, ML + 36, MT + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(studentSubtitle, ML + 36, MT + 24);

    // Date Range / Title on Top Right
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(tt.title || '14 Jul 2026 – 18 May 2027', W - MR, MT + 10, { align: 'right' });

    // Draw table header (Aivorah Signature Model: Left PERIOD spine + clean day columns)
    let y = MT + 38;
    const headerH = 26;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(1);

    const drawTableHeader = (startY: number) => {
      // Top-left PERIOD box
      doc.setFillColor(245, 245, 245);
      doc.rect(ML, startY, axisW, headerH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      doc.text('PERIOD', ML + axisW / 2, startY + 16, { align: 'center' });

      // Day column headers
      days.forEach((d, i) => {
        const cx = ML + axisW + i * colW;
        doc.setFillColor(245, 245, 245);
        doc.rect(cx, startY, colW, headerH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        if (d === 'SAT' || d === 'SUN') {
          doc.setTextColor(210, 50, 50);
        } else {
          doc.setTextColor(40, 40, 40);
        }
        doc.text(DAY_LABELS[d] || d, cx + colW / 2, startY + 16, { align: 'center' });
      });
    };

    drawTableHeader(y);
    y += headerH;

    // Draw rows
    for (const p of tt.periodDefs) {
      const isBreak = !!p.isBreak;
      const rowH = isBreak ? 28 : 58;

      // Check page overflow
      if (y + rowH > H - MB) {
        doc.addPage();
        y = MT;
        drawTableHeader(y);
        y += headerH;
      }

      if (isBreak) {
        // Break/Lunch row: clean full-width strip across all day columns
        doc.setFillColor(245, 245, 245);
        doc.rect(ML, y, axisW, rowH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(110, 110, 110);
        doc.text(p.code || 'BRK', ML + axisW / 2, y + 17, { align: 'center' });

        const stripX = ML + axisW;
        const stripW = usableW - axisW;
        doc.setFillColor(238, 238, 238);
        doc.rect(stripX, y, stripW, rowH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        const breakText = `${fmtTime(p.start)} – ${fmtTime(p.end)} · ${p.code || 'Break'}`;
        doc.text(breakText, stripX + stripW / 2, y + 17, { align: 'center' });
      } else {
        // Normal period row: left axis + pastel subject cards
        doc.setFillColor(250, 250, 250);
        doc.rect(ML, y, axisW, rowH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(40, 40, 40);
        doc.text(p.code, ML + axisW / 2, y + 22, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(fmtTime(p.start), ML + axisW / 2, y + 38, { align: 'center' });

        days.forEach((d, i) => {
          const cx = ML + axisW + i * colW;
          const s = tt.slots.find((x) => x.day === d && x.periodCode === p.code);
          if (s && (s.subject || s.room)) {
            const hex = s.color || subjectColor(s.subject || '') || '#E0F7FA';
            const [r, g, b] = hexToRgb(hex);
            doc.setFillColor(r, g, b);
            doc.rect(cx, y, colW, rowH, 'FD');

            // Draw subject
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 30);
            const lines = doc.splitTextToSize(s.subject || '', colW - 14);
            doc.text(lines.slice(0, 2), cx + 8, y + 22);

            // Draw room/teacher below
            if (s.room) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(90, 90, 90);
              const roomLines = doc.splitTextToSize(s.room, colW - 14);
              doc.text(roomLines.slice(0, 1), cx + 8, y + 46);
            }
          } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(cx, y, colW, rowH, 'FD');
          }
        });
      }
      y += rowH;
    }

    // Trigger direct file download
    doc.save(`${classLabel} Timetable.pdf`);
  } catch (err) {
    console.error('[downloadPdf]', err);
  }
}
