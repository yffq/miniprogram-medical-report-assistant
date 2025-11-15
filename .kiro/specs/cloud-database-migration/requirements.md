# Requirements Document

## Introduction

将项目从腾讯云 MySQL 数据库迁移到微信小程序云开发数据库。采用"小程序直接访问优先"的架构，大幅简化系统复杂度。

**核心变更：**
- 删除 6 个数据库云函数，改为小程序端直接访问云数据库
- 只保留 1 个云函数（ocrReport）用于调用第三方 API
- 数据模型从关系型转换为文档型（嵌套结构）

## Glossary

- **Cloud Database**: 微信小程序云开发提供的 NoSQL 文档型数据库
- **Client-side Access**: 小程序端直接访问云数据库的能力
- **Collection**: 云开发数据库中的集合，类似于 MySQL 中的表
- **Document**: 云开发数据库中的文档，类似于 MySQL 中的行
- **ocrReport**: OCR 识别云函数，调用 Textin API
- **Database Permission Rules**: 数据库权限规则，控制数据访问安全

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望删除不需要的数据库云函数，以便简化架构

#### Acceptance Criteria

1. THE System SHALL 删除 login 云函数目录及所有文件
2. THE System SHALL 删除 saveReport 云函数目录及所有文件
3. THE System SHALL 删除 getReports 云函数目录及所有文件
4. THE System SHALL 删除 getReportDetail 云函数目录及所有文件
5. THE System SHALL 删除 getIndicators 云函数目录及所有文件
6. THE System SHALL 删除 getIndicatorHistory 云函数目录及所有文件
7. THE System SHALL 保留 ocrReport 云函数

### Requirement 2

**User Story:** 作为开发者，我希望更新 ocrReport 云函数以适配新的数据模型

#### Acceptance Criteria

1. THE ocrReport Cloud Function SHALL 为每个检验项目添加 nameEn 字段（英文名称）
2. THE ocrReport Cloud Function SHALL 使用 status 字段替代 isNormal 字段
3. THE ocrReport Cloud Function SHALL 设置 status 为 'L'（低于正常）、'N'（正常）或 'H'（高于正常）
4. THE ocrReport Cloud Function SHALL 移除 confidence 字段
5. THE ocrReport Cloud Function SHALL 根据数值与正常范围的比较确定 status 值

### Requirement 3

**User Story:** 作为开发者，我希望在小程序端实现保存报告功能

#### Acceptance Criteria

1. THE Miniprogram SHALL 验证报告数据（日期格式、检验项目）
2. THE Miniprogram SHALL 计算 abnormalCount（status 为 'L' 或 'H' 的数量）
3. THE Miniprogram SHALL 使用 db.collection('reports').add() 保存报告
4. THE Miniprogram SHALL 在报告文档中包含 reportDate、itemCount、abnormalCount 和 items 字段
5. THE Miniprogram SHALL 自动添加 createdAt 和 updatedAt 时间戳

### Requirement 4

**User Story:** 作为开发者，我希望在小程序端实现查询报告列表功能

#### Acceptance Criteria

1. THE Miniprogram SHALL 使用 db.collection('reports').where().get() 查询报告列表
2. THE Miniprogram SHALL 支持分页查询（skip 和 limit）
3. THE Miniprogram SHALL 按 reportDate 降序排序
4. THE Miniprogram SHALL 使用 field() 排除 items 字段以提高性能
5. THE Miniprogram SHALL 查询总数用于分页显示

### Requirement 5

**User Story:** 作为开发者，我希望在小程序端实现查询报告详情功能

#### Acceptance Criteria

1. THE Miniprogram SHALL 使用 db.collection('reports').doc(reportId).get() 查询报告详情
2. THE Miniprogram SHALL 返回完整的报告信息，包括嵌套的 items 数组
3. WHEN 报告不存在时，THE Miniprogram SHALL 显示友好的错误提示
4. THE Miniprogram SHALL 自动通过 _openid 验证权限（数据库规则）

### Requirement 6

**User Story:** 作为开发者，我希望在小程序端实现查询指标列表功能

#### Acceptance Criteria

1. THE Miniprogram SHALL 使用 db.collection('reports').aggregate() 查询指标列表
2. THE Miniprogram SHALL 使用 unwind 展开 items 数组
3. THE Miniprogram SHALL 使用 group 按 name、nameEn 和 unit 的组合分组并统计数量
4. THE Miniprogram SHALL 将 name、nameEn 和 unit 都相同的项视为同一指标
5. THE Miniprogram SHALL 将任意一项不同的视为不同指标
6. THE Miniprogram SHALL 返回指标的 name、nameEn、unit 和 count
7. THE Miniprogram SHALL 按指标名称排序

### Requirement 7

**User Story:** 作为开发者，我希望在小程序端实现查询指标历史功能

#### Acceptance Criteria

1. THE Miniprogram SHALL 使用 db.collection('reports').where() 查询指标历史
2. THE Miniprogram SHALL 使用 elemMatch 在数据库层面过滤包含目标指标的报告
3. THE Miniprogram SHALL 支持日期范围过滤
4. THE Miniprogram SHALL 从报告的 items 数组中提取指定指标的数据
5. THE Miniprogram SHALL 按 reportDate 升序返回历史数据

### Requirement 8

**User Story:** 作为开发者，我希望配置数据库权限规则，以确保数据安全

#### Acceptance Criteria

1. THE Database Permission Rules SHALL 设置为 "doc._openid == auth.openid"
2. THE Database Permission Rules SHALL 应用于 reports 集合的读写操作
3. THE Database Permission Rules SHALL 应用于 users 集合的读写操作
4. THE Database Permission Rules SHALL 确保用户只能访问自己的数据
5. THE Database Permission Rules SHALL 在云开发控制台配置

### Requirement 9

**User Story:** 作为开发者，我希望创建数据库集合和索引，以优化查询性能

#### Acceptance Criteria

1. THE System SHALL 创建 reports 集合
2. THE System SHALL 为 reports 集合创建 reportDate 降序索引
3. THE System SHALL 为 reports 集合创建 createdAt 降序索引
4. THE System SHALL 创建 users 集合（可选，用于存储用户扩展信息）
5. THE System SHALL 在云开发控制台创建集合和索引

### Requirement 10

**User Story:** 作为开发者，我希望更新小程序端代码，以使用云数据库

#### Acceptance Criteria

1. THE Miniprogram SHALL 在 app.ts 中初始化云开发环境
2. THE Miniprogram SHALL 创建数据库访问工具函数
3. THE Miniprogram SHALL 实现报告保存、查询、详情、指标列表和指标历史功能
4. THE Miniprogram SHALL 处理数据库操作的错误情况
5. THE Miniprogram SHALL 显示加载状态和错误提示

### Requirement 11

**User Story:** 作为开发者，我希望更新部署文档，以反映新的架构

#### Acceptance Criteria

1. THE deployment documentation SHALL 说明如何配置数据库权限规则
2. THE deployment documentation SHALL 说明如何创建数据库集合和索引
3. THE deployment documentation SHALL 移除所有 MySQL 相关的配置说明
4. THE deployment documentation SHALL 说明只需部署 ocrReport 云函数
5. THE deployment documentation SHALL 说明小程序端直接访问数据库的配置
