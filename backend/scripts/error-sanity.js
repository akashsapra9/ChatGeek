// Sends:
//   1) SERVER_HELLO_LINK (teaches our pubkey)
//   2) signed SERVER_DELIVER for an unknown user
// Expects:
//   <-- ERROR { code: "USER_NOT_FOUND", ... }

require("dotenv").config();
const fs = require("fs");
const WebSocket = require("ws");
const { signPayload } = require("../network/crypto/signing");

const PORT = parseInt(process.env.MESH_WS_PORT || "7081", 10);
const URL  = `ws://127.0.0.1:${PORT}`;

// Dummy peer identity
const PEER_ID = require("crypto").randomUUID();

// Load dummy peer keys from env or fallback files created in Step 6.5
function readB64u(name, file) {
  if (process.env[name]) return process.env[name].trim();
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  return null;
}
const PEER_PUB  = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFxT0orZ0ZGbDBPb0NzZlByUzJ1MApjc2VUNU5FV1JMbFhpa0I2dldFb1RWeFl3bjlIYndYeXFIaEVYbDBNL2VvaDVabk1YYVlYYlhBNjFrTWRDaSt3CllNaGxIbDBsQng3M3owVGdZb1p2SmNxdUtOaXhtbmRkNXVzQW4yMHNTRHppVGhLc082ZkhhWWF5QTQ3cTBlWUcKWGdLejBYOHFiWEFNL0UyblA5T1E0UUJSUkE2c1ZudTlYcVNSZGFoWmVUOXd1WG1FMnV2NExOMVFUaXdWREMrMgo2U0xZK3lUckdpQVZjdi9kZmJpaWhOeFpvaFprTXNucUpYUlk0RDBIR0VaeTNRQjlEQWlBSkY5V1JFRVFKYVZXCkR4V0d3eDcyVjNIdnMwd1BJbGlxS3ZGQUFGcDMvZ3pDdmJ6Qi9GQjArSDFoNi9tSTk3V0xMa1ZscWg1Rk0vcmEKK2dTc1pRTFpOOEhWNndtZW1wSURHQXBHTWdBem8wNEEzQUdONTVXcFlFa3hVbG5pVjJHMjY4QzBXZkd2Z0pJWApCd0dJQjVKMGlqa3U1QXhJblBGVnpmSGxLRjIvVHJRRWN5MjVCcXlVWnVBMUlJWHVySFVDVmcvUlFSMGRwVnZvCnExUXYwdGxtS1VZa2dramZ0V3QrYUdiZEpQbGFycXcxU2lWLzVCK3UvZDR6UmtWV3UxRU42VU8xNlRyRm9wM2kKdlc2Qmt0UHBkRzRseWx5NzZuakQwbVBMQ0d1WURvNmtXSWJqQ096MjVoU21mTkw1Z1MySm1HckpWS0U5QVNwTApyaDNIV2FpSktNa2gza0ZyYWdhZVNxNGd1ODloS2Fjb3pFU1NGb0w3ZXgzbHZZSVFkTk1tTXRDK2c0ejNsVC9pCndFTnVQTHdvbHVvaHo1OGpUY251RlZVQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo";
const PEER_PRIV = "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUpRd0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQ1Mwd2dna3BBZ0VBQW9JQ0FRQ280bjZBVVdYUTZnS3gKOCt0TGE3Unl4NVBrMFJaRXVWZUtRSHE5WVNoTlhGakNmMGR2QmZLb2VFUmVYUXo5NmlIbG1jeGRwaGR0Y0RyVwpReDBLTDdCZ3lHVWVYU1VISHZmUFJPQmlobThseXE0bzJMR2FkMTNtNndDZmJTeElQT0pPRXF3N3A4ZHBocklECmp1clI1Z1plQXJQUmZ5cHRjQXo4VGFjLzA1RGhBRkZFRHF4V2U3MWVwSkYxcUZsNVAzQzVlWVRhNi9nczNWQk8KTEJVTUw3YnBJdGo3Sk9zYUlCVnkvOTE5dUtLRTNGbWlGbVF5eWVvbGRGamdQUWNZUm5MZEFIME1DSUFrWDFaRQpRUkFscFZZUEZZYkRIdlpYY2UrelRBOGlXS29xOFVBQVduZitETUs5dk1IOFVIVDRmV0hyK1lqM3RZc3VSV1dxCkhrVXordHI2Qkt4bEF0azN3ZFhyQ1o2YWtnTVlDa1l5QURPalRnRGNBWTNubGFsZ1NURlNXZUpYWWJicndMUloKOGErQWtoY0hBWWdIa25TS09TN2tERWljOFZYTjhlVW9YYjlPdEFSekxia0dySlJtNERVZ2hlNnNkUUpXRDlGQgpIUjJsVytpclZDL1MyV1lwUmlTQ1NOKzFhMzVvWnQwaytWcXVyRFZLSlgva0g2Nzkzak5HUlZhN1VRM3BRN1hwCk9zV2luZUs5Ym9HUzArbDBiaVhLWEx2cWVNUFNZOHNJYTVnT2pxUllodU1JN1BibUZLWjgwdm1CTFltWWFzbFUKb1QwQktrdXVIY2RacUlrb3lTSGVRV3RxQnA1S3JpQzd6MkVwcHlqTVJKSVdndnQ3SGVXOWdoQjAweVl5MEw2RApqUGVWUCtMQVEyNDh2Q2lXNmlIUG55Tk55ZTRWVlFJREFRQUJBb0lDQUVRa3E0MUVDclNLajQ3VkVFWXN6YkVZCmRVUzQxdWJnOEFFQk5tVXVqQy8yeUh1bUZxRW1BYnpYVmlMTEllQmNOZFFxUStzdmhybHFOTnRhVmgvVGtUUGoKOStVU0NVdy93eGEzUUdDUXhNMDNaQ0ZvR2ZWdEg0NzZtSlE3WFVoQ2hMK2l5aXNCN2pUV25BSlNpczRwcGIwTwpFeGMvVzlPdmlCWFBrV0h3RUQreFBKa2M0STIrdlBDd3IxNk5rSmliTC9VdW9wd2c1VkRZOWJ1dERzc05mNXkvCktsVGZseHRDQWRXV2h2emc0SGFDWUlwRnhhVTJrb3NOVUlVZUtyd3hSTXlHazI0bENldGpLbkE4M25LS0xWakYKdzB2OHRNSWczMnAxa0krM3ZlVzQxUzJ2VTBaSFNOWjlFTHFwamlEcm1uUzRDWHVGbllTTWpOSmhCMlJMWGtvbAp4SFQ3WlE0WURkK0czdU9ReWJqbUdHWXI2UGJRYnVwdXdoeVIzeFNqbmU3cVhRRm8vbzlOOUozMTRaME54T2hzCmJNc2lXVnRqN3d3dHNPQ1B3dHFuSDdnVlNKdnoySHp5MlJxZzZIcm43N01qbWcrWk5HV04xbGlQTXZTQzB6VDgKUDVXakxaSFdhSTB6RnVELzcwejcreUE1S25JeFM0amIzdWora1l4cld6NzR3Zlg1b2F6OTF0elVycEhKRG5McQozUHF2YlJDYlR1enV1SHdTNENoRVF4UFJWZTJFY3d0bTdOVkNIandNMkxsMGRWVXVvTXo3R2hia1MxSTZLMG9vClZxakVJSS9pTFdtdEVSTjdOVVNJcmZlQzZxSHp1V0FKQlVtcGU2aUlSRDYyVEVOblhTTFVabDNRNEpmTnFPS3EKUjRLbTE1Mkk3MVFDZ2ptT3FCZmJBb0lCQVFEa3RxcFJCdmphbElXcXc4cDhncDBzcjNtRk12TnFHamJnNmlBbAp4MEs3VVIvaXpWdG43VFpkdHZ4V3B3VEo4eTB0ZkZxbXhsTllZVlkzek92NFFYUHlhaEFVa2pCMDNqdjl0TmY4Cm83NGIvWHRhalVKSTJhdVFrdDYwWWQwL3JMcVp0WUJhRmhFS3YxUHBPMGNJY3dMQzB2Uzh4NWl4SzJDUE5xTkIKOCtneldXK3dJUWZBWE1KK3hpMUtIdFNuUVg2Mi9RamZmcGpNMWJRdWNCcW1PbTR1bU5wQUpsZ0R6OXYzNnRkeApYdVFuWlVUcmF3aUVhNXZsK0RUSURyT003bTBpQk1xSkZWVnZPcWU0MElhK29xcGw2eER4WWhkK2txNjQ1dzhRCkFxR0VWUXVSRGRxQTB5V2sreW9sNUhsdXNkRFVVQ0xyTkMvZDcwK1l0YzZQVXpWdkFvSUJBUUM5Q0l2NGVsS2sKVWpzQkNDNzhQSWxvZ2l1S2pjNGJEbXU0NDBzRVNyUkg2UXpUekQrR2FPdHZod0xjVDhBL1FYTGdpK29jNnhPYwp1Z1JDckFhenJwTnFrdER5Unc1Z0JaRitZamdiVmR5UGkvaVJpWnUvRlRiZW1rbU5lNGJYem4wVVZONFVuY29kCnVCcFZJTUpCWHZ2VmpxQ3JUSy9XdFdCVjJNQm5jVitjcHZFaURNU1FiZHpCL0RPZkJ1dy96bkRxTGZPT1pEN1gKcVdrN25qYTZaNDRPQmZZbXZkN0Y0UGkvTXJRZWNXNlB3TGxocTR3Q0xZWDhRWG8rK1lialFGcFR2Tzd5bU53MwplRUtpbE9QVWkwYUtIM0thSzNXdEN6TXhmdmJVT3JSNVVLZkZhRGU1V1hRZEcrVUNudFZDYXlPbTRPaGxaQ01lCnk3dFdZc1VRYUtkN0FvSUJBUURJTFZoRU11WDc2YUpVSTZsRjhNdkFJSlVyajd5Y1VQVlhSWk45ZlRsYTJWWWYKRzcyMDZGbDlESHN2SEYrRW9lSVl2WTVhQ1p0STcyaVd6alI1eEUvSERDMm0wNHkxdlF5a3NYT1pHM2Q0NkJMZQozbVAxZnc0NksxSGdid2RHZzllT1VOMVYrNXBPM2NhRGkrNVA1dG16eXcrSmF1aXBxRjJLK3pkSXNrRzVMNzRoCldjZC9CYkQxWkY2ZlVQeXVweFJROUlhZmxoNEdxY1JhSUtReWVWR1dWeEl1czJDMWRXZ0JSUG5yc0RIZ2lUSVoKR2tVS0lXVUJrb3dmelQ0NVN6VVpZVGdqWXhpemtaTGFueWhRRWU4eDVOdWZhVXRHN1BzZnVwdmtWMmttZVlqMgpIRG55SnR2NzJoaTVzWTdXNDZyektIQm5pL1daT2F0ZzdUOHRFcGJoQW9JQkFDT1RialJQWVNwSHg0OEVLVU9UCmFSRGdIcTJ1em5GTkgzem1XZ0h1eFVzYlV5eXhMZXR2NTQ5UHkzd0hEbGxaU2ZOMG9aVGJzUTgzK3dGSk91R3EKSTFoVlZUbWpvZEwwZVZOZHpNMW9OV0JXcVd0S2lLTkhyTkhzRzVlaS9kZXpwdHFpdGtFUENURGFxeW9HUmtqagpSV1lGdDd0RmJYcHRIRHBMMXJvaEhpdHZSOFp1dkxlcDFYZzByTXByRlI5VkRPOGx3c2F6bXhnZmJBeXFWQVowCjRzbEUyZlNrbXo2R2Zvb05VdFMvNkZ6cG1ub0ZQUTVUM3ZtQW9TOGs2dnZ0NnBJRDVyeUZoRHgwUjZZdGUwdFAKQXZHUHhaTzZSaVZSREV0dVo2bTllcVd5UmtEaXdrb0J5ZGFJbjJzRTFZSHdnLzh1S002Y0wvZmx3OVlZTkpwSAo5KzBDZ2dFQkFLZDM1anliQ2VOaGdycXg5aUsyenBSTk1Bc1BsVm1rTm8yeG9VZXpDaFBNaEFNVWlzTjdoaVBGCm56eWFubDYrVmdOZDk3b29Nc1drVTBCVXF3ckhXMTFBNEpMSEpzNnBUYWwvME81b0hDNlgzcnE4YUhlbHdUVHUKZjlSWlZOQmkxdG1TUWZuS2pYa1lET1c4eGx0cHhpdDB0ekdKTDB2THpYNFd0UDltMmpDVjdXb0FwWGhvSktxSwpvUmNoM0hKYjBXYkZEMlR3U3Z4dUZyQ2RTSlp3Y05xTzVDY3ZSU2dYT3ZJVUl5dGQva3hQNVdtR3A3MHVzTG1LCkp6WjdjNnNhQlVzRlpCL1B0S2gzblJvZXlnOU9FNFoxRW5mU3oyVnRIdk1UbFF0UDVaY3hhckczUmx5a3Y5M04KMEVUdFE5d2R5bXMvN0ZPS2xBWHpIM2tLVkgxVnVLaz0KLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo";

