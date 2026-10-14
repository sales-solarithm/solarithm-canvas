/**
 * Exact jsPDF Report Engine for Solarithm Design & Engineering
 * Preserves 1:1 coordinates, slide margins, double border framing,
 * image positioning, and mathematical formulas from legacy pdftool-v2.html.
 */

import { jsPDF } from 'jspdf';
import type { ProjectState, CategoryDef } from './types';
import { CATEGORIES } from './types';
import { NOTES_LIBRARY, NOTE_LIBRARY } from './notesData';
import { getSolarithmLogoDataUrl } from './defaultAssets';

export interface ImageLoaderFunction {
  (srcOrId: string): Promise<HTMLImageElement | null>;
}

/**
 * Loads an HTMLImageElement from a local dataUrl or blob url and verifies dimensions
 */
export async function loadImageElement(urlOrData: string): Promise<HTMLImageElement | null> {
  if (!urlOrData) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w > 0 && h > 0) {
        resolve(img);
      } else {
        console.warn('Image loaded with invalid dimensions (0x0):', urlOrData.slice(0, 40));
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image for PDF:', urlOrData.slice(0, 50));
      resolve(null);
    };
    img.src = urlOrData;
  });
}

/**
 * Extracts PO display name
 */
export function getPOName(state: ProjectState): string {
  if (state.poValue === '__other__') {
    const v = state.poCustom?.trim();
    return v ? v.toUpperCase() : 'THE CONCERNED PERSON';
  }
  const v = state.poValue?.trim();
  return v ? v.toUpperCase() : 'THE CONCERNED PERSON';
}

/**
 * Rule-based note converter port from pdftool-v2.html
 */
export function convertNotesRules(raw: string): string[] {
  const text = raw.trim().toUpperCase();
  if (!text) return [];

  const lines: string[] = [];

  if (/SHADOW[\s-]*FREE|NO SHADOW|0\s*%/.test(text)) {
    lines.push("CURRENTLY SHADOW-FREE; HOWEVER, ANY CHANGE IN SHADOW OBJECT HEIGHT OR DIMENSIONS MAY RESULT IN SHADOW APPEARANCE OR IMPACT.");
  } else {
    const sm = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (sm) {
      lines.push(`THIS SITE HAS ${sm[1]}% ANNUAL SHADOW LOSS; HOWEVER, ANY CHANGE IN SHADOW OBJECT HEIGHT OR DIMENSIONS MAY INCREASE OR DECREASE THE SHADOW LOSS.`);
    }
  }

  if (/\bVINAY\b|\bVINAYKUMAR\b/.test(text)) {
    lines.push("ALL PLACEMENTS AND DECISIONS HAVE BEEN EXECUTED AS PER THE INSTRUCTIONS AND CONFIRMATION OF MR. VINAYKUMAR YADAV.");
  }
  if (/\bABHISHEK\b/.test(text)) {
    lines.push("ALL PLACEMENTS AND DECISIONS HAVE BEEN EXECUTED AS PER THE INSTRUCTIONS AND CONFIRMATION OF MR. ABHISHEK SINGH.");
  }

  const hasGE = /GOOGLE\s*EARTH|\bGE\b/.test(text);
  const hasVid = /\bVIDEO\b/.test(text);
  if (hasGE || hasVid) {
    const refs = [hasGE && "GOOGLE EARTH IMAGERY", hasVid && "VIDEO REFERENCES"].filter(Boolean);
    lines.push(`THE DESIGN IS TENTATIVE AND BASED ON ${refs.join(" AND ")}. DIMENSIONS ARE ESTIMATED DUE TO LIMITED SITE MEASUREMENTS AND ARE SUBJECT TO CHANGE UPON PHYSICAL VERIFICATION.`);
  }

  if (/WATERFALL.*(MAYBE|POSSIBLE|MIGHT|UNCERTAIN)|MAYBE.*WATERFALL/.test(text)) {
    lines.push("WATERFALLING MAY OCCUR DEPENDING ON WATER FLOW SPEED, RAIN INTENSITY, OR DRAINAGE CONDITIONS AT THE SITE.");
  } else if (/WATERFALL.*YES|YES.*WATERFALL/.test(text)) {
    lines.push("WATERFALLING IS LIKELY AT THIS SITE. APPROPRIATE DRAINAGE MEASURES ARE STRONGLY RECOMMENDED DURING INSTALLATION.");
  } else if (/NO\s*WATERFALL|WATERFALL.*NO/.test(text)) {
    lines.push("NO WATERFALLING ISSUE IS ANTICIPATED AT THIS SITE UNDER NORMAL CONDITIONS.");
  }

  const ovh: string[] = [];
  [['NORTH','N'],['SOUTH','S'],['EAST','E'],['WEST','W']].forEach(([f,s]) => {
    const m = text.match(new RegExp('(?:'+f+'|\\b'+s+'\\b)[\\s:,]*([0-9]+)\\s*MM'));
    if (m) ovh.push(`${f} SIDE ${m[1]}MM`);
  });
  if (ovh.length) {
    lines.push(`OVERHANG DETAILS: ${ovh.join(', ')}.`);
  }

  const sm2 = text.match(/SHIFT\s+([A-Z\s&]+?)\s+FROM\s+(NORTH|SOUTH|EAST|WEST)\s+TO\s+(NORTH|SOUTH|EAST|WEST)/);
  if (sm2) {
    lines.push(`IT IS RECOMMENDED TO SHIFT THE ${sm2[1].trim()} FROM THE ${sm2[2]} SIDE TO THE ${sm2[3]} SIDE FOR BETTER PANEL PLACEMENT AND OVERALL SYSTEM EFFICIENCY.`);
  }

  const td = text.match(/(?:TRIM|CUT)\s+(NORTH|SOUTH|EAST|WEST)/);
  if (td) {
    lines.push(`PANEL TRIMMING OR CUTTING IS REQUIRED ON THE ${td[1]} SIDE TO FIT THE AVAILABLE ROOF SPACE.`);
  } else if (/\bTRIM\b|\bCUT\b/.test(text)) {
    lines.push("PANEL TRIMMING OR CUTTING MAY BE REQUIRED TO FIT THE AVAILABLE ROOF SPACE.");
  }

  if (/\bCLEAN/.test(text)) {
    lines.push("THIS SITE WILL REQUIRE PERIODIC CLEANING TO MAINTAIN OPTIMAL SYSTEM PERFORMANCE.");
  }

  return lines;
}

