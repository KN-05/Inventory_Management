// utils/escapeRegex.js
// Turns whatever the client sent as a search term into a SAFE literal string
// for MongoDB's $regex.
//
// Why: the search boxes used to put the raw text into { $regex: search }.
// Characters like ( ) * + ? [ ] have special meaning in a regex, so a value
// such as "(a+)+$" can make MongoDB spin on one query (ReDoS) and "(" would
// simply crash the query. Escaping makes the text match literally - typing
// "A+B" finds "A+B" - and String() makes sure a repeated query parameter
// (?search=a&search=b, which arrives as an array) can never be used to slip
// an object into the query.
//
// Usage:  { name: { $regex: escapeRegex(search), $options: 'i' } }

function escapeRegex(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 100) // nobody needs a 10,000-character search term
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
