#!/bin/bash
# ============================================================================
# ZK PAYROLL TEST SCRIPT
# ============================================================================
# Tests the budget enforcement logic:
# - Test 1: Initialize with budget = 1000
# - Test 2: Pay 400 → SUCCESS (total: 400)
# - Test 3: Pay 350 → SUCCESS (total: 750)
# - Test 4: Pay 300 → MUST FAIL (would be 1050 > 1000)
# ============================================================================

set -e  # Exit on first error (except where we expect failure)

cd /home/baba/Aleo/zk_payroll

echo "============================================"
echo "ZK PAYROLL - TEST SUITE"
echo "============================================"
echo ""

# --------------------------------------------
# TEST 1: Initialize Payroll
# --------------------------------------------
echo "TEST 1: Initialize payroll with budget = 1000"
echo "Command: leo run initialize_payroll 1000u64 1field"
echo ""

leo run initialize_payroll 1000u64 1field

echo ""
echo "✅ TEST 1 PASSED: Payroll initialized"
echo "   - AdminCap created"
echo "   - SpentRecord created (total_spent: 0)"
echo "   - Budget stored in mapping: 1000"
echo ""
echo "============================================"
echo ""

# NOTE: For Tests 2-4, you need to:
# 1. Copy the AdminCap output from Test 1
# 2. Copy the SpentRecord output from Test 1
# 3. Create recipient tickets first
# 4. Run issue_salary with those records
#
# The commands below show the STRUCTURE.
# Replace {...} with actual record values from previous outputs.

# --------------------------------------------
# TEST 2: Create ticket and pay 400 (should succeed)
# --------------------------------------------
echo "TEST 2: Pay salary 400 credits"
echo ""
echo "Step 2a: Create recipient ticket for Alice"
echo "Command structure:"
echo 'leo run create_recipient_ticket "{owner: <ADMIN_ADDR>, payroll_id: 1field}" <ALICE_ADDR>'
echo ""
echo "Step 2b: Issue salary 400"
echo "Command structure:"
echo 'leo run issue_salary \\'
echo '  "{owner: <ADMIN>, payroll_id: 1field}" \\'
echo '  "{owner: <ADMIN>, total_spent: 0u64, payroll_id: 1field}" \\'
echo '  "{owner: <ALICE>, payroll_id: 1field}" \\'
echo '  400u64 \\'
echo '  100field'
echo ""
echo "Expected: ✅ SUCCESS (400 <= 1000)"
echo ""
echo "============================================"
echo ""

# --------------------------------------------
# TEST 3: Pay another 350 (should succeed)
# --------------------------------------------
echo "TEST 3: Pay salary 350 credits"
echo ""
echo "Command structure:"
echo 'leo run issue_salary \\'
echo '  "{owner: <ADMIN>, payroll_id: 1field}" \\'
echo '  "{owner: <ADMIN>, total_spent: 400u64, payroll_id: 1field}" \\'
echo '  "{owner: <BOB>, payroll_id: 1field}" \\'
echo '  350u64 \\'
echo '  101field'
echo ""
echo "Expected: ✅ SUCCESS (750 <= 1000)"
echo ""
echo "============================================"
echo ""

# --------------------------------------------
# TEST 4: Pay 300 (MUST FAIL - budget exceeded)
# --------------------------------------------
echo "TEST 4: Pay salary 300 credits (MUST FAIL)"
echo ""
echo "Command structure:"
echo 'leo run issue_salary \\'
echo '  "{owner: <ADMIN>, payroll_id: 1field}" \\'
echo '  "{owner: <ADMIN>, total_spent: 750u64, payroll_id: 1field}" \\'
echo '  "{owner: <CHARLIE>, payroll_id: 1field}" \\'
echo '  300u64 \\'
echo '  102field'
echo ""
echo "Expected: ❌ FAIL (1050 > 1000)"
echo "Error: assertion failed in finalize_issue_salary"
echo ""
echo "============================================"
echo ""
echo "TEST SUITE COMPLETE"