/**
 * Builds note lines for the DISCUSSION page strictly adhering to V8 format
 */
export function buildNoteLines(state: ProjectState): string[] {
  const lines: string[] = [];

  // 1. Selected Library Notes (categorized)
  if (state.libraryNoteState) {
    Object.entries(state.libraryNoteState).forEach(([catKey, catState]) => {
      const def = NOTE_LIBRARY[catKey];
      if (!def) return;

      const selectedNotes: string[] = [];
      // Predefined
      if (Array.isArray(catState.predefined)) {
        catState.predefined.forEach((checked, idx) => {
          if (checked && def.notes[idx]) {
            selectedNotes.push(def.notes[idx]);
          }
        });
      }
      // Custom
      if (Array.isArray(catState.custom)) {
        catState.custom.forEach((c) => {
          if (c && c.checked && c.text) {
            selectedNotes.push(c.text.toUpperCase());
          }
        });
      }

      if (selectedNotes.length > 0) {
        lines.push(`[CATEGORY: ${def.title}]`);
        selectedNotes.forEach(note => lines.push(note));
      }
    });
  }

  // 2. Smart Converted Notes
  const conv = state.convertedNotes?.trim();
  if (conv) {
    // May have double newlines
    conv.split('\n\n').forEach(block => {
      const b = block.trim();
      if (b) lines.push(b);
    });
  }

  // 3. Shadow
  if (state.shadowType === 'free') {
    lines.push("CURRENTLY SHADOW-FREE; HOWEVER, ANY CHANGE IN SHADOW OBJECT HEIGHT OR DIMENSIONS MAY RESULT IN SHADOW APPEARANCE OR IMPACT.");
  } else if (state.shadowType === 'percent' && state.shadowPct?.trim()) {
    lines.push(`THIS SITE HAS ${state.shadowPct.trim()}% ANNUAL SHADOW LOSS; HOWEVER, ANY CHANGE IN SHADOW OBJECT HEIGHT OR DIMENSIONS MAY INCREASE OR DECREASE THE SHADOW LOSS.`);
  }

  // 4. Waterfall
  if (state.waterfall === 'maybe') {
    lines.push("WATERFALLING MAY OCCUR DEPENDING ON WATER FLOW SPEED, RAIN INTENSITY, OR DRAINAGE CONDITIONS AT THE SITE.");
  } else if (state.waterfall === 'yes') {
    lines.push("WATERFALLING IS LIKELY AT THIS SITE. APPROPRIATE DRAINAGE MEASURES ARE STRONGLY RECOMMENDED.");
  }

  // 5. Overhang
  const dirs = [
    { on: state.nOn, mm: state.nMM, l: 'NORTH' },
    { on: state.eOn, mm: state.eMM, l: 'EAST' },
    { on: state.wOn, mm: state.wMM, l: 'WEST' },
    { on: state.sOn, mm: state.sMM, l: 'SOUTH' },
  ];
  const ovh = dirs
    .filter(d => d.on)
    .map(d => `${d.l} SIDE ${d.mm || '?'}MM`);
  if (ovh.length) {
    lines.push(`OVERHANG DETAILS: ${ovh.join(', ')}.`);
  }

  // 6. Tentative
  if (state.tentative) {
    const refs = [state.ge && "GOOGLE EARTH IMAGERY", state.video && "VIDEO REFERENCES"].filter(Boolean);
    lines.push(refs.length
      ? `THE DESIGN IS TENTATIVE AND BASED ON ${refs.join(" AND ")}. DIMENSIONS ARE ESTIMATED AND SUBJECT TO CHANGE UPON PHYSICAL VERIFICATION.`
      : "THE DESIGN IS TENTATIVE. DIMENSIONS ARE ESTIMATED AND SUBJECT TO CHANGE UPON PHYSICAL VERIFICATION.");
  }

  // 7. Shift
  if (state.shiftOn) {
    lines.push(`IT IS RECOMMENDED TO SHIFT THE ${state.shiftItem || 'TANKS AND PIPES'} FROM THE ${state.shiftFrom || 'NORTH'} SIDE TO THE ${state.shiftTo || 'SOUTH'} SIDE FOR BETTER PANEL PLACEMENT AND OVERALL SYSTEM EFFICIENCY.`);
  }

  // 8. Trim
  if (state.trimOn) {
    lines.push(`PANEL TRIMMING OR CUTTING IS REQUIRED ON THE ${state.trimDir || 'NORTH'} SIDE TO FIT THE AVAILABLE ROOF SPACE.`);
  }

  // 9. Cleaning
  if (state.cleaning) {
    lines.push("THIS SITE WILL REQUIRE PERIODIC CLEANING TO MAINTAIN OPTIMAL SYSTEM PERFORMANCE.");
  }

  // 10. Custom Note
  const cust = state.customNote?.trim();
  if (cust) {
    lines.push(cust.toUpperCase());
  }

  // 11. PO Line
  lines.push(`ALL PLACEMENTS AND DECISIONS HAVE BEEN EXECUTED AS PER THE INSTRUCTIONS AND CONFIRMATION OF ${getPOName(state)}.`);

  return lines;
}

