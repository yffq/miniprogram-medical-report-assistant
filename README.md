# 检验报告助手

一个基于微信小程序的医学检验报告管理工具，支持 OCR 识别、数据管理和趋势分析。

> ⚠️ **首次使用必读**：本项目需要配置云开发环境 ID、小程序 AppID 和 Textin API 密钥才能运行。详见下方"快速开始"第 4 步。

## 功能特性

- 📸 **智能识别** - 拍照或选择图片，自动识别检验报告内容
- 📊 **数据管理** - 保存和管理历史检验报告
- 📈 **趋势分析** - 查看指标变化趋势图表
- 🔒 **数据安全** - 用户数据隔离，HTTPS 加密传输

## 技术栈

- **前端**: 微信小程序 + TypeScript + LESS
- **后端**: 微信云开发 + Node.js
- **数据库**: 云开发数据库 (MongoDB)
- **OCR**: Textin 医疗票据识别 API
- **图表**: ECharts for 微信小程序

## 快速开始

### 1. 环境要求

- 微信开发者工具
- Node.js 16+
- 微信小程序账号
- 云开发环境
- Textin API 账号

### 2. 克隆项目

```bash
git clone https://github.com/your-username/miniprogram-medical-report-assistant.git
cd miniprogram-medical-report-assistant
```

### 3. 安装依赖

```bash
# 安装云函数依赖
cd cloudfunctions/ocrReport
npm install
cd ../..
```

### 4. 配置项目

⚠️ **重要**：需要配置 3 个关键信息才能运行项目。

#### 4.1 配置云开发环境 ID

需要修改 2 个文件中的 `your-cloud-env-id`：

**文件 1**: `miniprogram/app.ts` (第 12 行)
```typescript
env: 'your-cloud-env-id', // 替换为你的环境 ID
```

**文件 2**: `project.config.json` (第 60 行)
```json
"envId": "your-cloud-env-id"
```

**如何获取环境 ID**：
1. 打开微信开发者工具 → 点击"云开发"
2. 如未开通，点击"开通云开发"并创建环境
3. 在控制台顶部查看环境 ID（格式如：`prod-8g4dxxxxx`）

#### 4.2 配置小程序 AppID

**文件**: `project.config.json` (第 55 行)
```json
"appid": "your-miniprogram-appid",
```

**如何获取 AppID**：
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 开发 → 开发管理 → 开发设置 → 开发者 ID

#### 4.3 配置 Textin API 密钥

在云开发控制台配置环境变量：

