import { PDFDocument, rgb } from "pdf-lib";
import download from "downloadjs";

import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { BG_COLOR, PAGE_GAP, PdfBackground } from "./PdfBackground";
import { ObservableProperty } from "../DesignPatterns/Observable";
import { GraphicTypes } from "../Drawing/Graphic";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { ELEMENTS_PER_VERTEX } from "../Rendering/GL";
import { HIGHLIGHTER_OPACITY, NUM_LAYERS } from "../Main";
import { MutableView, View } from "../View/View";

const PAGE_WIDTH = 1000;
const PADDING_BOTTOM = 500; // %w

export async function DownloadAsPdf(
  yMax: ObservableProperty<number>,
  strokeContainer: LayeredStrokeContainer,
  pdfBackground: PdfBackground
) {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Add a blank page to the document
  const W = MutableView.maxWidth || 1;
  const paddingTop = -MutableView.documentTop || 0;
  const page = pdfDoc.addPage([PAGE_WIDTH * W, PAGE_WIDTH * (yMax.get() + paddingTop) + PADDING_BOTTOM]);

  if (pdfBackground) {
    // Add gray background
    const { width, height } = page.getSize();
    page.moveTo(0, height);

    const svgPath = `M 0,0 L ${width},0 L ${width},${height} L 0,${height} L 0,0`;
    page.drawSvgPath(svgPath, { color: rgb(...BG_COLOR) });
  }

  const x = ((W - 1) / 2) * PAGE_WIDTH;
  page.moveTo(x, PAGE_WIDTH * yMax.get() + PADDING_BOTTOM);

  if (pdfBackground) {
    // Add background PDF pages
    const url = pdfBackground.getURL();
    const bytes = await fetch(url).then(res => res.arrayBuffer());
    const bgPdf = await PDFDocument.load(bytes);

    let y = 0;

    const indices = bgPdf.getPages().map((_, i) => i);
    const bgPages = await pdfDoc.embedPdf(bgPdf, indices);

    for (const bgPage of bgPages) {
      const aspect = bgPage.height / bgPage.width;

      const width = PAGE_WIDTH;
      const height = PAGE_WIDTH * aspect;

      const svgPath = `M 0,${y} L ${width},${y} L ${width},${y + height} L 0,${y + height} L 0,${y}`;
      page.drawSvgPath(svgPath, { color: rgb(1, 1, 1) });
      page.drawPage(bgPage, {
        x: x,
        y: page.getHeight() - (y + height + paddingTop * PAGE_WIDTH),
        width: PAGE_WIDTH,
        height: PAGE_WIDTH * aspect,
      });

      y += (aspect + PAGE_GAP) * PAGE_WIDTH;
    }
  }

  // Draw the SVG path as a black line
  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    for (const { graphic } of strokeContainer.getAll()) {
      if (graphic.type == GraphicTypes.VECTOR && graphic.zIndex == layer) {
        const { vector } = graphic as VectorGraphic;
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

  console.log(download);

  // Trigger the browser to download the PDF document
  download(pdfBytes, "pdf-lib_creation_example.pdf", "application/pdf");
}
