// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import PdfWorkerJs from "raw-loader!pdfjs-dist/legacy/build/pdf.worker";

export default function handler(req, res) {
  res.status(200).send(PdfWorkerJs);
}