1. 打开云开发控制台 → 云函数 → ocrReport
2. 点击"配置" → "环境变量"
3. 添加以下环境变量：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `TEXTIN_APP_ID` | Textin API App ID | 注册 [Textin](https://www.textin.com/) 后在控制台获取 |
| `TEXTIN_SECRET_CODE` | Textin API Secret Code | 同上 |
| `DEBUG_OCR` | 是否开启调试日志 | 填 `false` 或 `true` |

**获取 Textin API 密钥**：
1. 注册 [Textin](https://www.textin.com/) 账号
2. 申请医疗票据识别 API
3. 在控制台 → 密钥管理中获取 App ID 和 Secret Code

#### 4.4 配置验证

运行以下命令检查配置：

```bash
# 检查是否还有未配置的占位符
grep -r "your-cloud-env-id\|your-miniprogram-appid" \
  miniprogram/app.ts project.config.json
```

如果没有输出，说明配置完成 ✓

**注意**：Textin API 密钥在云开发控制台的环境变量中配置，不在代码文件中。

### 5. 创建数据库和部署云函数

1. 在云开发控制台创建 `reports` 集合（权限：仅创建者可读写）
2. 右键点击 `cloudfunctions/ocrReport` → 上传并部署

### 6. 运行项目

1. 在微信开发者工具中点击"编译"
2. 在模拟器或真机上测试

## 项目结构

```
miniprogram-medical-report-assistant/
├── miniprogram/              # 小程序前端代码
│   ├── pages/                # 页面
│   │   ├── index/            # 首页
│   │   ├── upload/           # 上传识别
│   │   ├── edit-report/      # 编辑报告
│   │   ├── report-list/      # 报告列表
│   │   ├── report-detail/    # 报告详情
│   │   ├── indicator-select/ # 指标选择
│   │   └── chart/            # 趋势图表
│   ├── components/           # 组件
│   │   ├── navigation-bar/   # 导航栏
│   │   ├── indicator-item/   # 指标项
│   │   ├── loading/          # 加载
│   │   └── ec-canvas/        # ECharts 画布
│   └── utils/                # 工具函数
│       ├── database.ts       # 数据库操作
│       ├── cloud.ts          # 云函数调用
│       ├── image.ts          # 图片处理
│       └── chart-config.ts   # 图表配置
├── cloudfunctions/           # 云函数
│   └── ocrReport/            # OCR 识别云函数
├── docs/                     # 文档
└── typings/                  # 类型定义
```

## 核心功能

### 1. OCR 识别

- 支持拍照和相册选择
- 自动压缩图片（质量 75%，最大 1280x1280）
- 智能识别检验项目、数值、单位、正常范围
- 自动判断异常状态（偏低/正常/偏高）

### 2. 数据管理

- 保存检验报告到云数据库
- 查看历史报告列表
- 查看报告详情
- 编辑和删除报告

### 3. 趋势分析

- 选择最多 10 个指标
- 绘制趋势折线图
- 支持单点显示
- 显示数据统计信息

## 安全特性

- ✅ 敏感信息存储在环境变量中
- ✅ 用户数据隔离（基于 openid）
- ✅ HTTPS 加密传输
- ✅ 图片大小限制（防止资源滥用）
- ✅ 输入验证和错误处理
- ✅ 图片不持久化存储

### 安全提醒

⚠️ **重要**：

- **API 密钥**：在云开发控制台的环境变量中配置，不在代码中
- **不要**在公开场合分享你的环境 ID 和 AppID
- **定期**更换 API 密钥
- **使用**不同的环境 ID 用于开发和生产

## 配置说明

### 云函数环境变量

在云开发控制台配置以下环境变量（云函数 → ocrReport → 配置 → 环境变量）：

| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| `TEXTIN_APP_ID` | Textin API App ID | 是 | `your_app_id` |
| `TEXTIN_SECRET_CODE` | Textin API Secret Code | 是 | `your_secret_code` |
| `DEBUG_OCR` | 是否开启 OCR 调试日志 | 否 | `false` |

**配置位置**：云开发控制台 → 云函数 → ocrReport → 配置 → 环境变量

### 数据库集合

项目使用以下集合：

- `reports` - 检验报告

数据库权限：
- 仅创建者可读写

## 开发指南

### 本地开发

1. 使用微信开发者工具打开项目
2. 开启"不校验合法域名"（开发阶段）
3. 编译并运行

### 真机调试

1. 点击"真机调试"
2. 扫码在手机上打开
3. 注意：真机调试需要配置合法域名

### 部署上线

1. 配置服务器域名白名单：
   - `https://api.textin.com` (Textin API)
2. 上传代码
3. 提交审核

## 常见问题

### 配置相关

#### Q: 找不到云开发环境 ID？

**A**: 在云开发控制台顶部可以看到环境名称和 ID，格式为：`环境名-随机字符串`

#### Q: Textin API 密钥配置在哪里？

**A**: 在云开发控制台配置，不在代码文件中：
1. 云开发控制台 → 云函数 → ocrReport
2. 配置 → 环境变量
3. 添加 `TEXTIN_APP_ID` 和 `TEXTIN_SECRET_CODE`

### 功能相关

#### Q: OCR 识别失败？

**A**: 检查以下几点：
1. 云开发控制台中的 Textin API 环境变量是否正确配置
2. 云函数是否已部署
3. 图片是否清晰且包含表格数据
4. 查看云函数日志获取详细错误信息

#### Q: 图片上传失败？

**A**: 可能原因：
1. 图片过大（超过 10MB）
2. 网络连接问题
3. 云函数超时

#### Q: 数据无法保存？

**A**: 检查：
1. 云开发数据库是否开通
2. 已创建 `reports` 集合
3. 权限设置为"仅创建者可读写"
4. 查看控制台错误信息

#### Q: 图表不显示？

**A**: 确认：
1. 指标是否有历史数据
2. ECharts 组件是否正确加载
3. 查看控制台是否有错误

### 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `cloud init error` | 环境 ID 配置错误 | 检查 `app.ts` 和 `project.config.json` 中的环境 ID |
| `request:fail` | AppID 配置错误 | 检查 `project.config.json` 中的 AppID |
| `OCR 识别失败` | API 密钥错误 | 检查云开发控制台中的环境变量配置 |
| `数据库操作失败` | 集合未创建 | 在云开发控制台创建 `reports` 集合 |

## 相关文档

- [云函数文档](cloudfunctions/ocrReport/README.md) - OCR 云函数使用说明

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 注意

本项目仅供学习和个人使用参考。如需商业使用，建议联系作者获取技术支持。

## 联系方式

如有问题，请提交 Issue。

---

**免责声明**：使用本项目前请确保遵守相关法律法规和隐私政策。
