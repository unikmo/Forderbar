import test from "node:test";
import assert from "node:assert/strict";
import { canAcceptCase, collectionDecision, monitoringDueAt, initialRoute, STATES } from "../src/collection-workflow.mjs";

const valid = {
  accepted: true, accountActive: true, mandateValid: true, outstandingAmount: 49.9,
  matured: true, defaultVerified: true, paymentStatusVerified: true,
  materialDispute: false, legalHold: false, licensedOperatorReady: true, feeBasisReviewed: true
};
test("acceptance requires all checks and qualified approval", () => {
  assert.equal(canAcceptCase({legalBasisConfirmed:true,evidenceSufficient:true,debtorIdentified:true,economicViabilityConfirmed:true,qualifiedApproval:true}),true);
  assert.equal(canAcceptCase({legalBasisConfirmed:true}),false);
});
test("day fifteen is not sufficient to establish default", () => {
  assert.equal(collectionDecision({...valid,defaultVerified:false}).status,STATES.MONITORING);
  assert.equal(monitoringDueAt("2026-10-01T12:00:00Z"),"2026-10-16T12:00:00.000Z");
});
test("prior valid demand permits fast-track review", () => {
  assert.equal(initialRoute({priorDemand:true,defaultVerified:true}),STATES.COLLECTION_REVIEW);
  assert.equal(initialRoute({priorDemand:true,defaultVerified:false}),STATES.DEMAND_APPROVAL);
});
test("payment uncertainty blocks activation", () => {
  assert.equal(collectionDecision({...valid,paymentUncertain:true}).status,STATES.PAYMENT_UNCERTAIN);
});
test("paid and disputed cases do not proceed", () => {
  assert.equal(collectionDecision({...valid,outstandingAmount:0}).status,STATES.PAID);
  assert.equal(collectionDecision({...valid,materialDispute:true}).status,STATES.DISPUTED);
});
test("qualified operator gate and mandate are required", () => {
  assert.equal(collectionDecision({...valid,licensedOperatorReady:false}).status,STATES.COLLECTION_REVIEW);
  assert.equal(collectionDecision({...valid,mandateValid:false}).status,"BLOCKED");
});
test("eligible case is queued for qualified review, not dispatched", () => {
  assert.equal(collectionDecision(valid).status,STATES.COLLECTION_REVIEW);
});
