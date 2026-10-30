// utils/tenantContext.js
// "Which business is making this request?" - remembered for the whole life of
// one request (including every await inside it) with Node's AsyncLocalStorage.
//
// The `protect` middleware sets it once the logged-in user is known. The
// tenantScope plugin (plugins/tenantScope.js) then reads it and quietly adds
// `business = <this business>` to every database query on the shared models,
// so ONE business can never read or change another business's data - even if
// a controller forgets to filter, or someone passes another business's id.
//
// businessId === null means "the original, pre-SaaS workspace" (all data that
// existed before businesses were introduced has no `business` field).
// When there is NO store (login, password reset, scripts, tests) queries are
// not scoped.

const { AsyncLocalStorage } = require('node:async_hooks');

const tenantStorage = new AsyncLocalStorage();

const runInTenant = (businessId, fn) => tenantStorage.run({ businessId: businessId || null }, fn);
const currentTenant = () => tenantStorage.getStore();

module.exports = { tenantStorage, runInTenant, currentTenant };
