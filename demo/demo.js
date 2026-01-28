/**
 * ZK Payroll Demo - Wave-2 Interactive Features
 * 
 * Demonstrates:
 * - Tab navigation between views
 * - Admin record decryption toggle
 * - Auditor report decryption with privacy shield
 * - ZK budget enforcement simulation
 */

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAdminDecryptToggle();
    initAuditorDecrypt();
    initEnforcementDemo();
});

// ============================================
// TAB NAVIGATION
// ============================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active panel
            panels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetId) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// ============================================
// ADMIN VIEW - DECRYPT TOGGLE
// ============================================

function initAdminDecryptToggle() {
    const toggle = document.getElementById('decryptToggle');
    const salaryTable = document.querySelector('.salary-table');

    // Decrypted values for demo
    const decryptedData = {
        contributors: ['alice.aleo', 'bob.aleo'],
        amounts: ['400 credits', '350 credits'],
        total: '750 credits'
    };

    if (!toggle || !salaryTable) return;

    toggle.addEventListener('change', (e) => {
        const rows = salaryTable.querySelectorAll('.salary-row');
        const totalAmount = salaryTable.querySelector('.total-amount');

        if (e.target.checked) {
            // Decrypt: Show real values
            salaryTable.classList.add('decrypted');

            rows.forEach((row, i) => {
                const contributor = row.querySelector('.contributor');
                const amount = row.querySelector('.amount');

                if (contributor && decryptedData.contributors[i]) {
                    contributor.textContent = decryptedData.contributors[i];
                    contributor.classList.add('revealed');
                }
                if (amount && decryptedData.amounts[i]) {
                    amount.textContent = decryptedData.amounts[i];
                    amount.classList.add('revealed');
                }
            });

            if (totalAmount) {
                totalAmount.textContent = decryptedData.total;
                totalAmount.classList.add('revealed');
            }
        } else {
            // Encrypt: Show masked values
            salaryTable.classList.remove('decrypted');

            rows.forEach(row => {
                const contributor = row.querySelector('.contributor');
                const amount = row.querySelector('.amount');

                if (contributor) {
                    contributor.textContent = '████████████████';
                    contributor.classList.remove('revealed');
                }
                if (amount) {
                    amount.textContent = '████';
                    amount.classList.remove('revealed');
                }
            });

            if (totalAmount) {
                totalAmount.textContent = '████';
                totalAmount.classList.remove('revealed');
            }
        }
    });
}

// ============================================
// AUDITOR VIEW - DECRYPT REPORT
// ============================================

function initAuditorDecrypt() {
    const decryptBtn = document.getElementById('decryptReportBtn');
    const privacyShield = document.getElementById('privacyShield');
    const decryptedReport = document.getElementById('decryptedReport');

    if (!decryptBtn || !privacyShield || !decryptedReport) return;

    let isDecrypted = false;

    decryptBtn.addEventListener('click', () => {
        if (!isDecrypted) {
            decryptAuditReport();
        } else {
            encryptAuditReport();
        }
        isDecrypted = !isDecrypted;
    });

    function decryptAuditReport() {
        // Animate privacy shield fade out
        privacyShield.classList.add('decrypted');

        // Show decrypted content with delay
        setTimeout(() => {
            decryptedReport.classList.remove('hidden');
            decryptedReport.classList.add('visible');
        }, 300);

        // Update button
        decryptBtn.innerHTML = '<span class="key-icon">✅</span> Report Decrypted';
        decryptBtn.classList.add('decrypted');
    }

    function encryptAuditReport() {
        // Hide decrypted content
        decryptedReport.classList.remove('visible');
        decryptedReport.classList.add('hidden');

        // Restore privacy shield
        setTimeout(() => {
            privacyShield.classList.remove('decrypted');
        }, 100);

        // Reset button
        decryptBtn.innerHTML = '<span class="key-icon">🔑</span> Decrypt with Auditor Key';
        decryptBtn.classList.remove('decrypted');
    }
}

// ============================================
// ZK ENFORCEMENT DEMO
// ============================================

function initEnforcementDemo() {
    const attemptBtn = document.getElementById('attemptPayment');
    const amountInput = document.getElementById('paymentAmount');
    const resultBox = document.getElementById('resultBox');
    const successBox = document.getElementById('successBox');

    // State
    const budget = 1000;
    let currentSpent = 750;

    if (!attemptBtn || !amountInput) return;

    attemptBtn.addEventListener('click', () => {
        const amount = parseInt(amountInput.value) || 0;
        const newTotal = currentSpent + amount;

        // Hide both result boxes first
        if (resultBox) resultBox.classList.add('hidden');
        if (successBox) successBox.classList.add('hidden');

        // Small delay for animation effect
        setTimeout(() => {
            if (newTotal > budget) {
                // Budget exceeded - show rejection
                showRejection(amount, newTotal, budget);
            } else {
                // Within budget - show approval
                showApproval(amount, newTotal, budget);
                currentSpent = newTotal; // Update state for next attempt
            }
        }, 100);
    });

    function showRejection(amount, total, limit) {
        if (!resultBox) return;

        document.getElementById('attemptedAmount').textContent = `+${amount} credits`;
        document.getElementById('wouldTotal').textContent = `${total} credits`;
        document.getElementById('constraint').textContent = `${total} > ${limit} ❌`;

        resultBox.classList.remove('hidden');
    }

    function showApproval(amount, total, limit) {
        if (!successBox) return;

        document.getElementById('successAmount').textContent = `+${amount} credits`;
        document.getElementById('newTotal').textContent = `${total} credits`;
        document.getElementById('successConstraint').textContent = `${total} ≤ ${limit} ✅`;

        successBox.classList.remove('hidden');

        // Update the current state display
        updateStateDisplay(total, limit);
    }

    function updateStateDisplay(spent, limit) {
        const stateRows = document.querySelectorAll('.current-state .state-row');
        if (stateRows.length >= 3) {
            stateRows[0].querySelector('.value').textContent = `${spent} credits`;
            stateRows[2].querySelector('.value').textContent = `${limit - spent} credits`;
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format timestamp to readable date
 */
function formatTimestamp(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

/**
 * Simulate network delay for realistic demo
 */
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('🔐 ZK Payroll Demo loaded - Wave-2');
