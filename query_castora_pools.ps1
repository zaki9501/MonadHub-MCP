$proxyAddress = "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53"
$implementationAddress = "0x4b838907b08a6d69cab89a1bcc1975aadb62d5f8"
$rpcUrl = "https://testnet-rpc.monad.xyz"
$callerAddress = "0x1234567890123456789012345678901234567890" # Random caller address

# Function to make RPC calls
function Invoke-Web3Call {
    param (
        [string]$data,
        [string]$to = $proxyAddress,
        [switch]$useStateOverride
    )
    
    $callParams = @{
        to = $to
        data = $data
        from = $callerAddress
    }

    $params = @($callParams, "latest")

    if ($useStateOverride) {
        $stateOverride = @{
            "$proxyAddress" = @{
                code = "0x"
                stateDiff = @{
                    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" = "0x000000000000000000000000$($implementationAddress.Substring(2))"
                }
            }
        }
        $params += $stateOverride
    }
    
    $body = @{
        jsonrpc = "2.0"
        method = "eth_call"
        params = $params
        id = 1
    } | ConvertTo-Json -Depth 10

    Write-Host "Sending request to: $to"
    Write-Host "Request data: $data"
    Write-Host "From address: $callerAddress"
    if ($useStateOverride) {
        Write-Host "Using state override: $($stateOverride | ConvertTo-Json)"
    }
    
    try {
        $response = Invoke-RestMethod -Method Post -Uri $rpcUrl -Body $body -ContentType "application/json"
        Write-Host "Response: $($response | ConvertTo-Json)"
        return $response.result
    }
    catch {
        Write-Host "Error making RPC call: $_"
        Write-Host "Request body was: $body"
        return $null
    }
}

# Function to get contract bytecode
function Get-ContractCode {
    param (
        [string]$address
    )
    
    $body = @{
        jsonrpc = "2.0"
        method = "eth_getCode"
        params = @($address, "latest")
        id = 1
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Method Post -Uri $rpcUrl -Body $body -ContentType "application/json"
        return $response.result
    }
    catch {
        Write-Host "Error getting contract code: $_"
        return $null
    }
}

# Function to convert hex to decimal
function Convert-HexToDecimal {
    param (
        [string]$hex
    )
    try {
        if ([string]::IsNullOrEmpty($hex) -or $hex -eq "0x") {
            return 0
        }
        $hex = $hex.TrimStart("0x")
        return [System.Numerics.BigInteger]::Parse($hex, [System.Globalization.NumberStyles]::HexNumber)
    }
    catch {
        Write-Host "Error converting hex ($hex) to decimal: $_"
        return 0
    }
}

Write-Host "`nChecking contract bytecode..."

# Check proxy contract code
$proxyCode = Get-ContractCode -address $proxyAddress
Write-Host "Proxy contract code length: $($proxyCode.Length - 2)"

# Check implementation contract code
$implCode = Get-ContractCode -address $implementationAddress
Write-Host "Implementation contract code length: $($implCode.Length - 2)"

Write-Host "`nTrying different function signatures..."

# Try different function signatures
$functionSignatures = @{
    "totalPools()" = "0x9548ccb5"
    "totalPoolsAlt()" = "0x12aba394"  # Alternative signature
    "poolCount()" = "0x7c5c7e68"
    "getPoolCount()" = "0x274c4f74"
    "activePools()" = "0x9694d500"
}

foreach ($funcName in $functionSignatures.Keys) {
    $signature = $functionSignatures[$funcName]
    Write-Host "`nTesting function: $funcName ($signature)"
    
    # Try direct proxy call
    Write-Host "Direct proxy call:"
    $result = Invoke-Web3Call -data $signature
    Write-Host "Result: $result"
    
    # Try with state override
    Write-Host "`nWith state override:"
    $resultOverride = Invoke-Web3Call -data $signature -useStateOverride
    Write-Host "Result: $resultOverride"
    
    # Try implementation directly
    Write-Host "`nDirect implementation call:"
    $resultImpl = Invoke-Web3Call -data $signature -to $implementationAddress
    Write-Host "Result: $resultImpl"
    
    if (($result -and $result -ne "0x") -or 
        ($resultOverride -and $resultOverride -ne "0x") -or 
        ($resultImpl -and $resultImpl -ne "0x")) {
        Write-Host "Found working function signature: $funcName"
        break
    }
}