export interface PDFGenerationResult {
  pdf: jsPDF;
  blob: Blob;
  blobUrl: string;
  filename: string;
  pageCount: number;
}

/**
 * 1:1 Preserved PDF Engine
 */
export async function generateReportPDF(
  state: ProjectState,
  imageResolver: (idOrSrc: string) => Promise<string | null>,
  options?: { returnOnly?: boolean }
): Promise<PDFGenerationResult> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  const shadowTimes = (state.shadowTimes || []).map(t => (t || '').trim()).filter(Boolean);
  const showLogo = !!state.showLogo;
  const showSolarithmBranding = !!state.showSolarithmBranding;

  // Load Logos
  let logoImg: HTMLImageElement | null = null;
  if (showLogo && state.logoDataUrl) {
    logoImg = await loadImageElement(state.logoDataUrl);
  }

  let solarithmLogoImg: HTMLImageElement | null = null;
  if (showSolarithmBranding) {
    const sLogoUrl = state.solarithmLogoDataUrl || await getSolarithmLogoDataUrl();
    solarithmLogoImg = await loadImageElement(sLogoUrl);
  }

  // 1:1 exact helper functions
  function drawPageBorder() {
    pdf.setLineWidth(6);
    pdf.setDrawColor(255, 215, 0);
    pdf.rect(10, 10, W - 20, H - 20, 'S');
    pdf.setLineWidth(2);
    pdf.setDrawColor(205, 170, 0);
    pdf.rect(13, 13, W - 26, H - 26, 'S');
    pdf.setLineWidth(1);
    pdf.setDrawColor(0, 0, 0);
  }

  function drawLogoOnPage(img: HTMLImageElement | null, position: 'left' | 'right' = 'right') {
    if (!img) return;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (!imgW || !imgH) return;
    const logoMaxW = 100;
    const logoMaxH = 45;
    const ratio = Math.min(logoMaxW / imgW, logoMaxH / imgH);
    const lw = imgW * ratio;
    const lh = imgH * ratio;
    const lx = position === 'right' ? W - lw - 25 : 25;
    const ly = 25;
    try {
      const isPng = img.src.startsWith('data:image/png') || img.src.startsWith('data:image/svg');
      pdf.addImage(img, isPng ? 'PNG' : 'JPEG', lx, ly, lw, lh);
    } catch (err) {
      console.warn('Failed to draw logo on page:', err);
    }
  }

  function drawHeading(label: string) {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const textW = pdf.getTextWidth(label);
    const pad = 15;
    const boxH = 28;
    const boxW = textW + pad * 2;
    const boxX = (W - boxW) / 2;
    const boxY = 35;
    pdf.setFillColor(0, 0, 0);
    pdf.rect(boxX, boxY, boxW, boxH, 'F');
    pdf.setLineWidth(1.5);
    pdf.setDrawColor(255, 215, 0);
    pdf.rect(boxX, boxY, boxW, boxH, 'S');
    pdf.setTextColor(255, 215, 0);
    pdf.text(label, W / 2, boxY + boxH / 2 + 5.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.setDrawColor(0, 0, 0);
  }

  function drawImage(img: HTMLImageElement) {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (!imgW || !imgH) return;
    const topMargin = 85;
    const bottomMargin = 85;
    const sideMargin = 40;
    const maxW = W - (sideMargin * 2);
    const maxH = H - topMargin - bottomMargin;
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    const iw = imgW * ratio;
    const ih = imgH * ratio;
    const ix = (W - iw) / 2;
    const iy = topMargin + (maxH - ih) / 2;
    try {
      const isPng = img.src.startsWith('data:image/png');
      pdf.addImage(img, isPng ? 'PNG' : 'JPEG', ix, iy, iw, ih, undefined, 'FAST');
    } catch (err) {
      console.warn('Failed to add image to PDF:', err);
    }
  }

  function drawTimeLabel(label: string) {
    if (!label) return;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const textW = pdf.getTextWidth(label);
    const pad = 20;
    const barW = textW + pad * 2;
    const barH = 26;
    const barX = (W - barW) / 2;
    const barY = H - barH - 35;
    pdf.setFillColor(20, 40, 80);
    pdf.rect(barX, barY, barW, barH, 'F');
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(1);
    pdf.rect(barX, barY, barW, barH, 'S');
    pdf.setTextColor(255, 255, 255);
    pdf.text(label, W / 2, barY + barH / 2 + 4.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.setDrawColor(0, 0, 0);
  }

  /* ── 1. PROJECT INTRODUCTION PAGE ── */
  const showIntroPage = !!state.showIntroPage;
  let needsNewPageForFirstImage = false;

  if (showIntroPage) {
    pdf.setFillColor(60, 60, 60);
    pdf.rect(0, 0, W, H, 'F');
    drawPageBorder();
    if (solarithmLogoImg) drawLogoOnPage(solarithmLogoImg, 'left');
    if (logoImg) drawLogoOnPage(logoImg, 'right');
    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Introduction', W / 2, 80, { align: 'center' });
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(2);
    pdf.line(W / 2 - 100, 90, W / 2 + 100, 90);

    let yPos = 150;
    pdf.setFontSize(14);

    const introFields = [
      { show: state.showClientName,    value: state.introClientName,    label: 'Client Name:' },
      { show: state.showDate,          value: state.introDate,          label: 'Date:' },
      { show: state.showNumPanels,     value: state.introNumPanels,     label: 'Number of Panels:' },
      { show: state.showPanelBrand,    value: state.introPanelBrand,    label: 'Brand Of Panel:' },
      { show: state.showPanelWp,       value: state.introPanelWp,       label: 'Panel Wp:' },
      { show: state.showInverter,      value: state.introInverter,      label: 'Inverter to be Used (KW):' },
      { show: state.showInverterBrand, value: state.introInverterBrand, label: 'Inverter Brand:' },
      { show: state.showPlantCapacity, value: state.introPlantCapacity, label: 'Plant capacity (KW):' },
      { show: state.showTiltAngle,     value: state.introTiltAngle,     label: 'Tilt Angle:' },
    ];

    introFields.forEach(field => {
      if (field.show && field.value) {
        pdf.setTextColor(212, 175, 55);
        pdf.setFont('helvetica', 'bold');
        pdf.text('• ', 80, yPos);
        pdf.text(field.label, 92, yPos);
        pdf.setTextColor(224, 224, 224);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(field.value), 280, yPos);
        yPos += 25;
      }
    });

    if (state.showEPCCompany && state.introEPCCompany) {
      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(state.introEPCCompany, W / 2, H - 60, { align: 'center' });
    }

    needsNewPageForFirstImage = true;
  }

  /* ── 2. IMAGES LOOP (Ordered by Category & Items) ── */
  let isFirstPage = !showIntroPage;

  // Resolve category order list
  const categoryOrderIds = state.categoryOrder && state.categoryOrder.length > 0
    ? state.categoryOrder
    : CATEGORIES.map(c => c.id);

  const orderedCategories: CategoryDef[] = [];
  categoryOrderIds.forEach(cid => {
    const match = CATEGORIES.find(c => c.id === cid);
    if (match) orderedCategories.push(match);
  });
  CATEGORIES.forEach(c => {
    if (!orderedCategories.some(oc => oc.id === c.id)) {
      orderedCategories.push(c);
    }
  });

  for (const cat of orderedCategories) {
    const rawList = state.catOrderData?.[cat.id] || [];
    // Only include images actually assigned to this category
    const validSrcs = rawList.filter(src => state.catAssignData?.[src] === cat.id);
    if (!validSrcs.length) continue;

    for (let i = 0; i < validSrcs.length; i++) {
      const srcId = validSrcs[i];
      if (!isFirstPage || needsNewPageForFirstImage) {
        pdf.addPage();
        needsNewPageForFirstImage = false;
      }
      isFirstPage = false;
      const isFirstOfSection = (i === 0);

      pdf.setFillColor(60, 60, 60);
      pdf.rect(0, 0, W, H, 'F');
      drawPageBorder();

      if (solarithmLogoImg) drawLogoOnPage(solarithmLogoImg, 'left');
      if (logoImg) drawLogoOnPage(logoImg, 'right');
      if (isFirstOfSection) drawHeading(cat.label);

      const resolvedDataUrl = await imageResolver(srcId);
      if (resolvedDataUrl) {
        const imgEl = await loadImageElement(resolvedDataUrl);
        if (imgEl) {
          drawImage(imgEl);
        }
      }

      const hasShadowTime = (cat.id === 'cat_shadow' && shadowTimes[i]);
      if (hasShadowTime) {
        drawTimeLabel(shadowTimes[i]);
      }
    }
  }

  /* ── 3. DISCUSSION / NOTES PAGE ── */
  if (state.noteOn) {
    const noteLines = buildNoteLines(state);
    if (noteLines.length > 0) {
      pdf.addPage();
      pdf.setFillColor(60, 60, 60);
      pdf.rect(0, 0, W, H, 'F');
      drawPageBorder();

      if (solarithmLogoImg) drawLogoOnPage(solarithmLogoImg, 'left');
      if (logoImg) drawLogoOnPage(logoImg, 'right');
      drawHeading('DISCUSSION');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      let y = 85;

      noteLines.forEach((block, idx) => {
        if (y > H - 60) {
          pdf.addPage();
          pdf.setFillColor(60, 60, 60);
          pdf.rect(0, 0, W, H, 'F');
          drawPageBorder();
          if (solarithmLogoImg) drawLogoOnPage(solarithmLogoImg, 'left');
          if (logoImg) drawLogoOnPage(logoImg, 'right');
          drawHeading('DISCUSSION (CONT.)');
          y = 85;
        }

        // Category heading marker
        if (block.startsWith('[CATEGORY: ') && block.endsWith(']')) {
          const catTitle = block.replace('[CATEGORY: ', '').replace(']', '');
          y += 6;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(212, 175, 55);

          if (y > H - 60) {
            pdf.addPage();
            pdf.setFillColor(60, 60, 60);
            pdf.rect(0, 0, W, H, 'F');
            drawPageBorder();
            y = 85;
          }

          pdf.text(catTitle, 35, y);
          y += 5;
          pdf.setLineWidth(0.5);
          pdf.setDrawColor(212, 175, 55);
          pdf.line(35, y, W - 35, y);
          y += 12;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(255, 255, 255);
          pdf.setDrawColor(0, 0, 0);
        } else {
          // Regular note line
          const wrapped = pdf.splitTextToSize(block, W - 80);
          pdf.setFont('helvetica', 'bold');
          pdf.text('•', 35, y);
          pdf.setFont('helvetica', 'normal');
          wrapped.forEach((line: string) => {
            if (y > H - 60) {
              pdf.addPage();
              pdf.setFillColor(60, 60, 60);
              pdf.rect(0, 0, W, H, 'F');
              drawPageBorder();
              y = 85;
            }
            pdf.text(line, 50, y);
            y += 16;
          });
          if (idx < noteLines.length - 1) y += 6;
        }
      });
    }
  }

  const filename = (state.fileName?.trim() || 'SOLARITHM_REPORT') + '.pdf';
  const blob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const pageCount = pdf.getNumberOfPages();

  if (!options?.returnOnly) {
    pdf.save(filename);
  }

  return {
    pdf,
    blob,
    blobUrl,
    filename,
    pageCount,
  };
}
