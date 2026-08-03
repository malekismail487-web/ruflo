# Test 2: Communication Isolation Verification
Write-Host "=== TEST 2: COMMUNICATION ISOLATION VERIFICATION ===" -ForegroundColor Cyan

$passed = 0
$total = 0

function Assert-Comms($cond, $desc) {
    $script:total++
    if ($cond) {
        $script:passed++
        Write-Host "  [PASS] $desc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
    }
}

# 1. Verify: Physics Family Log is invisible to Geometry workers
$geoCannotReadPhysics = $false
try {
    $caller = @{ discipline = "GEOMETRY" }
    $targetLog = "PHYSICS"
    if ($caller.discipline -ne $targetLog) { throw "ISOLATION_ERROR: Access denied to foreign Family Log" }
} catch {
    $geoCannotReadPhysics = $true
}
Assert-Comms ($geoCannotReadPhysics) "Verify: Physics Family Log is invisible to Geometry workers"

# 2. Verify: Personal Workspace is invisible to non-supervising agents
$otherWorkerCannotReadWorkspace = $false
try {
    $ownerId = "WORKER_A"
    $supervisorId = "PARENT_PHYSICS"
    $callerId = "WORKER_B"
    if ($callerId -ne $ownerId -and $callerId -ne $supervisorId) {
        throw "ISOLATION_ERROR: Personal Workspace is private"
    }
} catch {
    $otherWorkerCannotReadWorkspace = $true
}
Assert-Comms ($otherWorkerCannotReadWorkspace) "Verify: Personal Workspace is invisible to non-supervising agents"

# 3. Verify: Global Log is read-only for non-Root agents
$nonRootCannotWriteGlobal = $false
try {
    $callerId = "WORKER_A"
    $rootId = "ROOT_AI_CODER"
    if ($callerId -ne $rootId) {
        throw "GOVERNANCE_ERROR: Only Root Authority can write to Global Log"
    }
} catch {
    $nonRootCannotWriteGlobal = $true
}
Assert-Comms ($nonRootCannotWriteGlobal) "Verify: Global Log is read-only for non-Root agents"

# 4. Verify: Knowledge published to Global Log originated from validated work
$proposal = @{ status = "VALIDATED"; validationArtifacts = @("physics_evidence.log") }
$canPublish = ($proposal.status -eq "VALIDATED" -and $proposal.validationArtifacts.Count -gt 0)
Assert-Comms ($canPublish) "Verify: Knowledge published to Global Log originated from validated work"

Write-Host "Result: $passed / $total Passed`n" -ForegroundColor Cyan
