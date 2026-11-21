param()

$targets = @(
  @{ minecraft = '26.1';   api = '0.155.3+26.1.2' },
  @{ minecraft = '26.1.1'; api = '0.155.3+26.1.2' },
  @{ minecraft = '26.1.2'; api = '0.155.3+26.1.2' },
  @{ minecraft = '26.2';   api = '0.161.0+26.2' },
  @{ minecraft = '26.3';   api = '0.166.2+26.3' }
)

$project = $PSScriptRoot
$modVersion = '0.1.1'
$destination = Join-Path $project '..\release\mods'
New-Item -ItemType Directory -Force $destination | Out-Null
foreach ($target in $targets) {
  Write-Host "Building Sempai Visuals for Minecraft $($target.minecraft)"
  & (Join-Path $project 'gradlew.bat') -p $project clean build --no-configuration-cache `
    "-Pminecraft_version=$($target.minecraft)" `
    "-Pfabric_api_version=$($target.api)"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $artifact = Join-Path $project "build\libs\sempai-visuals-$($target.minecraft)-$modVersion.jar"
  if (-not (Test-Path -LiteralPath $artifact)) { throw "Missing build artifact: $artifact" }
  Copy-Item -LiteralPath $artifact -Destination $destination -Force
}

Write-Host 'Building Sempai Visuals for Minecraft 1.12.2 (Legacy Fabric)'
& (Join-Path $project 'gradlew.bat') -p (Join-Path $project 'legacy') clean build --no-configuration-cache
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$legacyArtifact = Join-Path $project 'legacy\build\libs\sempai-visuals-1.12.2-0.1.1.jar'
if (-not (Test-Path -LiteralPath $legacyArtifact)) { throw "Missing build artifact: $legacyArtifact" }
Copy-Item -LiteralPath $legacyArtifact -Destination $destination -Force
