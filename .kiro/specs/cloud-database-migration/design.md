# Design Document - 简化版

## Overview

采用"小程序直接访问优先"的架构，将大部分数据库操作从云函数迁移到小程序端。这样可以减少云函数数量、降低维护成本、提高响应速度。

**核心设计原则：**
- 小程序能直接操作的，就直接操作
- 只在需要保护密钥或复杂服务端逻辑时使用云函数
- 利用云开发数据库的权限规则保证安全

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      小程序端                              │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Pages (页面)                                    │    │
│  │  - 报告列表页                                     │    │
│  │  - 报告详情页                                     │    │
│  │  - 指标选择页                                     │    │
│  │  - 图表页                                        │    │
│  └─────────────────────────────────────────────────┘    │
│                        │                                  │
│                        ▼                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  utils/database.ts (数据库工具)                  │    │
│  │  - saveReport()                                  │    │
│  │  - getReports()                                  │    │
│  │  - getReportDetail()                             │    │
│  │  - getIndicators()                               │    │
│  │  - getIndicatorHistory()                         │    │
│  └─────────────────────────────────────────────────┘    │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │
                         ├─────────────────────────────────┐
                         │                                 │
                         ▼                                 ▼
              ┌──────────────────┐            ┌──────────────────┐
              │  云开发数据库      │            │  ocrReport 云函数 │
              │                  │            │                  │
              │  - reports 集合  │            │  调用 Textin API  │
              │  - users 集合    │            │  返回识别结果      │
              │                  │            │                  │
              │  权限规则：       │            └──────────────────┘
              │  _openid 验证    │
              └──────────────────┘
