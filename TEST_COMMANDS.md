# ============================================================================
# ZK PAYROLL - STEP-BY-STEP TEST COMMANDS
# ============================================================================
# Run these commands SEQUENTIALLY in the zk_payroll directory.
# Each step depends on outputs from previous steps.
# ============================================================================

# SETUP: Define test addresses
# Replace these with your actual test addresses from `leo account new`
ADMIN="aleo1..."  # Your admin address
ALICE="aleo1..."  # Contributor 1
BOB="aleo1..."    # Contributor 2
CHARLIE="aleo1..." # Contributor 3 (for failure test)

# ============================================================================
# TEST 1: Initialize Payroll (budget = 1000)
# ============================================================================
# VERIFY: AdminCap and SpentRecord are created
#         payroll_budgets mapping contains 1000

leo run initialize_payroll 1000u64 1field

# EXPECTED OUTPUT:
# - AdminCap { owner: <ADMIN>, payroll_id: 1field }
# - SpentRecord { owner: <ADMIN>, total_spent: 0u64, payroll_id: 1field }
# - Future for finalize (stores budget in mapping)

# ============================================================================
# TEST 2a: Create Recipient Ticket for Alice
# ============================================================================
# Replace <ADMIN_CAP> with actual AdminCap output from Test 1

leo run create_recipient_ticket \
  "{ owner: aleo1..., payroll_id: 1field }" \
  aleo1alice...

# ============================================================================
# TEST 2b: Pay Alice 400 credits
# ============================================================================
# VERIFY: Transaction succeeds
#         new_total_spent = 400 (400 <= 1000)
# Replace records with actual outputs from previous steps

leo run issue_salary \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  "{ owner: aleo1admin..., total_spent: 0u64, payroll_id: 1field }" \
  "{ owner: aleo1alice..., payroll_id: 1field }" \
  400u64 \
  100field

# EXPECTED: ✅ SUCCESS
# OUTPUT: SpentRecord with total_spent: 400u64

# ============================================================================
# TEST 3a: Create Recipient Ticket for Bob
# ============================================================================

leo run create_recipient_ticket \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  aleo1bob...

# ============================================================================
# TEST 3b: Pay Bob 350 credits
# ============================================================================
# VERIFY: Transaction succeeds
#         new_total_spent = 750 (750 <= 1000)

leo run issue_salary \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  "{ owner: aleo1admin..., total_spent: 400u64, payroll_id: 1field }" \
  "{ owner: aleo1bob..., payroll_id: 1field }" \
  350u64 \
  101field

# EXPECTED: ✅ SUCCESS
# OUTPUT: SpentRecord with total_spent: 750u64

# ============================================================================
# TEST 4a: Create Recipient Ticket for Charlie
# ============================================================================

leo run create_recipient_ticket \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  aleo1charlie...

# ============================================================================
# TEST 4b: Pay Charlie 300 credits (MUST FAIL)
# ============================================================================
# VERIFY: Transaction FAILS in finalize
#         new_total_spent would be 1050 (1050 > 1000)

leo run issue_salary \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  "{ owner: aleo1admin..., total_spent: 750u64, payroll_id: 1field }" \
  "{ owner: aleo1charlie..., payroll_id: 1field }" \
  300u64 \
  102field

# EXPECTED: ❌ FAIL
# ERROR: "assertion failed" in finalize_issue_salary
#        because 1050 > 1000

# ============================================================================
# ALTERNATIVE TEST 4b: Pay Charlie 250 credits (should succeed)
# ============================================================================
# If you want to verify the boundary works:

leo run issue_salary \
  "{ owner: aleo1admin..., payroll_id: 1field }" \
  "{ owner: aleo1admin..., total_spent: 750u64, payroll_id: 1field }" \
  "{ owner: aleo1charlie..., payroll_id: 1field }" \
  250u64 \
  102field

# EXPECTED: ✅ SUCCESS
# OUTPUT: SpentRecord with total_spent: 1000u64 (exactly at limit)
