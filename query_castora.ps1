$contractAddress = "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53"
$rpcUrl = "https://testnet-rpc.monad.xyz"

# Function to make RPC calls
function Invoke-Web3Call {
    param (
        [string]$poolId
    )
    
    # Prepare getPool function call data
    $paddedPoolId = "{0:X64}" -f [int]$poolId
    $getPoolData = "0x1e0104f5" + $paddedPoolId  # keccak256("getPool(uint256)") + poolId
    
    $body = @{
        jsonrpc = "2.0"
        method = "eth_call"
        params = @(
            @{
                to = $contractAddress
                data = $getPoolData
            },
            "latest"
        )
        id = 1
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Method Post -Uri $rpcUrl -Body $body -ContentType "application/json"
        return $response.result
    }
    catch {
        Write-Host "Error querying pool $poolId`: $_"
        return $null
    }
}

# Query first 3 pools
Write-Host "Querying Castora Pools..."
for ($i = 1; $i -le 3; $i++) {
    Write-Host "`nQuerying Pool $i..."
    $result = Invoke-Web3Call -poolId $i
    if ($result) {
        Write-Host "Raw Pool Data: $result"
    }
} 