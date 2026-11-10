declare module "potrace" {
  interface TraceOptions {
    turdSize?: number;
    optTolerance?: number;
    threshold?: number;
  }
  const potrace: {
    trace(input: Buffer, options: TraceOptions, callback: (error: Error | null, svg: string) => void): void;
  };
  export default potrace;
}
