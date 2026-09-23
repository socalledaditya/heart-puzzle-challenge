import PDFDocument from 'pdfkit';

const HEART = 'M450 700S180 545 180 350c0-110 145-150 270-22 125-128 270-88 270 22 0 195-270 350-270 350Z';
const THEMES = {
  1: { main: '#c9a227', label: 'FIRST PLACE', word: 'first' },
  2: { main: '#7f8c99', label: 'SECOND PLACE', word: 'second' },
  3: { main: '#b0703c', label: 'THIRD PLACE', word: 'third' },
  0: { main: '#b3153e', label: '', word: '' },
};
export const fmtTime = (ms) => {
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function makeCertificate({ name, rollNo, rank, solved, totalPuzzles, totalMs, certId, event }) {
  return new Promise((resolve, reject) => {
    const isWinner = rank >= 1 && rank <= 3;
    const th = THEMES[isWinner ? rank : 0];
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificate - ${name}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const center = (text, y, size, font = 'Helvetica', color = '#333', extra = {}) =>
      doc.font(font).fontSize(size).fillColor(color).text(text, 0, y, { width: W, align: 'center', ...extra });

    doc.rect(0, 0, W, H).fill('#fffaf5');
    doc.lineWidth(6).rect(20, 20, W - 40, H - 40).stroke(th.main);
    doc.lineWidth(1.5).rect(32, 32, W - 64, H - 64).stroke(th.main);
    doc.save().translate(W / 2 - 72, 14).scale(0.16).path(HEART).fill(th.main).restore();

    center(isWinner ? 'CERTIFICATE OF EXCELLENCE' : 'CERTIFICATE OF PARTICIPATION', 138, 28, 'Helvetica-Bold', th.main, { characterSpacing: 2 });
    center([event.eventName, event.collegeName].filter(Boolean).join('  |  '), 178, 13, 'Helvetica', '#666');
    center('This certificate is proudly presented to', 208, 12, 'Helvetica-Oblique', '#555');
    center(name, 232, 36, 'Helvetica-Bold', '#222');
    doc.moveTo(W / 2 - 200, 282).lineTo(W / 2 + 200, 282).lineWidth(1).stroke(th.main);
    center(`Roll No. ${rollNo}`, 290, 12, 'Helvetica', '#555');

    const body = isWinner
      ? `for securing ${th.word} place in "${event.eventName}" by solving ${solved} of ${totalPuzzles} heart puzzles in ${fmtTime(totalMs)}.`
      : `for actively participating in "${event.eventName}" and solving ${solved} of ${totalPuzzles} heart puzzles.`;
    doc.font('Helvetica').fontSize(14).fillColor('#333').text(body, (W - 600) / 2, 320, { width: 600, align: 'center' });

    if (isWinner) {
      doc.roundedRect(W / 2 - 90, 385, 180, 34, 17).fill(th.main);
      center(th.label, 395, 14, 'Helvetica-Bold', '#ffffff', { characterSpacing: 2 });
    }

    doc.lineWidth(1).moveTo(70, 500).lineTo(240, 500).stroke('#999');
    doc.font('Helvetica').fontSize(11).fillColor('#444').text(event.eventDate || '', 70, 506, { width: 170, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#888').text('Date', 70, 522, { width: 170, align: 'center' });
    doc.moveTo(W - 240, 500).lineTo(W - 70, 500).stroke('#999');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#444').text(event.signatory || 'Organising Committee', W - 240, 506, { width: 170, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#888').text(event.signatoryTitle || 'Event Coordinator', W - 240, 522, { width: 170, align: 'center' });
    center(`Certificate ID: ${certId}`, 548, 8, 'Helvetica', '#aaa');
    doc.end();
  });
}

export const certId = (session, userId) => `HP${session}-${String(userId).slice(-8).toUpperCase()}`;
