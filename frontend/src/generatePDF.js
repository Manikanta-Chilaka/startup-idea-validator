import jsPDF from 'jspdf';

const PW = 210, PH = 297, M = 18, CW = 174;

const C = {
  blue:   [37,  99,  235], blueL:  [219, 234, 254],
  green:  [16,  185, 129], greenL: [209, 250, 229],
  amber:  [245, 158, 11],  amberL: [254, 243, 199],
  red:    [239, 68,  68],  redL:   [254, 226, 226],
  dark:   [15,  23,  42],
  gray:   [71,  85,  105],
  muted:  [148, 163, 184],
  light:  [248, 250, 252],
  border: [226, 232, 240],
  white:  [255, 255, 255],
};

function scoreCol(s)  { return s >= 65 ? C.green : s >= 40 ? C.amber : C.red; }
function scoreColL(s) { return s >= 65 ? C.greenL : s >= 40 ? C.amberL : C.redL; }
function riskCol(r)   { return r === 'Low' ? C.green : r === 'Medium' ? C.amber : C.red; }
function riskColL(r)  { return r === 'Low' ? C.greenL : r === 'Medium' ? C.amberL : C.redL; }

export function generatePDF(report) {
  const {
    startup_idea, customer_adoption_probability, investment_interest,
    market_risk, overall_score, agent_responses,
    strengths, weaknesses, opportunities, threats, suggested_improvements,
  } = report;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ── Primitives ────────────────────────────────────────────
  const fc = col => doc.setFillColor(...col);
  const sc = col => doc.setDrawColor(...col);
  const tc = col => doc.setTextColor(...col);
  const lw = w   => doc.setLineWidth(w);

  function bold(size, col = C.dark)   { doc.setFont('helvetica', 'bold');   doc.setFontSize(size); tc(col); }
  function normal(size, col = C.gray) { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); tc(col); }
  function italic(size, col = C.gray) { doc.setFont('helvetica', 'italic'); doc.setFontSize(size); tc(col); }

  function txt(str, x, y, opts) { doc.text(str, x, y, opts); }

  function wrp(str, w, size) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    return doc.splitTextToSize(String(str || ''), w);
  }

  function hline(y, col = C.border) { sc(col); lw(0.2); doc.line(M, y, PW - M, y); }

  function rrect(x, y, w, h, r, style = 'F') { doc.roundedRect(x, y, w, h, r, r, style); }

  // Check if near bottom; add page if so
  function checkY(y, need = 20) {
    if (y + need > PH - 14) { doc.addPage(); return M + 4; }
    return y;
  }

  function sectionTitle(label, y) {
    bold(7.5, C.muted);
    txt(label, M, y);
    hline(y + 2.5);
    return y + 8;
  }

  function badge(text, x, y, col, colL) {
    fc(colL); sc(col); lw(0.3);
    rrect(x, y - 3.5, 20, 6, 1.5, 'FD');
    bold(7.5, col);
    txt(text, x + 10, y + 0.5, { align: 'center' });
  }

  // ── PAGE 1 HEADER ─────────────────────────────────────────
  fc(C.blue); lw(0); doc.rect(0, 0, PW, 26, 'F');
  fc([29, 78, 216]); doc.rect(0, 17, PW, 9, 'F');

  bold(16, C.white); txt('Validate AI', M, 11);
  normal(8.5, [219, 234, 254]); txt('Startup Idea Validation Report', M, 19);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  normal(8, [219, 234, 254]); txt(dateStr, PW - M, 11, { align: 'right' });
  normal(8, [147, 197, 253]); txt('AI-Powered  ·  Confidential', PW - M, 19, { align: 'right' });

  // ── STARTUP IDEA TITLE ────────────────────────────────────
  let y = 34;
  const ideaLines = wrp(startup_idea, CW, 14);
  bold(14, C.dark); txt(ideaLines, M, y);
  y += ideaLines.length * 6.5 + 3;

  normal(8, C.muted); txt(`Analysed  ·  ${dateStr}`, M, y);
  y += 8;
  hline(y); y += 8;

  // ── KEY METRICS ───────────────────────────────────────────
  bold(7.5, C.muted); txt('KEY METRICS', M, y); y += 5;

  const bW = (CW - 9) / 4, bH = 22;
  [
    { l: 'Overall Score',     v: `${overall_score}%`,              col: scoreCol(overall_score),                  colL: scoreColL(overall_score) },
    { l: 'Customer Adoption', v: `${customer_adoption_probability}%`, col: scoreCol(customer_adoption_probability), colL: scoreColL(customer_adoption_probability) },
    { l: 'Investor Interest', v: `${investment_interest}/10`,       col: investment_interest>=7?C.green:investment_interest>=4?C.amber:C.red,  colL: investment_interest>=7?C.greenL:investment_interest>=4?C.amberL:C.redL },
    { l: 'Market Risk',       v: market_risk,                       col: riskCol(market_risk),                     colL: riskColL(market_risk) },
  ].forEach(({ l, v, col, colL }, i) => {
    const bx = M + i * (bW + 3);
    fc(colL); sc(col); lw(0.4);
    rrect(bx, y, bW, bH, 2, 'FD');
    bold(12, col); txt(v, bx + bW / 2, y + 10, { align: 'center' });
    normal(7.5, C.gray); txt(l, bx + bW / 2, y + 17, { align: 'center' });
  });

  y += bH + 10;

  // ── RECOMMENDATIONS ───────────────────────────────────────
  y = checkY(y, 20);
  y = sectionTitle('RECOMMENDATIONS', y);

  suggested_improvements.forEach((imp, i) => {
    const lines = wrp(imp, CW - 11, 9);
    const rowH  = lines.length * 4.5 + 6;
    y = checkY(y, rowH);

    if (i % 2 === 0) { fc(C.light); lw(0); doc.rect(M, y - 3.5, CW, rowH, 'F'); }

    fc(C.blueL); sc(C.blue); lw(0.3);
    rrect(M + 2, y - 3, 6, 5.5, 1, 'FD');
    bold(7, C.blue); txt(`${i + 1}`, M + 5, y + 0.5, { align: 'center' });

    normal(9, C.gray); txt(lines, M + 11, y);
    y += rowH;
  });

  y += 8;

  // ── RISK ANALYSIS ─────────────────────────────────────────
  y = checkY(y, 55);
  y = sectionTitle('RISK ANALYSIS', y);

  const avgRisk = agent_responses.reduce((s, a) => s + a.risk_score, 0) / agent_responses.length;
  [
    { label: 'Technical Risk',  s: avgRisk > 6 ? 'High' : avgRisk > 3 ? 'Medium' : 'Low' },
    { label: 'Market Risk',     s: market_risk },
    { label: 'Financial Risk',  s: investment_interest < 4 ? 'High' : investment_interest < 7 ? 'Medium' : 'Low' },
    { label: 'Execution Risk',  s: overall_score < 40 ? 'High' : overall_score < 65 ? 'Medium' : 'Low' },
  ].forEach(({ label, s }, i) => {
    const rowH = 10;
    y = checkY(y, rowH);

    if (i % 2 === 0) { fc(C.light); lw(0); doc.rect(M, y - 3.5, CW, rowH, 'F'); }

    normal(9.5, C.dark); txt(label, M + 4, y);

    const bx = M + 55, blen = 68, bh = 3;
    const pct = s === 'Low' ? 0.25 : s === 'Medium' ? 0.6 : 0.9;
    fc([220, 227, 240]); lw(0); doc.rect(bx, y - 2, blen, bh, 'F');
    fc(riskCol(s)); doc.rect(bx, y - 2, blen * pct, bh, 'F');

    badge(s, PW - M - 22, y, riskCol(s), riskColL(s));

    y += rowH;
    hline(y);
  });

  y += 8;

  // ── SWOT ANALYSIS ─────────────────────────────────────────
  y = checkY(y, 20);
  y = sectionTitle('SWOT ANALYSIS', y);

  const swots = [
    { label: 'STRENGTHS',     items: strengths,     col: C.green, colL: C.greenL },
    { label: 'WEAKNESSES',    items: weaknesses,    col: C.red,   colL: C.redL   },
    { label: 'OPPORTUNITIES', items: opportunities, col: C.blue,  colL: C.blueL  },
    { label: 'THREATS',       items: threats,       col: C.amber, colL: C.amberL },
  ];

  const colW = (CW - 4) / 2;

  for (let row = 0; row < 2; row++) {
    const left  = swots[row * 2];
    const right = swots[row * 2 + 1];

    const lLines = (left.items  || []).slice(0, 5).reduce((s, it) => s + wrp(it, colW - 10, 8.5).length, 0);
    const rLines = (right.items || []).slice(0, 5).reduce((s, it) => s + wrp(it, colW - 10, 8.5).length, 0);
    const cellH  = 12 + Math.max(lLines, rLines, 3) * 4.5 + 4;

    y = checkY(y, cellH + 4);

    [left, right].forEach((sw, col) => {
      const sx = M + col * (colW + 4);
      fc(sw.colL); sc(sw.col); lw(0.3);
      rrect(sx, y, colW, cellH, 2, 'FD');

      bold(7.5, sw.col); txt(sw.label, sx + 6, y + 6);

      let iy = y + 12;
      (sw.items || []).slice(0, 5).forEach(item => {
        const wl = wrp(item, colW - 11, 8.5);
        fc(sw.col); doc.circle(sx + 6.5, iy - 1.2, 0.8, 'F');
        normal(8.5, C.gray); txt(wl, sx + 9.5, iy);
        iy += wl.length * 4.5;
      });
    });

    y += cellH + 4;
  }

  y += 8;

  // ── AGENT INSIGHTS ────────────────────────────────────────
  y = checkY(y, 20);
  y = sectionTitle('AGENT INSIGHTS', y);

  agent_responses.forEach((agent, i) => {
    const feedLines = wrp(`"${agent.feedback}"`, CW - 10, 8.5);
    const concLines = agent.concerns[0] ? wrp(agent.concerns[0], CW - 16, 8) : [];
    const cardH     = 10 + feedLines.length * 4.5 + (concLines.length ? concLines.length * 4 + 9 : 0) + 3;

    y = checkY(y, cardH + 4);

    // Card background
    fc(i % 2 === 0 ? C.light : C.white); sc(C.border); lw(0.2);
    doc.rect(M, y - 3, CW, cardH, 'FD');

    // Agent name
    const agentName = agent.agent_name.replace(/ Agent$/i, '');
    bold(9.5, C.dark); txt(agentName, M + 5, y + 2);

    // Interest badge
    const conf = agent.interest_score * 10;
    badge(`${conf}%`, PW - M - 22, y + 2, scoreCol(conf), scoreColL(conf));

    // Concern label
    normal(8, C.muted); txt(`Concern: ${agent.concerns[0] || 'None noted'}`, PW - M - 65, y + 2);

    // Feedback
    italic(8.5, C.gray); txt(feedLines, M + 5, y + 8);
    let iy = y + 8 + feedLines.length * 4.5;

    // Concern box
    if (concLines.length) {
      iy += 2;
      fc([255, 241, 242]); sc([254, 202, 202]); lw(0.2);
      rrect(M + 5, iy - 2.5, CW - 10, concLines.length * 4 + 6, 1.5, 'FD');
      bold(7.5, C.red); txt('Key Concern: ', M + 9, iy + 1.5);
      normal(8, [185, 28, 28]); txt(concLines, M + 9, iy + 5.5);
    }

    y += cardH + 4;
  });

  // ── FOOTER (all pages) ────────────────────────────────────
  const nPages = doc.getNumberOfPages();
  for (let p = 1; p <= nPages; p++) {
    doc.setPage(p);
    fc(C.light); lw(0); doc.rect(0, PH - 10, PW, 10, 'F');
    sc(C.border); lw(0.2); doc.line(0, PH - 10, PW, PH - 10);
    normal(7, C.muted);
    txt('Generated by Validate AI  ·  Confidential', M, PH - 4);
    txt(`Page ${p} of ${nPages}`, PW - M, PH - 4, { align: 'right' });
  }

  // ── SAVE ─────────────────────────────────────────────────
  const slug = startup_idea.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-{2,}/g, '-');
  doc.save(`validate-ai-${slug}.pdf`);
}
