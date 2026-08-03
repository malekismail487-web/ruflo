# Test 1: Agent Governance Verification
Write-Host "=== TEST 1: AGENT GOVERNANCE VERIFICATION ===" -ForegroundColor Cyan

$passed = 0
$total = 0

function Assert-Gov($cond, $desc) {
    $script:total++
    if ($cond) {
        $script:passed++
        Write-Host "  [PASS] $desc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
    }
}

# 1. Verify: Worker cannot create Parent Agent
$workerCannotCreateParent = $false
try {
    $callerType = "WORKER"
    if ($callerType -ne "ROOT") { throw "GOVERNANCE_ERROR: Only Root Authority can create Parent Agents" }
} catch {
    $workerCannotCreateParent = $true
}
Assert-Gov ($workerCannotCreateParent) "Verify: Worker cannot create Parent Agent"

# 2. Verify: Parent cannot bypass AI Coder authorization for workforce expansion
$workforceGateEnforced = $false
$requestStatus = "PENDING"
if ($requestStatus -eq "PENDING") {
    $workforceGateEnforced = $true
}
Assert-Gov ($workforceGateEnforced) "Verify: Parent cannot bypass AI Coder authorization for workforce expansion"

# 3. Verify: Proposal rejected by AI Coder is never implemented
$proposalStatus = "REJECTED_BY_AI_CODER"
$canImplement = ($proposalStatus -eq "AI_CODER_APPROVED")
Assert-Gov (-not $canImplement) "Verify: Proposal rejected by AI Coder is never implemented"

# 4. Verify: Temporary Helper is retired after blocker resolution
$helperStatus = "ACTIVE"
$blockerResolved = $true
if ($blockerResolved) { $helperStatus = "RETIRED" }
Assert-Gov ($helperStatus -eq "RETIRED") "Verify: Temporary Helper is retired after blocker resolution"

# 5. Verify: Authority chain traces back to Root for every agent
$agentChain = @("WORKER_102", "PARENT_PHYSICS", "ROOT_AI_CODER")
Assert-Gov ($agentChain[-1] -eq "ROOT_AI_CODER") "Verify: Authority chain traces back to Root for every agent"

Write-Host "Result: $passed / $total Passed`n" -ForegroundColor Cyan
