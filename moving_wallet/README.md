# EUDI Wallet

一个基于 **React Native + Expo** 构建的欧盟数字身份（EUDI）合规移动钱包应用，支持 W3C 可验证凭证（Verifiable Credentials）的存储、管理与展示。本项目由 UNSW（新南威尔士大学）开发，Bundle ID 为 `au.edu.unsw.eudiwallet`。

---

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [运行方式](#运行方式)
- [深链接支持](#深链接支持)
- [凭证类型](#凭证类型)
- [安全机制](#安全机制)
- [标准与规范](#标准与规范)
- [演示数据](#演示数据)
- [开发路线图](#开发路线图)

---

## 项目简介

EUDI Wallet 是一个移动端数字身份钱包，旨在符合 **eIDAS 2.0** 法规和 **EU Digital Identity Wallet** 架构规范。用户可以：

- 安全存储各类政府颁发的可验证凭证（National ID、驾照、地址证明、年龄证明等）
- 通过生物识别（Face ID / 指纹）或 6 位 PIN 码解锁钱包
- 扫描验证方（Verifier）二维码或接收深链接，选择性地向第三方披露凭证数据
- 查看凭证详情，包括颁发机构 DID、有效期、吊销状态及 eIDAS 保障等级

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native 0.81.5 + Expo SDK 54 |
| 路由 | expo-router 6（文件系统路由） |
| 状态管理 | Zustand 5 |
| 语言 | TypeScript 5 |
| 安全存储 | expo-secure-store（iOS Keychain / Android Keystore） |
| 生物识别 | expo-local-authentication（Face ID / 指纹） |
| 摄像头 | expo-camera（QR 扫描） |
| 加密 | expo-crypto（SHA-256 PIN 哈希） |
| 深链接 | expo-linking |
| VC 类型 | @sphereon/ssi-types |
| UI 图标 | @expo/vector-icons（Ionicons） |

---

## 功能特性

### EUDI-01 · 钱包初始化与身份认证
- **首次启动**：引导用户设置 6 位 PIN 码（两次输入确认），同时自动生成持有者 DID
- **PIN 验证**：使用随机盐值 + SHA-256 哈希存储，永不明文保存
- **生物识别**：支持 Face ID 和指纹解锁；若设备支持，启动时自动触发
- **错误提示**：PIN 错误时清空输入并给出明确提示

### EUDI-02 · 安全凭证存储
- 凭证以 JSON 格式加密存储于 OS 级密钥库（iOS Keychain / Android Keystore）
- 使用索引机制管理多凭证，支持增删改查
- Web 端降级为 `localStorage`（仅供演示）

### EUDI-03 · 凭证列表首页
- 以卡片列表展示钱包内所有凭证
- 每张卡片展示：凭证类型图标、颁发机构名称、颁发日期、eIDAS 保障等级徽章
- 空状态时提供「加载演示凭证」入口
- 支持一键删除（带确认弹窗）

### EUDI-04 · 凭证详情页
- 展示完整凭证信息：凭证类型、颁发机构（名称 + DID）、有效期、吊销状态端点
- 展示持有者 DID 和所有 `credentialSubject` 属性字段
- 展示数字签名（Proof）类型、目的和验证方法
- 彩色保障等级标签（High / Substantial / Low）

### EUDI-05 · 数据共享同意页
- 在向验证方披露数据前展示同意界面
- 显示验证方名称、DID、请求目的、所请求的凭证类型和具体字段
- 未知验证方显示警告提示
- 用户可选择「分享」或「拒绝」

### EUDI-06 · QR 码扫描与深链接
- 内置 QR 码扫描器，支持解析 `openid4vp://` 和 `eudiw://` 格式的展示请求
- 支持 JSON 格式和 URL 参数格式的请求载荷
- 解析成功后跳转至同意页；格式错误时给出明确提示
- 支持通过深链接从外部应用触发凭证展示流程

### EUDI-07 · 演示凭证
- 内置 4 张演示凭证，可一键加载：
  - 澳大利亚国家身份证（NationalID）
  - 移动驾照（mDL，符合 ISO 18013-5）
  - 地址证明（AddressCredential）
  - 年龄证明（ProofOfAge）

---

## 项目结构

```
moving_wallet/
├── app/                          # 页面路由（expo-router 文件系统路由）
│   ├── _layout.tsx               # 根布局：认证检查、深链接监听、导航栈配置
│   ├── setup.tsx                 # 首次启动 PIN 设置页
│   ├── unlock.tsx                # 解锁页（PIN 键盘 + 生物识别）
│   ├── consent.tsx               # 数据共享同意页
│   ├── (wallet)/                 # 已认证区域（Tab 导航）
│   │   ├── _layout.tsx           # Tab 导航栏布局
│   │   ├── index.tsx             # 凭证列表首页
│   │   └── scan.tsx              # QR 码扫描页
│   └── credential/
│       └── [id].tsx              # 凭证详情页（动态路由）
│
├── src/                          # 核心业务逻辑
│   ├── types.ts                  # TypeScript 类型定义（W3C VC 2.0、PresentationRequest 等）
│   ├── store.ts                  # Zustand 全局状态（认证、凭证列表、待处理请求）
│   ├── auth.ts                   # PIN 哈希验证、生物识别认证
│   ├── secureStorage.ts          # 安全存储适配层（expo-secure-store / localStorage）
│   ├── didManager.ts             # did:key 方法的 DID 生成与管理
│   ├── demoCredentials.ts        # 内置演示凭证数据
│   └── theme.ts                  # 设计系统（颜色、间距、圆角、凭证元数据）
│
├── app.json                      # Expo 应用配置（权限、插件、scheme）
├── babel.config.js               # Babel 配置（路径别名 @/ → src/）
├── package.json                  # 依赖管理
└── README.md                     # 本文件
```

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Expo CLI（`npm install -g expo-cli`）
- 手机端：[Expo Go](https://expo.dev/client) App
- 模拟器端：Android Studio（Android）或 Xcode（iOS，仅 macOS）

### 安装依赖

```bash
# 进入项目目录
cd moving_wallet

# 安装依赖（node_modules 已存在则可跳过）
npm install
```

---

## 运行方式

```bash
# 启动 Expo 开发服务器
npx expo start
```

启动后控制台显示二维码，根据需要选择目标平台：

| 按键 | 平台 |
|------|------|
| `a` | Android 模拟器 |
| `i` | iOS 模拟器（仅 macOS） |
| `w` | Web 浏览器 |
| 扫码 | 手机 Expo Go App |

```bash
# 直接启动 Android
npx expo start --android

# 直接启动 iOS
npx expo start --ios
```

> **注意**：摄像头、生物识别和安全存储为原生功能，在 Expo Go 中可能存在限制。
> 如需完整功能，请使用开发构建：
> ```bash
> npx expo run:android
> npx expo run:ios
> ```

---

## 深链接支持

应用注册了 `eudiw://` 自定义 URL Scheme，支持以下格式触发凭证展示：

```
eudiw://?client_id=did:web:verifier.example.com
        &credential_type=NationalID
        &claims=givenName,familyName,dateOfBirth
        &nonce=abc123
        &response_uri=https://verifier.example.com/response
```

也支持 `openid4vp://` 格式（OID4VP 标准）：

```
openid4vp://?client_id=verifier-id
             &credential_type=mDL
             &claims=familyName,age_over_18
```

---

## 凭证类型

| 类型 | 说明 | 保障等级 |
|------|------|----------|
| `NationalID` | 国家身份证 | High |
| `mDL` | 移动驾照（ISO 18013-5） | High |
| `AddressCredential` | 地址证明 | Substantial |
| `ProofOfAge` | 年龄证明（支持 SD-JWT 选择性披露） | High |

### eIDAS 保障等级

| 等级 | 说明 |
|------|------|
| `high` | 高保障：政府级别身份证明，Ed25519 签名 |
| `substantial` | 实质保障：经认证机构颁发 |
| `low` | 低保障：自声明或弱验证 |

---

## 安全机制

### PIN 码安全
- 6 位 PIN 码经随机盐值（salt）拼接后使用 SHA-256 哈希存储
- 哈希和盐值分别以独立键名存入 OS 密钥库，永不明文存储
- 跨平台支持：原生使用 `expo-crypto`，Web 使用 `SubtleCrypto`

### 凭证存储安全
- 凭证数据通过 `expo-secure-store` 写入 iOS Keychain 或 Android Keystore
- 使用凭证索引（`wallet_cred_index`）管理多凭证 ID 列表，每条凭证以独立键名存储
- 支持逐条删除和全量清除

### DID 身份标识
- 应用初始化时自动生成持有者 DID，使用 `did:key` 方法
- 密钥材料：32 字节随机数 + Ed25519 多编码前缀（`0xed01`），以 Base58btc 编码
- DID 和密钥材料均存入安全存储，可跨会话持久化

### 数据最小化原则
- 同意页仅展示验证方请求的具体字段，不披露额外信息
- Sprint 2 将引入 SD-JWT（选择性披露 JWT）实现字段级别的隐私保护

---

## 标准与规范

| 规范 | 用途 |
|------|------|
| [W3C Verifiable Credentials 2.0](https://www.w3.org/TR/vc-data-model-2.0/) | 凭证数据模型 |
| [eIDAS 2.0](https://digital-strategy.ec.europa.eu/en/policies/eudi-wallet) | 保障等级与监管框架 |
| [OID4VP (OpenID for VP)](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) | 凭证展示协议 |
| [did:key 方法](https://w3c-ccg.github.io/did-method-key/) | 去中心化身份标识符 |
| [ISO 18013-5 (mDL)](https://www.iso.org/standard/69084.html) | 移动驾照标准 |
| [StatusList2021](https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/) | 凭证吊销状态 |

---

## 演示数据

内置演示凭证由虚拟颁发机构 `did:web:gov.au.identity`（Australian Government Identity Authority）签发，持有者为 `Alex Johnson`（DID: `did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK`）。

> 演示凭证中的 `proof.jws` 字段标注为 `DEMO_PROOF_NOT_FOR_PRODUCTION`，不用于生产环境的签名验证。

加载演示凭证：启动应用并完成初始化后，在钱包首页点击「Load Demo Credentials」按钮即可。

---

## 开发路线图

### Sprint 1（当前）
- [x] 钱包初始化与 PIN / 生物识别认证
- [x] 安全凭证存储（expo-secure-store）
- [x] 凭证列表与详情展示
- [x] QR 码扫描与深链接解析
- [x] 数据共享同意界面
- [x] did:key 持有者 DID 生成
- [x] 内置演示凭证（National ID、mDL、Address、ProofOfAge）

### Sprint 2（计划中）
- [ ] 完整 OID4VP 协议实现（生成并发送 VP Response）
- [ ] SD-JWT 选择性披露（字段级隐私保护）
- [ ] Ed25519 数字签名（via @sphereon/ssi-sdk）
- [ ] OID4VCI 凭证颁发流程
- [ ] 真实凭证吊销状态检查

---

## 许可证

本项目为 UNSW 课程项目，仅供学术研究与教学目的使用。
