# Implementation Plan

## 概述

采用"小程序直接访问优先"的架构，大幅简化迁移工作。只需更新 1 个云函数，其他功能在小程序端实现。

---

## 云函数相关任务

- [x] 1. 更新 ocrReport 云函数以适配新数据模型
  - 修改 parseOCRResult 函数，从 Textin API 响应中提取数据
  - 从 test_results_summary_table 数组中提取：project_name.value, result.value, unit.value, reference_value.value, prompt.value
  - 将 prompt.value 直接映射为 status：'L' → 'L', '' → 'N', 'H' → 'H'
  - 添加 nameEn 字段（设置为空字符串）
  - 移除 confidence 字段和 isNormal 字段
  - 移除旧的 isValueNormal 函数（不再需要）
  - 保持 Textin API 调用逻辑不变
  - 更新返回格式：items: [{ name, nameEn, value, unit, normalRange, status }]
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. 删除不需要的云函数
  - 删除 cloudfunctions/login 目录及所有文件
  - 删除 cloudfunctions/saveReport 目录及所有文件
  - 删除 cloudfunctions/getReports 目录及所有文件
  - 删除 cloudfunctions/getReportDetail 目录及所有文件
  - 删除 cloudfunctions/getIndicators 目录及所有文件
  - 删除 cloudfunctions/getIndicatorHistory 目录及所有文件
  - 删除 cloudfunctions/common 目录（不再需要共享模块）
  - 删除 cloudfunctions/复制common到各云函数.sh 脚本
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

---

## 数据库配置任务

- [ ] 3. 在云开发控制台创建数据库集合
  - 登录微信云开发控制台
  - 创建 reports 集合
  - 创建 users 集合（可选）
  - 不需要预定义字段，云数据库是 schema-free 的
  - _Requirements: 9.1, 9.5_

- [ ] 4. 配置数据库权限规则
  - 在云开发控制台进入数据库管理
  - 为 reports 集合设置权限规则：`doc._openid == auth.openid`
  - 为 users 集合设置权限规则：`doc._openid == auth.openid`
  - 测试权限规则是否生效
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. 创建数据库索引
  - 为 reports 集合创建索引：reportDate (降序)
  - 为 reports 集合创建索引：createdAt (降序)
  - 索引可以在云开发控制台或通过代码创建
  - _Requirements: 9.2, 9.3_

---

## 小程序端实现任务

- [x] 6. 创建数据库访问工具模块
  - 创建 miniprogram/utils/database.ts 文件
  - 实现获取数据库实例的函数 getDatabase()
  - 实现获取集合引用的函数 getCollection(name)
  - 实现统一的错误处理函数 handleDatabaseError()
  - 导出工具函数供其他模块使用
  - _Requirements: 10.2_

