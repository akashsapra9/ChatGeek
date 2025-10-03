const storage = require("node-persist");
async function initCounter(){ await storage.init({ dir: "secure-keystore/slc-pstore", forgiveParseErrors: true }); }
async function getAndIncrementCounter(clientId){
  await storage.init();
  const key=`ctr:${clientId}`; const val=(await storage.getItem(key))||0; const next=val+1;
  await storage.setItem(key, next); return next;
}
module.exports = { initCounter, getAndIncrementCounter };
