// plugins/tenantScope.js
// Mongoose plugin that makes a model multi-tenant.
//
//  * adds a `business` field (null = the original workspace);
//  * while a request is running (see utils/tenantContext.js) every query
//    (find, update, delete, count, aggregate...) is limited to that business;
//  * every NEW document is stamped with that business, whatever the client sent.
//
// Outside a request (no tenant context) nothing is changed.

const mongoose = require('mongoose');
const { currentTenant } = require('../utils/tenantContext');

const QUERY_OPERATIONS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'distinct',
];

function tenantScope(schema) {
  schema.add({
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
  });

  // Queries: where() REPLACES any `business` condition that was already there,
  // so a caller cannot widen the scope by passing its own.
  function scopeQuery() {
    const ctx = currentTenant();
    if (ctx) this.where({ business: ctx.businessId });
  }
  QUERY_OPERATIONS.forEach((op) => schema.pre(op, { query: true, document: false }, scopeQuery));

  // Aggregations: a $match on business goes first, before any $lookup/$group.
  schema.pre('aggregate', function scopeAggregate() {
    const ctx = currentTenant();
    if (ctx) this.pipeline().unshift({ $match: { business: ctx.businessId } });
  });

  // New documents are always stamped with the caller's business.
  schema.pre('save', function stampBusiness() {
    const ctx = currentTenant();
    if (ctx && this.isNew) this.business = ctx.businessId;
  });
}

module.exports = tenantScope;
