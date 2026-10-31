param([int]$Port = 4187)
$ErrorActionPreference = 'Stop'
$url = "http://127.0.0.1:$Port/"
try {
  $existing = Invoke-RestMethod -Uri ($url + 'api/bootstrap') -TimeoutSec 2
  if ($existing.environment -eq 'sandbox') { Write-Output $url; exit 0 }
  throw 'Port is occupied by another service. Choose another -Port.'
} catch {
  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listening) { throw "Port $Port is occupied. Choose another -Port." }
}
$data = Join-Path $PSScriptRoot '.data'
New-Item -ItemType Directory -Path $data -Force | Out-Null
$env:PORT = [string]$Port
$env:DOVE_SANDBOX_DATA = $data
$node = (Get-Command node -ErrorAction Stop).Source
Start-Process -FilePath $node -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $data 'preview.log') -RedirectStandardError (Join-Path $data 'preview-error.log') | Out-Null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $result = Invoke-RestMethod -Uri ($url + 'api/bootstrap') -TimeoutSec 2
    if ($result.environment -eq 'sandbox') { Write-Output $url; exit 0 }
  } catch {}
}
throw 'Sandbox did not start. Inspect .data/preview-error.log.'
