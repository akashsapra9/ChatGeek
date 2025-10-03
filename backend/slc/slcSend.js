const { buildEnvelope } = require("./slcClient");
const { getAndIncrementCounter } = require("./counter");
async function slcSend(ws, op, body, clientId="ui.local"){
  const env = buildEnvelope(op, body);
  env.counter = await getAndIncrementCounter(clientId);
  ws.send(JSON.stringify(env));
}
module.exports = { slcSend };
