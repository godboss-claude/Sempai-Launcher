param()

$targets = @(
  @{ minecraft = '1.16.5'; api = '0.42.0+1.16'; yarn = '1.16.5+build.10'; project = 'legacy116'; modVersion = '0.1.2' },
  @{ minecraft = '1.20.1'; api = '0.92.12+1.20.1'; yarn = '1.20.1+build.10'; project = 'modern' },
  @{ minecraft = '1.20.2'; api = '0.91.6+1.20.2'; yarn = '1.20.2+build.4'; project = 'modern' },
  @{ minecraft = '1.20.3'; api = '0.91.1+1.20.3'; yarn = '1.20.3+build.1'; project = 'modern' },
  @{ minecraft = '1.20.4'; api = '0.97.3+1.20.4'; yarn = '1.20.4+build.3'; project = 'modern' },
  @{ minecraft = '1.20.5'; api = '0.97.8+1.20.5'; yarn = '1.20.5+build.1'; project = 'modern' },
  @{ minecraft = '1.20.6'; api = '0.100.8+1.20.6'; yarn = '1.20.6+build.3'; project = 'modern' },
  @{ minecraft = '1.21'; api = '0.102.0+1.21'; yarn = '1.21+build.9'; project = 'modern' },
  @{ minecraft = '1.21.1'; api = '0.116.18+1.21.1'; yarn = '1.21.1+build.3'; project = 'modern' },
  @{ minecraft = '1.21.2'; api = '0.106.1+1.21.2'; yarn = '1.21.2+build.1'; project = 'modern' },
  @{ minecraft = '1.21.3'; api = '0.114.1+1.21.3'; yarn = '1.21.3+build.2'; project = 'modern' },
  @{ minecraft = '1.21.4'; api = '0.119.4+1.21.4'; yarn = '1.21.4+build.8'; project = 'modern' },
  @{ minecraft = '1.21.5'; api = '0.128.2+1.21.5'; yarn = '1.21.5+build.1'; project = 'modern' },
  @{ minecraft = '1.21.6'; api = '0.128.2+1.21.6'; yarn = '1.21.6+build.1'; project = 'modern' },
  @{ minecraft = '1.21.7'; api = '0.129.0+1.21.7'; yarn = '1.21.7+build.8'; project = 'modern' },
  @{ minecraft = '1.21.8'; api = '0.136.1+1.21.8'; yarn = '1.21.8+build.1'; project = 'modern' },
  @{ minecraft = '1.21.9'; api = '0.134.1+1.21.9'; yarn = '1.21.9+build.1'; project = 'modern' },
  @{ minecraft = '1.21.10'; api = '0.138.4+1.21.10'; yarn = '1.21.10+build.3'; project = 'modern' },
  @{ minecraft = '1.21.11'; api = '0.141.6+1.21.11'; project = 'modern' },
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
  $buildProject = if ($target.project) { Join-Path $project $target.project } else { $project }
  $gradleArguments = @(
    '-p', $buildProject, 'clean', 'build', '--no-configuration-cache',
    "-Pminecraft_version=$($target.minecraft)",
    "-Pfabric_api_version=$($target.api)"
  )
  if ($target.yarn) { $gradleArguments += "-Pyarn_version=$($target.yarn)" }
  & (Join-Path $project 'gradlew.bat') @gradleArguments
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $targetModVersion = if ($target.modVersion) { $target.modVersion } elseif ($target.project) { '0.1.2' } else { $modVersion }
  $artifact = Join-Path $buildProject "build\libs\sempai-visuals-$($target.minecraft)-$targetModVersion.jar"
  if (-not (Test-Path -LiteralPath $artifact)) { throw "Missing build artifact: $artifact" }
  Copy-Item -LiteralPath $artifact -Destination $destination -Force
}

Write-Host 'Building Sempai Visuals for Minecraft 1.12.2 (Legacy Fabric)'
& (Join-Path $project 'gradlew.bat') -p (Join-Path $project 'legacy') clean build --no-configuration-cache
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$legacyArtifact = Join-Path $project 'legacy\build\libs\sempai-visuals-1.12.2-0.1.1.jar'
if (-not (Test-Path -LiteralPath $legacyArtifact)) { throw "Missing build artifact: $legacyArtifact" }
Copy-Item -LiteralPath $legacyArtifact -Destination $destination -Force
