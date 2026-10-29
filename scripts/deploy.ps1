[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$InitializeDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RequiredEnvironment([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "缺少环境变量 $Name，请参考 docs/deployment.md。"
    }
    return $value
}

function Get-ProductionOrigin([string]$Name) {
    $value = (Get-RequiredEnvironment $Name).Trim()
    $uri = $null
    if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne 'https' -or -not $uri.IsDefaultPort -or
        $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment -or $uri.UserInfo) {
        throw "$Name 必须是 HTTPS 站点地址，例如 https://admin.example.com，不包含路径、端口或凭据。"
    }
    return $uri
}

function Invoke-Pnpm([string[]]$Arguments) {
    & pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm 命令失败（退出码 $LASTEXITCODE），已停止部署。"
    }
}

if ($DryRun -and $InitializeDatabase) {
    throw '-DryRun 不能与 -InitializeDatabase 同时使用。'
}

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$serverDirectory = Join-Path $repositoryRoot 'apps/server'
$adminDirectory = Join-Path $repositoryRoot 'apps/admin'
$accountId = (Get-RequiredEnvironment 'CLOUDFLARE_ACCOUNT_ID').Trim()
$databaseId = (Get-RequiredEnvironment 'D1_DATABASE_ID').Trim()
$adminOrigin = Get-ProductionOrigin 'ADMIN_ORIGIN'
$apiOrigin = Get-ProductionOrigin 'API_ORIGIN'
$cookieDomain = (Get-RequiredEnvironment 'COOKIE_DOMAIN').Trim().TrimStart('.').ToLowerInvariant()
if ($cookieDomain.Split('.').Count -lt 2 -or
    -not $adminOrigin.Host.EndsWith(".$cookieDomain", [StringComparison]::OrdinalIgnoreCase) -or
    -not $apiOrigin.Host.EndsWith(".$cookieDomain", [StringComparison]::OrdinalIgnoreCase) -or
    $adminOrigin.Host -eq $apiOrigin.Host) {
    throw 'ADMIN_ORIGIN 和 API_ORIGIN 必须是 COOKIE_DOMAIN 下两个不同的 HTTPS 子域名。'
}

$workerSecrets = $null
if (-not $DryRun) {
    if ($env:CI -eq 'true') {
        $null = Get-RequiredEnvironment 'CLOUDFLARE_API_TOKEN'
    }
    $workerSecrets = @{
        JWT_SECRET = Get-RequiredEnvironment 'JWT_SECRET'
        ADMIN_EMAILS = Get-RequiredEnvironment 'ADMIN_EMAILS'
    }
}