```

### 数据流

**保存报告流程：**
```
用户上传图片 → ocrReport 云函数 → 返回识别结果 
→ 小程序端验证数据 → db.collection('reports').add() → 保存成功
```

**查询报告流程：**
```
用户打开列表页 → 小程序端 db.collection('reports').get() 
→ 数据库自动验证 _openid → 返回用户自己的报告
```

## Data Models

### reports 集合

```javascript
{
  _id: string,              // 自动生成的文档 ID
  _openid: string,          // 自动添加，用于权限控制
  reportDate: string,       // 报告日期 YYYY-MM-DD
  itemCount: number,        // 检验项目总数
  abnormalCount: number,    // 异常项目数（status 为 'L' 或 'H' 的数量）
  items: [                  // 嵌套的检验项目数组
    {
      name: string,         // 项目中文名称，如 "白细胞"
      nameEn: string,       // 项目英文名称，如 "WBC"
      value: number,        // 检验值
      unit: string,         // 单位，如 "10^9/L"
      normalRange: string,  // 正常范围，如 "3.5-9.5"
      status: string        // 状态：'L'=低于正常, 'N'=正常, 'H'=高于正常
    }
  ],
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

**示例数据：**
```json
{
  "_id": "report_001",
  "_openid": "oABC123",
  "reportDate": "2024-01-15",
  "itemCount": 3,
  "abnormalCount": 1,
  "items": [
    {
      "name": "白细胞",
      "nameEn": "WBC",
      "value": 5.5,
      "unit": "10^9/L",
      "normalRange": "3.5-9.5",
      "status": "N"
    },
    {
      "name": "红细胞",
      "nameEn": "RBC",
      "value": 3.2,
      "unit": "10^12/L",
      "normalRange": "4.0-5.5",
      "status": "L"
    },
    {
      "name": "血小板",
      "nameEn": "PLT",
      "value": 180,
      "unit": "10^9/L",
      "normalRange": "100-300",
      "status": "N"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### users 集合（可选）

```javascript
{
  _id: string,              // 自动生成的文档 ID
  _openid: string,          // 自动添加
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
  // 可以添加其他用户信息，如昵称、头像等
}
```

## Components and Interfaces

### 1. ocrReport 云函数

**唯一保留的云函数，用于调用 Textin OCR API。**

**输入：**
```typescript
{
  imageData: string  // base64 编码的图片数据
}
```

**输出：**
```typescript
{
  items: [
    {
      name: string,        // 中文名称
      nameEn: string,      // 英文名称（可为空）
      value: number,       // 检验值
      unit: string,        // 单位
      normalRange: string, // 正常范围
      status: 'L' | 'N' | 'H'  // 状态
    }
  ],
  needManualReview: boolean,  // 是否需要人工审核
  totalItems: number          // 识别到的项目总数
}
```

**关键变更：**
- `isNormal: boolean` → `status: 'L' | 'N' | 'H'`
- 添加 `nameEn` 字段
- 移除 `confidence` 字段

**从 Textin API 响应中提取数据：**

Textin API 返回的 `test_results_summary_table` 数组中，每个项目包含：
- `project_name.value` - 项目名称（中文）
- `result.value` - 检验值
- `unit.value` - 单位
- `reference_value.value` - 参考值（正常范围）
- `prompt.value` - 提示符号（"L"=低, ""=正常, "H"=高）

**数据提取逻辑：**
```javascript
function parseOCRResult(ocrData) {
  const items = []
  
  // 获取 test_results_summary_table
  const testResults = ocrData.result?.object_list?.[0]?.details?.test_results_summary_table
  
  if (!testResults || !Array.isArray(testResults)) {
    return items
  }
  
  for (const item of testResults) {
    // 提取字段
    const name = item.project_name?.value || ''
    const valueStr = item.result?.value || ''
    const unit = item.unit?.value || ''
    const normalRange = item.reference_value?.value || ''
    const prompt = item.prompt?.value || ''  // "L", "", "H"
    
    // 验证必填字段
    if (!name || !valueStr) {
      continue
    }
    
    // 解析数值
    const value = parseFloat(valueStr)
    if (isNaN(value)) {
      continue
    }
    
    // 确定 status
    let status = 'N'  // 默认正常
    if (prompt === 'L') {
      status = 'L'
    } else if (prompt === 'H') {
      status = 'H'
    }
    
    // nameEn 暂时为空，可以后续补充
    const nameEn = ''
    
    items.push({
      name,
      nameEn,
      value,
      unit,
      normalRange,
      status
    })
  }
  
  return items
}
```

**关键点：**
- 直接使用 Textin API 返回的 `prompt` 字段作为 `status`
- `prompt` 为空字符串时，表示正常，设置 `status = 'N'`
- `nameEn` 字段暂时为空字符串，可以在小程序端让用户补充

### 2. 小程序端数据库工具 (miniprogram/utils/database.ts)

#### 2.1 基础工具函数

```typescript
/**
 * 获取数据库实例
 */
export function getDatabase() {
  return wx.cloud.database()
}

/**
 * 获取集合引用
 */
export function getCollection(name: string) {
  return getDatabase().collection(name)
}

/**
 * 统一错误处理
 */
export function handleDatabaseError(error: any) {
  console.error('数据库操作失败:', error)
  
  if (error.errCode === -1) {
    wx.showToast({ title: '网络错误，请重试', icon: 'none' })
  } else if (error.errCode === -502005) {
    wx.showToast({ title: '权限不足', icon: 'none' })
  } else {
    wx.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}
```

#### 2.2 保存报告

```typescript
/**
 * 保存报告
 */
export async function saveReport(reportDate: string, items: ReportItem[]) {
  // 1. 验证数据
  if (!reportDate || !items || items.length === 0) {
    throw new Error('报告数据不完整')
  }
  
  // 2. 计算 abnormalCount
  const abnormalCount = items.filter(item => item.status !== 'N').length
  
  // 3. 构建报告文档
  const report = {
    reportDate,
    itemCount: items.length,
    abnormalCount,
    items,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  // 4. 保存到数据库
  const db = getDatabase()
  const result = await db.collection('reports').add({
    data: report
  })
  
  return result._id
}
```

#### 2.3 查询报告列表

```typescript
/**
 * 查询报告列表（分页）
 */
export async function getReports(page: number = 1, pageSize: number = 20) {
  const db = getDatabase()
  
  // 1. 查询总数
  const countResult = await db.collection('reports').count()
  const total = countResult.total
  
  // 2. 查询列表（排除 items 字段）
  const result = await db.collection('reports')
    .field({
      reportDate: true,
      itemCount: true,
      abnormalCount: true,
      createdAt: true,
      items: false  // 不返回 items，提高性能
    })
    .orderBy('reportDate', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  return {
    total,
    page,
    pageSize,
    reports: result.data
  }
}
```

#### 2.4 查询报告详情

```typescript
/**
 * 查询报告详情
 */
export async function getReportDetail(reportId: string) {
  const db = getDatabase()
  
  const result = await db.collection('reports')
    .doc(reportId)
    .get()
  
  if (!result.data) {
    throw new Error('报告不存在')
  }
  
  return result.data
}
```

#### 2.5 查询指标列表（聚合查询）

```typescript
/**
 * 查询指标列表
 * 
 * 注意：不同医院可能对同一指标使用不同的名称、英文缩写或单位
 * 因此需要按 name + nameEn + unit 的组合进行分组
 */
export async function getIndicators() {
  const db = getDatabase()
  const $ = db.command.aggregate
  
  const result = await db.collection('reports')
    .aggregate()
    .unwind('$items')  // 展开 items 数组
    .group({
      // 按 name + nameEn + unit 组合分组
      // 这样可以区分不同医院的同名指标
      _id: {
        name: '$items.name',
        nameEn: '$items.nameEn',
        unit: '$items.unit'
      },
      name: $.first('$items.name'),
      nameEn: $.first('$items.nameEn'),
      unit: $.first('$items.unit'),
      count: $.sum(1)               // 统计数量
    })
    .sort({
      name: 1                       // 按名称排序
    })
    .end()
  
  return result.list
}
```

**示例说明：**

假设有以下数据：
- 医院A：白细胞, WBC, 10^9/L
- 医院B：白细胞, WBC, 10^9/L  （相同，算1个指标）
- 医院C：白细胞, Leukocyte, 10^9/L  （英文名不同，算2个指标）
- 医院D：白细胞, WBC, ×10^9/L  （单位不同，算2个指标）

返回结果会包含3个不同的指标项。

#### 2.6 查询指标历史

```typescript
/**
 * 查询指标历史
 */
export async function getIndicatorHistory(
  indicatorName: string,
  startDate?: string,
  endDate?: string
) {
  const db = getDatabase()
  const _ = db.command
  
  // 构建查询条件
  const where: any = {
    items: _.elemMatch({
      name: indicatorName  // 只返回包含该指标的报告
    })
  }
  
  // 添加日期范围
  if (startDate && endDate) {
    where.reportDate = _.gte(startDate).and(_.lte(endDate))
  } else if (startDate) {
    where.reportDate = _.gte(startDate)
  } else if (endDate) {
    where.reportDate = _.lte(endDate)
  }
  
  // 查询报告
  const result = await db.collection('reports')
    .where(where)
    .orderBy('reportDate', 'asc')
    .get()
  
  // 提取指标数据
  const history = result.data.map(report => {
    const item = report.items.find((i: any) => i.name === indicatorName)
    return {
      reportDate: report.reportDate,
      value: item.value,
      unit: item.unit,
      status: item.status
    }
  })
  
  return {
    indicatorName,
    history
  }
}
```

## Security

### 数据库权限规则

在云开发控制台配置权限规则：

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**说明：**
- 用户只能读写自己的数据
- `_openid` 由云开发自动添加和验证
- 小程序端和云函数端享有相同的安全保障

### 安全优势

1. **自动权限验证**：云开发自动验证 `_openid`，无需手动编写权限检查代码
2. **防止数据泄露**：用户无法访问其他用户的数据
3. **简化代码**：不需要在每个查询中手动添加 `_openid` 过滤条件

## Performance Optimization

### 1. 查询优化

**使用 field() 排除大字段：**
```typescript
// 列表查询不返回 items 数组
db.collection('reports')
  .field({ items: false })
  .get()
```

**使用索引：**
- reportDate (降序)
- createdAt (降序)

### 2. 聚合查询

**getIndicators 使用聚合查询：**
- 在数据库层面完成统计
- 减少网络传输数据量
- 提高查询效率

### 3. 数组查询

**getIndicatorHistory 使用 elemMatch：**
- 在数据库层面过滤
- 只返回包含目标指标的报告
- 减少不必要的数据传输

## Error Handling

### 统一错误处理

```typescript
export function handleDatabaseError(error: any) {
  console.error('数据库操作失败:', error)
  
  // 根据错误码显示不同提示
  switch (error.errCode) {
    case -1:
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      break
    case -502001:
      wx.showToast({ title: '集合不存在', icon: 'none' })
      break
    case -502005:
      wx.showToast({ title: '权限不足', icon: 'none' })
      break
    default:
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}
```

### 使用示例

```typescript
try {
  const reports = await getReports(1, 20)
  // 处理数据
} catch (error) {
  handleDatabaseError(error)
}
```

## Database Setup

### 创建集合

在云开发控制台：
1. 进入数据库管理
2. 创建 `reports` 集合
3. 创建 `users` 集合（可选）

### 配置权限规则

为 `reports` 集合设置权限：
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

### 创建索引

为 `reports` 集合创建索引：
- `reportDate` (降序)
- `createdAt` (降序)

## Migration from MySQL

### 数据结构对比

| MySQL | 云开发数据库 |
|-------|------------|
| reports 表 | reports 集合 |
| test_items 表 | reports.items 数组（嵌套） |
| 外键关联 | 嵌套文档 |
| user_id | _openid（自动） |
| isNormal (boolean) | status ('L'/'N'/'H') |

### 迁移步骤

1. 在云开发控制台创建集合
2. 配置权限规则和索引
3. 更新 ocrReport 云函数
4. 删除旧的数据库云函数
5. 实现小程序端数据库操作
6. 更新页面调用方式
7. 测试所有功能

## Deployment

### 部署清单

- [ ] 在云开发控制台创建 reports 集合
- [ ] 配置 reports 集合权限规则
- [ ] 创建 reports 集合索引
- [ ] 部署 ocrReport 云函数
- [ ] 删除旧的云函数目录
- [ ] 更新小程序代码
- [ ] 测试所有功能

### 注意事项

1. **不需要数据迁移**：如果是新项目，直接使用云数据库
2. **保留 ocrReport**：这是唯一需要的云函数
3. **测试权限规则**：确保用户只能访问自己的数据
4. **监控性能**：观察聚合查询和数组查询的性能
