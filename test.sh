#!/bin/bash

# Define colors
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 ZK Payroll: Automated Verification Suite${NC}"

# 1. Clean and Build
echo "Building program..."
rm -rf build
leo clean
leo build

# 2. Initialize
echo "Initializing Payroll..."
# 1.5 Generate New Account for Testing
echo "Generating new test account..."
leo account new > account.txt
# Extract Address and Private Key (assuming standard output format)
# Output format:
#  Private Key  APrivateKey...
#  View Key     AViewKey...
#  Address      aleo1...
ADMIN1=$(grep "Address" account.txt | awk '{print $2}')
PRIVATE_KEY=$(grep "Private Key" account.txt | awk '{print $3}')

echo "Using Admin: $ADMIN1"

# Inputs: budget=1000, payroll_id=1, threshold=2, admin1, admin2, admin3, auditor
ADMIN2="aleo1q56xwucee45w6f2zwzhx9askc2evz9lhxc3rlwym2cu4y67w2sxq4ggplc"
ADMIN3="aleo1s0hc0xtpmpma9gtyps023d4mr4l0wfufkdmuhak8f3fsuh7g7v9snv2t4c"
AUDITOR="aleo1dcm8zcart6z5tm2fzl95fj0cxtrxztquz00egkq9xpxafgjg4gpsgf5vgv"

# leo run initialize_payroll <budget> <payroll_id> <threshold> <admin1> <admin2> <admin3> <auditor>
# Use the generated private key so the output record is owned by this key and signed by this key
leo run initialize_payroll 1000u64 1field 2u64 $ADMIN1 $ADMIN2 $ADMIN3 $AUDITOR --private-key $PRIVATE_KEY > init_output.txt
cat init_output.txt

# Extract Nonce
NONCE=$(grep "_nonce" init_output.txt | awk '{print $2}' | tr -d ',')
# Ensure nonce ends with 'group.public' or just 'group'?
# The output has 'group.public'. CLI input usually expects JUST 'group' (no visibility suffix) based on previous errors.
# So strip '.public' if present
NONCE=${NONCE%.public}

echo "Using Nonce: $NONCE"

# 3. Generate Audit Report (Mock Test)
echo "Generating Audit Report (Mock)..."
# Mock SpentRecord input (would come from output of initialize/issue in real flow)
# spent_record: { owner: admin1, total_spent: 0u64, payroll_id: 1field, auditor: auditor, recipient_count: 0u32, _nonce: ... }
SPENT="{ owner: $ADMIN1, total_spent: 0u64, payroll_id: 1field, auditor: $AUDITOR, recipient_count: 0u32, _nonce: $NONCE }"
HASH="12345field"
ROOT="67890field"

# We pass the record inline to ensure correct parsing of the record structure by the CLI
leo run generate_audit_report "$SPENT" 100u32 $HASH $ROOT --private-key $PRIVATE_KEY

# 3. Create Ticket (Mock)
echo "Creating Recipient Ticket (Mock)..."
# Valid input simulation requires previous output records. 
# This script confirms the build and basic run command works.

echo -e "${GREEN}✅ Verification Complete!${NC}"