# 生成临时配置，不把生产账号、域名和密钥写回仓库配置。
$temporaryParent = [IO.Path]::GetFullPath((Join-Path $serverDirectory '.wrangler'))
$temporaryDirectory = Join-Path $temporaryParent ('deploy-' + [Guid]::NewGuid().ToString('N'))
$originalApiUrl = [Environment]::GetEnvironmentVariable('VITE_API_URL')
try {
    New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
    $apiConfiguration = Get-Content -LiteralPath (Join-Path $serverDirectory 'wrangler.jsonc') -Raw | ConvertFrom-Json -AsHashtable
    $apiConfiguration.Remove('$schema') | Out-Null
    $apiConfiguration['account_id'] = $accountId
    $apiConfiguration['main'] = Join-Path $serverDirectory 'src/index.ts'
    $apiConfiguration['d1_databases'][0]['database_id'] = $databaseId
    $apiConfiguration['vars'] = @{
        CORS_ORIGINS = $adminOrigin.GetLeftPart([UriPartial]::Authority)
        COOKIE_DOMAIN = ".$cookieDomain"
    }
    $apiConfiguration['routes'] = @(@{ pattern = $apiOrigin.Host; custom_domain = $true })
    $apiConfiguration['workers_dev'] = $false
    $apiConfigurationPath = Join-Path $temporaryDirectory 'api.json'
    $apiConfiguration | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $apiConfigurationPath -Encoding utf8

    $adminConfiguration = Get-Content -LiteralPath (Join-Path $adminDirectory 'wrangler.jsonc') -Raw | ConvertFrom-Json -AsHashtable
    $adminConfiguration.Remove('$schema') | Out-Null
    $adminConfiguration['account_id'] = $accountId
    $adminConfiguration['assets']['directory'] = Join-Path $adminDirectory 'dist'
    $adminConfiguration['routes'] = @(@{ pattern = $adminOrigin.Host; custom_domain = $true })
    $adminConfiguration['workers_dev'] = $false
    $adminConfigurationPath = Join-Path $temporaryDirectory 'admin.json'
    $adminConfiguration | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $adminConfigurationPath -Encoding utf8

    $env:VITE_API_URL = $apiOrigin.GetLeftPart([UriPartial]::Authority)
    Write-Host '检查管理端类型…'
    Invoke-Pnpm -Arguments @('--dir', $adminDirectory, 'run', 'type-check')
    Write-Host '构建管理端…'
    Invoke-Pnpm -Arguments @('--dir', $adminDirectory, 'run', 'build-only')

    # 先完成两端打包，再进行任何远端写入；dry-run 分支不会初始化数据库或上传密钥。
    Write-Host '检查 API Worker 打包…'
    Invoke-Pnpm -Arguments @('--dir', $serverDirectory, 'exec', 'wrangler', 'deploy', '--config', $apiConfigurationPath, '--dry-run', '--outdir', (Join-Path $temporaryDirectory 'api-bundle'))
    Write-Host '检查管理端静态资源打包…'
    Invoke-Pnpm -Arguments @('--dir', $serverDirectory, 'exec', 'wrangler', 'deploy', '--config', $adminConfigurationPath, '--dry-run', '--outdir', (Join-Path $temporaryDirectory 'admin-bundle'))
    if ($DryRun) {
        Write-Host '部署预检完成，未写入远端资源。'
        return
    }

    if ($InitializeDatabase) {
        Write-Host '初始化指定的全新生产 D1 数据库…'
        Invoke-Pnpm -Arguments @('--dir', $serverDirectory, 'exec', 'wrangler', 'd1', 'execute', 'DB', '--config', $apiConfigurationPath, '--remote', '--file', (Join-Path $serverDirectory 'src/schema.sql'))
    }

    $secretsPath = Join-Path $temporaryDirectory 'secrets.json'
    $workerSecrets | ConvertTo-Json | Set-Content -LiteralPath $secretsPath -Encoding utf8
    if (-not $IsWindows) {
        [IO.File]::SetUnixFileMode($secretsPath, [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite)
    }
    Write-Host '部署 API Worker…'
    Invoke-Pnpm -Arguments @('--dir', $serverDirectory, 'exec', 'wrangler', 'deploy', '--config', $apiConfigurationPath, '--secrets-file', $secretsPath)
    Write-Host '部署管理端…'
    Invoke-Pnpm -Arguments @('--dir', $serverDirectory, 'exec', 'wrangler', 'deploy', '--config', $adminConfigurationPath)
    Write-Host "部署完成：$($adminOrigin.GetLeftPart([UriPartial]::Authority))"
}
finally {
    [Environment]::SetEnvironmentVariable('VITE_API_URL', $originalApiUrl)
    # 只清理由本脚本在 .wrangler 下创建的临时目录，删除前核对绝对路径。
    $resolvedTemporary = [IO.Path]::GetFullPath($temporaryDirectory)
    $relativeTemporary = [IO.Path]::GetRelativePath($temporaryParent, $resolvedTemporary)
    if ([IO.Path]::IsPathRooted($relativeTemporary) -or $relativeTemporary.StartsWith('..') -or
        -not $relativeTemporary.StartsWith('deploy-') -or
        [IO.Path]::GetDirectoryName($resolvedTemporary) -ne $temporaryParent) {
        throw '临时目录路径校验失败，未执行清理。'
    }
    if (Test-Path -LiteralPath $resolvedTemporary) {
        Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
    }
}
