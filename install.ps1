param([switch]$SystemWide)
$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensionName = 'com.monstizo.seamlesscarousel'
$userTarget = Join-Path $env:APPDATA "Adobe\CEP\extensions\$extensionName"
New-Item -ItemType Directory -Force -Path $userTarget | Out-Null
Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $userTarget -Recurse -Force
9..13 | ForEach-Object { New-Item -Path "HKCU:\Software\Adobe\CSXS.$_" -Force | Out-Null; New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.$_" -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null }
if ($SystemWide) {
    $commonRoot = 'C:\Program Files (x86)\Common Files\Adobe\CEP\extensions'
    $systemTarget = Join-Path $commonRoot $extensionName
    New-Item -ItemType Directory -Force -Path $systemTarget | Out-Null
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $systemTarget -Recurse -Force
}
Write-Host "Installed Seamless Carousel to $userTarget"
Write-Host 'Restart Photoshop, then open Window > Extensions (Legacy) > Seamless Carousel.'
