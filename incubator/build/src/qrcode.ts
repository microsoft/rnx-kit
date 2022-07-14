import type { Ora } from "ora";
import qrcode from "qrcode";

const POINT_DOWN =
  "  ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓";
const POINT_UP =
  "  ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑";
const TEXT = "Scan the QR code to download your app";

export function renderQRCode(url: string, spinner: Ora): void {
  qrcode.toString(url, { type: "terminal" }, (_err, qr) => {
    spinner.info(TEXT);
    console.log(POINT_DOWN);
    console.log(qr);
    console.log(POINT_UP);
    spinner.info(TEXT);
    spinner.info(`or use a web browser to open ${url}`);
  });
}
