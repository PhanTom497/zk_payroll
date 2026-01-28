#!/bin/bash
# =============================================================================
# ZK Payroll - Testnet Audit Evidence Script
# =============================================================================
# 
# PURPOSE: Creates on-chain evidence for grant submission by executing
#          the full audit flow: initialize → pay → generate_audit_report
#
# PREREQUISITES:
#   1. Program deployed to testnet
#   2. Wallet funded with ~1-2 credits for executions
#   3. Environment variables set (see below)
#
# =============================================================================

set -e  # Exit on error

# -----------------------------------------------------------------------------
# CONFIGURATION - MODIFY THESE
# -----------------------------------------------------------------------------

# Your private key (keep secret!)
export PRIVATE_KEY="${PRIVATE_KEY:-YOUR_PRIVATE_KEY_HERE}"

# Auditor address (can be same as admin for testing, or use a second wallet)
export AUDITOR_ADDR="${AUDITOR_ADDR:-aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px}"

# Network configuration
export NETWORK="testnet"
export ENDPOINT="https://api.explorer.provable.com/v1"
export PRIORITY_FEE="100000"

# Payroll configuration
export BUDGET_CEILING="1000u64"
export PAYROLL_ID="1field"
export SALARY_AMOUNT="500u64"
export PAYMENT_ID="100field"

# Timestamp (current time)
export TIMESTAMP=$(date +%s)u32

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------

print_header() {
    echo ""
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
    echo ""
}

print_warning() {
    echo "⚠️  $1"
}

print_success() {
    echo "✅ $1"
}

print_info() {
    echo "ℹ️  $1"
}

# -----------------------------------------------------------------------------
# PRE-FLIGHT CHECKS
# -----------------------------------------------------------------------------

print_header "PRE-FLIGHT CHECKS"

if [ "$PRIVATE_KEY" = "YOUR_PRIVATE_KEY_HERE" ]; then
    print_warning "ERROR: Set your PRIVATE_KEY environment variable!"
    echo "  export PRIVATE_KEY='APrivateKey1zkp...'"
    exit 1
fi

print_info "Private key: Set ✓"
print_info "Network: $NETWORK"
print_info "Endpoint: $ENDPOINT"
print_info "Auditor: $AUDITOR_ADDR"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"
print_info "Working directory: $(pwd)"

# -----------------------------------------------------------------------------
# STEP A: Initialize Payroll
# -----------------------------------------------------------------------------

print_header "STEP A: Initialize Payroll"

echo "Command:"
echo "  leo execute initialize_payroll $BUDGET_CEILING $PAYROLL_ID $AUDITOR_ADDR"
echo ""

read -p "Press Enter to execute (Ctrl+C to cancel)..."

INIT_OUTPUT=$(leo execute initialize_payroll \
    $BUDGET_CEILING \
    $PAYROLL_ID \
    $AUDITOR_ADDR \
    --network $NETWORK \
    --endpoint $ENDPOINT \
    --private-key $PRIVATE_KEY \
    --priority-fee $PRIORITY_FEE 2>&1)

echo "$INIT_OUTPUT"

# Extract records from output (user must copy these)
print_success "Initialize complete!"
echo ""
print_warning "SAVE THE ADMIN_CAP AND SPENT_RECORD FROM THE OUTPUT ABOVE"
echo ""

read -p "Paste AdminCap record: " ADMIN_CAP
read -p "Paste SpentRecord: " SPENT_RECORD

# -----------------------------------------------------------------------------
# STEP B: Create Recipient Ticket + Issue Salary
# -----------------------------------------------------------------------------

print_header "STEP B: Issue Private Salary"

echo "Creating recipient ticket..."

TICKET_OUTPUT=$(leo execute create_recipient_ticket \
    "$ADMIN_CAP" \
    $AUDITOR_ADDR \
    --network $NETWORK \
    --endpoint $ENDPOINT \
    --private-key $PRIVATE_KEY \
    --priority-fee $PRIORITY_FEE 2>&1)

echo "$TICKET_OUTPUT"

read -p "Paste NEW AdminCap from above: " ADMIN_CAP_2
read -p "Paste RecipientTicket from above: " RECIPIENT_TICKET

echo ""
echo "Issuing salary..."

SALARY_OUTPUT=$(leo execute issue_salary \
    "$ADMIN_CAP_2" \
    "$SPENT_RECORD" \
    "$RECIPIENT_TICKET" \
    $SALARY_AMOUNT \
    $PAYMENT_ID \
    --network $NETWORK \
    --endpoint $ENDPOINT \
    --private-key $PRIVATE_KEY \
    --priority-fee $PRIORITY_FEE 2>&1)

echo "$SALARY_OUTPUT"

print_success "Salary issued!"
echo ""

read -p "Paste NEW AdminCap from above: " ADMIN_CAP_3
read -p "Paste NEW SpentRecord (with total_spent): " SPENT_RECORD_2

# -----------------------------------------------------------------------------
# STEP C: Generate Audit Report (PRIMARY EVIDENCE)
# -----------------------------------------------------------------------------

print_header "STEP C: Generate Audit Report"

print_warning "THIS IS YOUR PRIMARY GRANT EVIDENCE!"
echo "Timestamp: $TIMESTAMP"
echo ""

read -p "Press Enter to execute (Ctrl+C to cancel)..."

AUDIT_OUTPUT=$(leo execute generate_audit_report \
    "$ADMIN_CAP_3" \
    "$SPENT_RECORD_2" \
    $TIMESTAMP \
    --network $NETWORK \
    --endpoint $ENDPOINT \
    --private-key $PRIVATE_KEY \
    --priority-fee $PRIORITY_FEE 2>&1)

echo "$AUDIT_OUTPUT"

# Extract transaction ID
TX_ID=$(echo "$AUDIT_OUTPUT" | grep -oP 'at\d+[a-z0-9]+' | head -1)

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------

print_header "AUDIT EVIDENCE COMPLETE"

print_success "All transactions submitted!"
echo ""
echo "📋 GRANT SUBMISSION INFO:"
echo "   Program: zk_payroll.aleo"
echo "   Network: Testnet"
echo ""
echo "🔗 EXPLORER LINKS:"
echo "   https://explorer.provable.com/transaction/${TX_ID}?network=testnet"
echo ""
print_warning "Save the Transaction ID from Step C for your grant 'Prototype' section!"
echo ""
