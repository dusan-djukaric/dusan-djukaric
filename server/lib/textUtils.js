// Normalize typographic characters to ASCII so they are safe in S3 metadata headers.
// S3 metadata values must be ASCII-only (HTTP header constraint).
const TYPOGRAPHIC_MAP = {
  '\u2012': '-', '\u2013': '-', '\u2014': '-', // figure, en, em dash → hyphen
  '\u2018': "'", '\u2019': "'",                 // curly single quotes → straight
  '\u201C': '"', '\u201D': '"',                 // curly double quotes → straight
};

const normalizeTypographic = (s) => (s || '')
  .replace(/[\u2012\u2013\u2014\u2018\u2019\u201C\u201D]/g, c => TYPOGRAPHIC_MAP[c])
  .replace(/[^\x20-\x7E]/g, '')
  .trim();

module.exports = { normalizeTypographic };