if (!PEER_PUB || !PEER_PRIV) {
  console.error("[error-sanity] Missing dummy peer keys.");
  console.error("Run Step 6.5 (B) to generate them, or export:");
  console.error("  export DUMMY_PEER_PRIVATE_KEY_B64URL=$(cat DUMMY_PEER_PRIVATE_KEY_B64URL.txt)");
  console.error("  export DUMMY_PEER_PUBLIC_KEY_B64URL=$(cat DUMMY_PEER_PUBLIC_KEY_B64URL.txt)");
  process.exit(2);
}

function send(ws, frame) {
  ws.send(JSON.stringify(frame));
}
const now = () => Date.now();

(async function main() {
  const ws = new WebSocket(URL);

  ws.on("open", async () => {
    console.log(`[error-sanity] connected to ${URL}`);
    // 1) Handshake (server learns our pubkey)
    const hello = {
      type: "SERVER_HELLO_LINK",
      from: PEER_ID,
      to: "*",
      ts: now(),
      payload: { url: "ws://dummy-peer", pubkey_b64url: PEER_PUB },
    };
    send(ws, hello);

    // 2) Signed SERVER_DELIVER to an unknown user -> expect ERROR(USER_NOT_FOUND)
    const payload = {
      user_id: "UNKNOWN-USER",     // deliberately not mapped
      ciphertext: "<opaque>",
      sender: "SENDER-UUID",
    };
    const sig = await signPayload(payload, PEER_PRIV);

    setTimeout(() => {
      const deliver = { type: "SERVER_DELIVER", from: PEER_ID, to: "*", ts: now(), payload, sig };
      console.log("[error-sanity] sending signed SERVER_DELIVER to UNKNOWN-USER …");
      send(ws, deliver);
    }, 200);

    // Quit shortly after we see an ERROR, or after timeout
    const timeout = setTimeout(() => {
      console.error("[error-sanity] timed out waiting for ERROR");
      process.exit(1);
    }, 2000);

    ws.on("message", (buf) => {
      try {
        const msg = JSON.parse(buf.toString("utf8"));
        console.log("<<", msg);
        if (msg.type === "ERROR") {
          clearTimeout(timeout);
          if (msg.payload?.code === "USER_NOT_FOUND") {
            console.log("[error-sanity] ✅ got USER_NOT_FOUND as expected");
            process.exit(0);
          } else {
            console.log("[error-sanity] got ERROR (unexpected code):", msg.payload?.code);
            process.exit(1);
          }
        }
      } catch {}
    });
  });

  ws.on("error", (e) => {
    console.error("[error-sanity] ws error:", e.message);
    process.exit(2);
  });
})();
