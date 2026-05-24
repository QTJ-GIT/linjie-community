# 临介社区 - 阿里云函数计算构建脚本
# 使用方式: 在项目根目录执行: .\scripts\build-for-fc.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  临介社区 - 阿里云 FC 构建打包脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: 加载环境变量
Write-Host "`n[1/5] 从 .env.local 加载环境变量..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.*)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "  环境变量加载完成" -ForegroundColor Green
} else {
    Write-Warning ".env.local 不存在，请确保已手动设置必要的环境变量"
}

# Step 2: 构建 Next.js
Write-Host "`n[2/5] 构建 Next.js 应用 (output: standalone)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "构建失败！请检查错误信息。"
    exit 1
}
Write-Host "  构建成功" -ForegroundColor Green

# Step 3: 准备部署目录
Write-Host "`n[3/5] 准备部署目录..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue deploy
New-Item -ItemType Directory -Force -Path deploy | Out-Null

# Step 4: 复制构建产物到部署目录
Write-Host "`n[4/5] 复制构建产物..." -ForegroundColor Yellow

# 复制 standalone 核心文件
Copy-Item -Recurse -Force .next/standalone/* deploy/

# 复制 static 文件（standalone 不会自动包含）
if (Test-Path .next/static) {
    New-Item -ItemType Directory -Force -Path deploy/.next/static | Out-Null
    Copy-Item -Recurse -Force .next/static/* deploy/.next/static/
    Write-Host "  已复制: .next/static" -ForegroundColor Green
}

# 复制 public 静态资源
if (Test-Path public) {
    New-Item -ItemType Directory -Force -Path deploy/public | Out-Null
    Copy-Item -Recurse -Force public/* deploy/public/
    Write-Host "  已复制: public" -ForegroundColor Green
}

# Step 5: 验证
Write-Host "`n[5/5] 验证部署包..." -ForegroundColor Yellow
if (-not (Test-Path deploy/server.js)) {
    Write-Error "错误: deploy/server.js 不存在，构建产物不完整"
    exit 1
}
$deploySize = (Get-ChildItem deploy -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  验证通过，部署包大小: $([math]::Round($deploySize, 2)) MB" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  打包完成！" -ForegroundColor Green
Write-Host "  部署目录: ./deploy" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n下一步命令:" -ForegroundColor Cyan
Write-Host "  s deploy" -ForegroundColor White
Write-Host "`n注意: 首次部署前请确保已安装 Serverless Devs 工具并配置好阿里云凭证" -ForegroundColor Yellow
