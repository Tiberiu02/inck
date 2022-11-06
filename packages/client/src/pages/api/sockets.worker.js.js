// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import WsWorkerJs from "raw-loader!../../canvas/Network/ws-worker";

export default function handler(req, res) {
  res.status(200).send(WsWorkerJs);
}
