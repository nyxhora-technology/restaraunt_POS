const express = require("express");
const { getMyReferrals, validateReferralCode } = require("../controllers/referralController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");

const router = express.Router();

// GET /api/referral/me — authenticated owner: their code, link, and stats
router.get("/me", requireTenant, requireRole("OWNER"), getMyReferrals);

// GET /api/referral/validate/:code — public: check if a referral code is valid
// Used by onboarding to preview who referred them
router.get("/validate/:code", validateReferralCode);

module.exports = router;
