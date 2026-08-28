declare module "qrcode" {
  export interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  export function toBuffer(text: string, options?: QRCodeOptions): Promise<Buffer>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toBuffer: typeof toBuffer;
  };

  export default QRCode;
}