# Try to get a specific pool (using different signatures)
$poolSignatures = @{
    "getPool(uint256)" = "0x1e0104f5"
    "pools(uint256)" = "0x5c77860c"
    "poolInfo(uint256)" = "0x1526fe27"
}

Write-Host "`nTrying different pool query signatures..."

foreach ($funcName in $poolSignatures.Keys) {
    $signature = $poolSignatures[$funcName]
    Write-Host "`nTesting function: $funcName ($signature)"
    
    # Try pool ID 1
    $poolId = "0000000000000000000000000000000000000000000000000000000000000001"
    $data = "$signature$poolId"
    
    # Try direct proxy call
    Write-Host "Direct proxy call:"
    $result = Invoke-Web3Call -data $data
    Write-Host "Result: $result"
    
    # Try with state override
    Write-Host "`nWith state override:"
    $resultOverride = Invoke-Web3Call -data $data -useStateOverride
    Write-Host "Result: $resultOverride"
    
    if (($result -and $result -ne "0x") -or ($resultOverride -and $resultOverride -ne "0x")) {
        Write-Host "Found working pool query signature: $funcName"
        break
    }
}

# Token symbol mapping
$TOKEN_SYMBOLS = @{
    "0x0000000000000000000000000000000000000000" = "MON"
    "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53" = "gMON"
}

$PREDICTION_TOKEN_SYMBOLS = @{
    "0x294C2647D9f3EacA43A364859c6E6a1E0E582DBD" = "ETH"
    "0x0ab0Dc55F747ADA00cC15D049CB654bbdc7d5AA6" = "SOL"
    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c" = "HYPE"
}

# Try to get pool details
$maxPools = 5
Write-Host "`nWill try to fetch details for first $maxPools pools"

for ($i = 1; $i -le $maxPools; $i++) {
    Write-Host "`nFetching details for pool $i..."
    $poolIdHex = "{0:X64}" -f $i
    $getPoolData = "0x1e0104f5$poolIdHex"
    $poolData = Invoke-Web3Call -data $getPoolData
    
    if ($poolData -and $poolData -ne "0x") {
        Write-Host "Pool $i Data: $poolData"
        
        # Example parsing (adjust based on actual data structure):
        $dataWithoutPrefix = $poolData.Substring(2)
        $offset = 0
        $length = 64  # 32 bytes in hex

        # Parse seeds struct
        $stakeTokenHex = "0x" + $dataWithoutPrefix.Substring($offset, $length)
        $offset += $length
        $stakeAmountHex = "0x" + $dataWithoutPrefix.Substring($offset, $length)
        $offset += $length
        $snapshotTimeHex = "0x" + $dataWithoutPrefix.Substring($offset, $length)
        $offset += $length
        $predictionTokenHex = "0x" + $dataWithoutPrefix.Substring($offset, $length)
        
        # Convert values
        $stakeToken = $stakeTokenHex.PadRight(42, '0')
        $stakeAmount = Convert-HexToDecimal $stakeAmountHex
        $snapshotTime = Convert-HexToDecimal $snapshotTimeHex
        $predictionToken = $predictionTokenHex.PadRight(42, '0')

        # Format output
        $now = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        $timeLeft = $snapshotTime - $now
        
        if ($timeLeft -gt 0) {
            $hours = [math]::Floor($timeLeft / 3600)
            $minutes = [math]::Floor(($timeLeft % 3600) / 60)
            $seconds = $timeLeft % 60
            $timeLeftStr = "{0:D2}h:{1:D2}m:{2:D2}s" -f $hours, $minutes, $seconds
            
            $stakeTokenSymbol = if ($TOKEN_SYMBOLS[$stakeToken]) { $TOKEN_SYMBOLS[$stakeToken] } else { $stakeToken }
            $predictionTokenSymbol = if ($PREDICTION_TOKEN_SYMBOLS[$predictionToken]) { $PREDICTION_TOKEN_SYMBOLS[$predictionToken] } else { $predictionToken }
            
            Write-Host @"
Pool ID: $i
Status: Open
Asset: $predictionTokenSymbol/USD
Time Left: $timeLeftStr
Entry Fee: $($stakeAmount / 1e18) $stakeTokenSymbol
Prediction Token: $predictionTokenSymbol
"@
        }
    }
    else {
        Write-Host "No data available for pool $i"
    }
} 