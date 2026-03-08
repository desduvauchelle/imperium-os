// Declare optional Bun global so TypeScript doesn't error when @imperium/core-db
// checks `typeof globalThis.Bun` at runtime for Bun/Node.js detection.
export {}
declare global {
  var Bun: unknown // eslint-disable-line no-var
}
