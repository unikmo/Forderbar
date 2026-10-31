import test from "node:test";
import assert from "node:assert/strict";
import {validatePartnerCase} from "../src/partner-api-contract.mjs";
const sample = {
 external_case_id:"EX-1",
 consumer:{email:"consumer@example.invalid"},
 claim:{amount_cents:4990,currency:"EUR",debtor:{legal_name:"Example GmbH"}},
 consent:{consumer_transfer_authorized:true,scope:"claim-referral",recorded_at:"2026-10-31T10:00:00Z"}
};
test("valid partner case",()=>assert.equal(validatePartnerCase(sample).valid,true));
test("reject missing consumer consent",()=>assert.equal(validatePartnerCase({...sample,consent:{}}).valid,false));
test("reject invalid amount",()=>assert.equal(validatePartnerCase({...sample,claim:{...sample.claim,amount_cents:-1}}).valid,false));
test("reject missing debtor",()=>assert.equal(validatePartnerCase({...sample,claim:{...sample.claim,debtor:{}}}).valid,false));
