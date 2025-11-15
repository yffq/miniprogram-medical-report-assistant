# 设计文档

> 本文档是完整的技术设计文档

## 快速导航

- [技术架构](#技术架构) - 整体架构和技术栈
- [数据模型](#数据模型) - Report 和 TestItem 结构
- [核心流程](#核心流程) - 上传识别、保存报告、趋势图表
- [关键设计决策](#关键设计决策) - 5 个重要的架构决策
- [安全设计](#安全设计) - 数据安全和敏感信息保护
- [性能优化](#性能优化) - 前端和后端优化策略
- [错误处理](#错误处理) - 前端和后端错误处理
- [核心模块](#核心模块) - 项目的主要代码模块

## 技术架构

### 整体架构

```
小程序前端 (TypeScript + LESS)
    ↓
云开发 (微信云开发)
    ├── 云函数: ocrReport (OCR 识别)
    └── 云数据库: reports 集合 (MongoDB)
    ↓
第三方服务: Textin API (医疗票据识别)
```

### 技术栈

**前端**
- 微信小程序 + Glass Easel 组件框架
- TypeScript (ES2020, CommonJS)
- LESS 样式
- ECharts for 微信小程序
- 基础库 2.32.3

**后端**
- 微信云开发云函数 (Node.js)
- 云开发数据库 (MongoDB)
- Textin 医疗票据识别 API

## 数据模型

### Report (报告)

```typescript
{
  _id: string              // 自动生成
  _openid: string          // 自动添加（用户标识）
  reportDate: string       // YYYY-MM-DD
  itemCount: number        // 检验项目总数
  abnormalCount: number    // 异常项目数
  items: TestItem[]        // 检验项目数组
  createdAt: Date          // 创建时间
  updatedAt: Date          // 更新时间
}
```

### TestItem (检验项目)

```typescript
{
  name: string             // 项目名称
  nameEn: string           // 英文名称（可选）
  value: number            // 数值
  unit: string             // 单位
  normalRange: string      // 正常范围
  status: 'L'|'N'|'H'      // 偏低/正常/偏高
}
```

## 核心流程

### 1. 上传识别流程

```
用户选择图片 
  → 小程序压缩图片 (1280x1280, 75%)
  → 转换为 base64
  → 调用 ocrReport 云函数
  → Textin API 识别
  → 解析结构化数据
  → 返回检验项目列表
  → 跳转到编辑页面
```

### 2. 保存报告流程

```
用户编辑/确认数据
  → 调用 database.saveReport()
  → 保存到云数据库
  → 自动添加 _openid
  → 返回 reportId
  → 跳转到报告详情（URL + globalData）
```

### 3. 趋势图表流程

```
用户选择指标（最多10个）
  → 调用 database.getIndicatorHistory()
  → 查询历史数据（elemMatch）
  → 生成 ECharts 配置
  → 渲染图表（支持单点显示）
```

## 关键设计决策

### 1. 架构简化

**决策**: 小程序直接访问云数据库，不使用数据库云函数

**理由**:
- 云开发自动处理用户身份验证
- 减少网络往返时间
- 降低维护成本
- 数据库权限规则提供安全保障

### 2. 图片压缩策略

**决策**: 小程序端压缩后再上传

**理由**:
- 减少传输时间和云函数处理时间
- OCR 识别不需要高分辨率
- 1280px 对检验报告识别足够

### 3. 数据传递机制

**决策**: URL 参数 + globalData 双重传递

**理由**:
- URL 参数：正常跳转时使用
- globalData：热重载时参数丢失的兜底方案
- 确保真机调试时数据不丢失

### 4. OCR 服务选择

**决策**: 使用 Textin 医疗票据识别 API

**理由**:
- 专门针对医疗票据优化
- 返回结构化数据（test_results_summary_table）
- 自动判断异常状态（prompt 字段）
- 识别准确率高

### 5. 数据库选择

**决策**: 使用云开发数据库（MongoDB）

**理由**:
- 开发简单，无需配置网络
- 自动处理用户权限
- 适合小程序场景
- 成本更低
- 支持嵌套文档（items 数组）

## 安全设计

### 数据安全

1. **云开发自动鉴权**: 通过 openid 识别用户
2. **数据隔离**: 用户只能访问自己的数据
3. **HTTPS 传输**: 所有通信加密
4. **图片不存储**: 识别后立即释放

### 敏感信息保护

1. **Textin API 密钥**: 存储在云函数 config.json（不提交到 Git）
2. **不硬编码**: 所有密钥从配置文件读取
3. **日志脱敏**: 不输出敏感信息
4. **错误过滤**: 错误信息不包含系统细节

### 输入验证

1. base64 格式验证
2. 图片大小限制（< 10MB）
3. 日期格式验证
4. 数据完整性检查

## 性能优化

### 前端优化

1. **图片压缩**: 上传前压缩到 < 2MB
2. **懒加载**: ECharts 按需加载
3. **缓存**: globalData 缓存临时数据
4. **字段过滤**: 查询列表时排除 items 字段

### 后端优化

1. **数据库索引**: reportDate, createdAt 字段
2. **聚合查询**: 使用 MongoDB 聚合管道
3. **数据过滤**: 只返回必要字段
4. **超时控制**: OCR API 30 秒超时

## 错误处理

### 前端错误处理

- **网络错误**: 显示重试按钮
- **OCR 失败**: 提示重新拍照
- **保存失败**: 本地缓存，提供重试
- **参数丢失**: 使用 globalData 兜底

### 后端错误处理

- **统一错误格式**: `{ success: false, error: {...} }`
- **错误码分类**: 1xxx 通用，2xxx 上传，3xxx OCR，4xxx 数据
- **日志记录**: 记录错误堆栈和上下文
- **优雅降级**: 部分失败不影响整体

## 核心模块

### 1. 云函数 (cloudfunctions/ocrReport/)

唯一的云函数，负责 OCR 识别：
- 调用 Textin 医疗票据识别 API
- 解析识别结果（结构化数据或表格数据）
- 返回检验项目列表

### 2. 数据库工具 (miniprogram/utils/database.ts)

小程序端直接访问云数据库：
- `saveReport()` - 保存报告到云数据库
- `getReports()` - 分页查询报告列表
- `getReportDetail()` - 查询报告详情
- `getIndicators()` - 聚合查询指标列表
- `getIndicatorHistory()` - 查询指标历史数据

### 3. 云函数调用 (miniprogram/utils/cloud.ts)

封装云函数调用：
- `callCloudFunction()` - 通用云函数调用，统一错误处理
- `ocrReport()` - OCR 识别专用方法，支持重试

### 4. 图片处理 (miniprogram/utils/image.ts)

图片压缩和转换：
- 图片选择（相册/相机）
- 图片压缩（质量 75%，最大 1280x1280px）
- base64 转换

### 5. 图表配置 (miniprogram/utils/chart-config.ts)

ECharts 图表配置生成：
- 生成多指标折线图配置
- 处理单点显示
- 配置颜色和样式
- 标识异常数据点

## 数据流

### 上传识别流程
```
用户选择图片 
  → 小程序压缩图片
  → 转换为 base64
  → 调用 ocrReport 云函数
  → Textin API 识别
  → 返回结构化数据
  → 跳转到编辑页面
```

### 保存报告流程
```
编辑页面
  → database.saveReport()
  → 云数据库（自动添加 _openid）
  → 返回 reportId
  → 跳转到报告详情
```

### 查询报告流程
```
报告列表页面
  → database.getReports()
  → 云数据库（自动过滤用户数据）
  → 显示列表
```

### 趋势图表流程
```
指标选择页面
  → database.getIndicatorHistory()
  → 云数据库（elemMatch 查询）
  → 生成 ECharts 配置
  → 渲染图表
```

## 相关文档

- [需求文档](./requirements.md) - 项目需求和验收标准
- [实施计划](./tasks.md) - 任务清单和实施步骤
- [部署指南](../docs/deployment.md) - 部署步骤和配置
- [安全最佳实践](../docs/security.md) - 安全检查和最佳实践
- [数据库配置](../docs/database-setup.md) - 数据库配置详细说明
