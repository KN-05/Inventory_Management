// utils/toCsv.js
// PHASE 9: turns an array of plain objects into a CSV string. No new
// dependency needed for this - CSV output for flat, simple data is just
// "join fields with commas, escape the awkward ones" - so this stays a
// small hand-rolled helper instead of pulling in a csv-stringify package
// (the project already has csv-parse for *reading* CSVs; writing them
// back out doesn't need a library at this scale, per the spec's "check
// whether the existing project already provides an alternative" rule).

// A field needs quoting if it contains a comma, a double quote, or a
// newline - any double quotes inside get doubled, which is the standard
// CSV escaping rule.
function escapeField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// `columns` is an array of { key, label } - `key` supports dot-notation
// for nested fields (e.g. 'category.name'), `label` is the header text.
function toCsv(rows, columns) {
  const header = columns.map((c) => escapeField(c.label)).join(',');

  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = c.key.split('.').reduce((obj, key) => obj?.[key], row);
        return escapeField(value);
      })
      .join(',')
  );

  return [header, ...lines].join('\r\n');
}

module.exports = toCsv;
