# 临介社区 - 阿里云函数计算部署指南

> 将临介社区部署到阿里云函数计算 (FC)，解决 Vercel 国内访问慢/被墙的问题。

---

## 方案对比

| 方案 | 成本 | 复杂度 | 国内速度 | 推荐度 |
|------|------|--------|----------|--------|
| **阿里云 FC** (本方案) | 免费额度内 0 元 | 中等 | ⭐⭐⭐⭐⭐ | 长期运营首选 |
| 购买域名 + Vercel | ~15元/年 | 低 | ⭐⭐⭐ | 最简单，但服务器仍在国外 |
| 内网穿透 (localtunnel) | 0 元 | 低 | ⭐⭐ | 仅临时演示 |

---

## 前置要求

1. **阿里云账号**：注册并实名认证 [https://www.aliyun.com](https://www.aliyun.com)
2. **Node.js**：本地已安装 Node.js 18+
3. **Serverless Devs 工具**：阿里云 FC 部署 CLI

---

## 第一步：安装 Serverless Devs 工具

```bash
# 全局安装
npm install @serverless-devs/s -g

# 验证安装
s -v

# 配置阿里云凭证（按提示输入 AccessKey ID 和 Secret）
s config add --AccessKeyID <你的ID> --AccessKeySecret <你的Secret>
```

> 获取 AccessKey：阿里云控制台 → 右上角头像 → AccessKey 管理 → 创建 AccessKey

---

## 第二步：构建部署包

在项目根目录执行已准备好的构建脚本：

```powershell
# PowerShell (Windows)
.\scripts\build-for-fc.ps1
```

这个脚本会自动：
1. 从 `.env.local` 加载环境变量
2. 运行 `npm run build` (standalone 模式)
3. 将构建产物打包到 `./deploy` 目录

---

## 第三步：部署到阿里云 FC

```bash
# 直接部署
s deploy

# 部署完成后，控制台会输出访问地址，类似：
# http://linjie-community-xxx.cn-hangzhou.fcapp.run
```

首次部署约需 1-2 分钟。

---

## 第四步：访问你的社区

部署成功后，你会得到一个阿里云分配的域名：

```
http://linjie-community-xxx.cn-hangzhou.fcapp.run
```

将此链接分享给其他用户即可访问。该域名在国内访问速度快，且无需备案。

---

## 绑定自定义域名（可选）

如果你想用自己的域名：

1. 在阿里云 FC 控制台 → 函数 → 你的函数 → 域名管理
2. 添加自定义域名（如 `linjie.yourdomain.com`）
3. 按提示配置 DNS CNAME 记录
4. 如果使用国内域名（.cn 等），需要备案

---

## 后续更新

代码修改后重新部署：

```powershell
# 1. 重新构建
.\scripts\build-for-fc.ps1

# 2. 重新部署
s deploy
```

---

## 费用说明

阿里云函数计算有 **每月免费额度**：
- 调用次数：100 万次/月
- 执行时间：40 万 GB-秒/月
- 出站流量：1 GB/月

对于小型社区，免费额度完全够用。

---

## 常见问题

**Q: 部署失败，提示 "server.js not found"？**
A: 确保先执行 `npm run build`，且 `next.config.mjs` 中已配置 `output: 'standalone'`。

**Q: 环境变量没有生效？**
A: 确保 `.env.local` 存在于项目根目录，且 `s.yaml` 中的 `${env.XXX}` 变量名与 `.env.local` 中的完全一致。

**Q: 图片加载不出来？**
A: 检查 `next.config.mjs` 中的 `images.remotePatterns` 是否包含了图片域名。

**Q: 如何查看运行日志？**
A: 阿里云 FC 控制台 → 函数 → 日志查询，或执行 `s logs`。

---

## 相关文件

- `s.yaml` - FC 部署配置
- `scripts/build-for-fc.ps1` - 构建脚本
- `next.config.mjs` - 已配置 `output: 'standalone'`