- [x] 7. 实现保存报告功能（小程序端）
  - 在 miniprogram/utils/database.ts 中实现 saveReport() 函数
  - 验证报告数据（日期格式、检验项目必填字段）
  - 计算 abnormalCount（status 为 'L' 或 'H' 的数量）
  - 构建报告文档结构（reportDate, itemCount, abnormalCount, items, createdAt, updatedAt）
  - 使用 db.collection('reports').add() 保存报告
  - 返回保存后的报告 _id
  - 处理错误情况并显示友好提示
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. 实现查询报告列表功能（小程序端）
  - 在 miniprogram/utils/database.ts 中实现 getReports() 函数
  - 支持分页参数（page, pageSize）
  - 使用 db.collection('reports').where({}).get() 查询
  - 使用 field({ items: false }) 排除 items 字段
  - 使用 orderBy('reportDate', 'desc') 降序排序
  - 使用 skip() 和 limit() 实现分页
  - 查询总数用于分页显示
  - 返回 { total, page, pageSize, reports }
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. 实现查询报告详情功能（小程序端）
  - 在 miniprogram/utils/database.ts 中实现 getReportDetail() 函数
  - 使用 db.collection('reports').doc(reportId).get() 查询
  - 返回完整的报告信息（包含 items 数组）
  - 处理报告不存在的情况（显示友好提示）
  - 权限验证由数据库规则自动处理
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. 实现查询指标列表功能（小程序端）
  - 在 miniprogram/utils/database.ts 中实现 getIndicators() 函数
  - 使用 db.collection('reports').aggregate() 聚合查询
  - 使用 unwind('$items') 展开 items 数组
  - 使用 group() 按 name + nameEn + unit 组合分组（_id: { name, nameEn, unit }）
  - 这样可以区分不同医院对同一指标使用不同名称、英文缩写或单位的情况
  - 统计每个组合的 count
  - 提取 name、nameEn、unit 字段
  - 使用 sort({ name: 1 }) 按名称排序
  - 返回指标列表：[{ name, nameEn, unit, count }]
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. 实现查询指标历史功能（小程序端）
  - 在 miniprogram/utils/database.ts 中实现 getIndicatorHistory() 函数
  - 接收参数：indicatorName, startDate, endDate
  - 使用 db.command 构建查询条件
  - 使用 elemMatch({ name: indicatorName }) 过滤包含目标指标的报告
  - 使用 gte() 和 lte() 构建日期范围条件
  - 使用 orderBy('reportDate', 'asc') 升序排序
  - 从返回的报告中提取指定指标的数据（value, unit, status）
  - 返回历史数据：{ indicatorName, history: [{ reportDate, value, unit, status }] }
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. 更新小程序页面以使用新的数据库函数
  - 更新保存报告页面，调用 saveReport()
  - 更新报告列表页面，调用 getReports()
  - 更新报告详情页面，调用 getReportDetail()
  - 更新指标选择页面，调用 getIndicators()
  - 更新图表页面，调用 getIndicatorHistory()
  - 移除所有云函数调用代码（除了 ocrReport）
  - 添加加载状态和错误处理
  - _Requirements: 10.3, 10.4, 10.5_

---

## 文档和测试任务

- [x] 13. 更新部署文档
  - 更新 cloudfunctions/部署指南.md
  - 说明只需部署 ocrReport 云函数
  - 添加数据库集合创建步骤
  - 添加数据库权限规则配置步骤
  - 添加数据库索引创建步骤
  - 移除所有 MySQL 相关的配置说明
  - 移除其他云函数的部署说明
  - 说明小程序端直接访问数据库的配置
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 14. 创建数据库集合和索引配置文档
  - 创建 docs/database-setup.md 文档
  - 列出 reports 集合的文档结构示例
  - 列出 users 集合的文档结构示例
  - 说明权限规则配置
  - 说明索引配置
  - 提供数据库初始化检查清单
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. 编写小程序端数据库操作测试
  - 测试保存报告功能
  - 测试查询报告列表功能（分页）
  - 测试查询报告详情功能
  - 测试查询指标列表功能（聚合查询）
  - 测试查询指标历史功能（elemMatch）
  - 测试权限验证（尝试访问其他用户的数据）
  - 测试错误处理（网络错误、数据不存在等）
  - _Requirements: 3.1-3.5, 4.1-4.5, 5.1-5.4, 6.1-6.5, 7.1-7.5_

- [x] 16. 测试 ocrReport 云函数
  - 测试 OCR 识别功能
  - 验证返回的数据格式（包含 nameEn 和 status 字段）
  - 验证 status 判断逻辑（'L'/'N'/'H'）
  - 验证不包含 confidence 字段
  - 测试错误处理
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

---

## 任务总结

**总计：16 个任务**

- 云函数相关：2 个任务
- 数据库配置：3 个任务
- 小程序端实现：7 个任务
- 文档和测试：4 个任务

**预计工作量：**
- 云函数更新：1-2 小时
- 数据库配置：30 分钟
- 小程序端实现：4-6 小时
- 文档和测试：2-3 小时
- **总计：8-12 小时**

**对比原方案：**
- 原方案：重构 6 个云函数 + 小程序端适配 = 20-30 小时
- 新方案：更新 1 个云函数 + 小程序端实现 = 8-12 小时
- **节省 60% 工作量！**
