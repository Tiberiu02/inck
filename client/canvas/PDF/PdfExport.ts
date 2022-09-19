import { PDFDocument, rgb } from "pdf-lib";

import { BG_COLOR, PAGE_GAP, PDF_FULL_WIDTH, PDF_PADDING_TOP } from "./PdfBackground";
import { DeserializeGraphic, GraphicTypes, PersistentGraphic } from "../Drawing/Graphic";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { ELEMENTS_PER_VERTEX } from "../Rendering/GL";
import { HIGHLIGHTER_OPACITY, NUM_LAYERS } from "../Main";
import { SERVER_PORT } from "../Network/NetworkConnection";
import { io } from "socket.io-client";
import { getAuthToken } from "../../components/AuthToken";
import GetApiPath from "../../components/GetApiPath";

const PAGE_WIDTH = 1000;
const PADDING_BOTTOM = 500; // %w

function LoadNote(id): Promise<[PersistentGraphic[], string]> {
  return new Promise((resolve, reject) => {
    const socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, {
      query: {
        authToken: getAuthToken(),
        docId: id,
      },
    });

    socket.on("load note", (data: any) => {
      const strokes = data.strokes.map(DeserializeGraphic);
      const pdfUrl = data.pdfUrl;
      socket.disconnect();

      resolve([strokes, pdfUrl]);
    });
  });
}

export async function NoteToPdf(noteId) {
  const [strokes, pdfBgUrl] = await LoadNote(noteId);
  const yMax = strokes.map(s => s.geometry.boundingBox.yMax).reduce((a, b) => Math.max(a, b), 0);

  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Add a blank page to the document
  const W = pdfBgUrl ? PDF_FULL_WIDTH : 1;
  const PADDING_TOP = pdfBgUrl ? PDF_PADDING_TOP * PAGE_WIDTH : 0;
  const page = pdfDoc.addPage([PAGE_WIDTH * W, PAGE_WIDTH * yMax + PADDING_TOP + PADDING_BOTTOM]);

  const x = ((W - 1) / 2) * PAGE_WIDTH;
  page.moveTo(x, PAGE_WIDTH * yMax + PADDING_BOTTOM);

  if (pdfBgUrl) {
    const bytes = await fetch(GetApiPath(pdfBgUrl)).then(res => res.arrayBuffer());
    const bgPdf = await PDFDocument.load(bytes);

    let y = 0;

    const indices = bgPdf.getPages().map((_, i) => i);
    const bgPages = await pdfDoc.embedPdf(bgPdf, indices);

    {
      let bgHeight = bgPages.map(p => p.height / p.width + PAGE_GAP).reduce((a, b) => a + b);
      bgHeight = bgHeight * PAGE_WIDTH + PADDING_TOP + PADDING_BOTTOM;

      if (bgHeight > page.getHeight()) {
        page.setHeight(bgHeight);
      }
    }

    // Add gray background

    const { width, height } = page.getSize();
    page.moveTo(0, height);

    const svgPath = `M 0,0 L ${width},0 L ${width},${height} L 0,${height} L 0,0`;
    page.drawSvgPath(svgPath, { color: rgb(...BG_COLOR) });

    // Add background PDF pages

    page.moveTo(x, page.getHeight() - PADDING_TOP);

    for (const bgPage of bgPages) {
      const aspect = bgPage.height / bgPage.width;

      const width = PAGE_WIDTH;
      const height = PAGE_WIDTH * aspect;

      const svgPath = `M 0,${y} L ${width},${y} L ${width},${y + height} L 0,${y + height} L 0,${y}`;
      page.drawSvgPath(svgPath, { color: rgb(1, 1, 1) });
      page.drawPage(bgPage, {
        x: x,
        y: page.getHeight() - (y + height + PADDING_TOP),
        width: PAGE_WIDTH,
        height: PAGE_WIDTH * aspect,
      });

      y += (aspect + PAGE_GAP) * PAGE_WIDTH;
    }
  }

  // Draw the SVG strokes
  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    for (const { graphic } of strokes) {
      if (graphic.type == GraphicTypes.VECTOR && graphic.zIndex == layer) {
        const { vector } = graphic as VectorGraphic;

        if (!vector || !vector.length || vector.length % ELEMENTS_PER_VERTEX) continue;

        let x, y, r, g, b, a;
        let lines = [[], []];
        for (let i = 0; i < vector.length; i += ELEMENTS_PER_VERTEX) {
          [x, y, r, g, b, a] = vector.slice(i, i + ELEMENTS_PER_VERTEX);
          lines[(i / ELEMENTS_PER_VERTEX) % 2].push([x * PAGE_WIDTH, y * PAGE_WIDTH].join(","));
        }
        const xy = lines[0].concat(lines[1].reverse());
        const svgPath = `M ${xy[0]} L ${xy.join(" L ")}`;
        page.drawSvgPath(svgPath, { color: rgb(r, g, b), opacity: layer == 0 ? HIGHLIGHTER_OPACITY : 1 });
      }
    }
  }

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
