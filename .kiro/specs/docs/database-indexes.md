# 数据库索引优化指南

## 概述

本文档详细说明 `reports` 集合的索引配置，包括必需索引、推荐索引和可选索引。

## 索引列表

### 1. reportDate 降序索引（必需）

**索引名称：** `reportDate_-1`

**字段：**
- `reportDate`: 降序（-1）

**用途：** 优化报告列表查询，按日期降序排列

**查询示例：**
```typescript
db.collection('reports')
  .orderBy('reportDate', 'desc')
  .limit(20)
  .get()
```

**性能影响：** 高 - 这是最常用的查询之一

---

### 2. createdAt 降序索引（必需）

**索引名称：** `createdAt_-1`

**字段：**
- `createdAt`: 降序（-1）

**用途：** 优化按创建时间排序的查询

**查询示例：**
```typescript
db.collection('reports')
  .orderBy('createdAt', 'desc')
  .get()
```

**性能影响：** 中 - 用于备用排序方式

---

### 3. _openid + reportDate + items 组合索引（推荐）

**索引名称：** `_openid_1_reportDate_1_items_1`

**字段：**
1. `_openid`: 升序（1）
2. `reportDate`: 升序（1）
3. `items`: 升序（1）

**用途：** 优化指标历史查询，支持 elemMatch 和日期范围过滤

**查询示例：**
```typescript
// 查询指标历史（无日期范围）
db.collection('reports')
  .where({
    items: _.elemMatch({ name: '白细胞' })
  })
  .orderBy('reportDate', 'asc')
  .get()

// 查询指标历史（带日期范围）
db.collection('reports')
  .where({
    items: _.elemMatch({ name: '白细胞' }),
    reportDate: _.gte('2024-01-01').and(_.lte('2024-12-31'))
  })
  .orderBy('reportDate', 'asc')
  .get()
```

**性能影响：** 高 - 指标历史查询是核心功能之一

**创建方法：**

方式 1：使用快速创建链接（推荐）
1. 运行数据库测试
2. 在控制台找到索引建议
3. 点击"快速创建索引链接"

方式 2：手动创建
1. 进入云开发控制台
2. 选择 `reports` 集合
3. 点击"索引管理"标签
4. 点击"添加索引"
5. 配置：
   - 索引名称：`_openid_1_reportDate_1_items_1`
   - 第一个字段：`_openid`，升序
   - 第二个字段：`reportDate`，升序
   - 第三个字段：`items`，升序
6. 点击"确定"

**注意事项：**
- 创建此索引后，可以删除单独的 `_openid` 索引（如果存在）
- 组合索引的前缀可以覆盖单字段查询
- 例如：`_openid` 查询可以使用 `_openid_1_reportDate_1_items_1` 索引

---

### 4. _id + _openid 组合索引（可选）

**索引名称：** `_id_1__openid_1`

**字段：**
1. `_id`: 升序（1）
2. `_openid`: 升序（1）

**用途：** 优化按 ID 查询时的权限验证

**查询示例：**
```typescript
db.collection('reports')
  .doc(reportId)
  .get()
```

**性能影响：** 低 - `_id` 已有唯一索引，查询已经很快

**是否需要：** 通常不需要，除非：
- 数据量非常大（百万级以上）
- 按 ID 查询的频率非常高
- 性能监控显示此查询有优化空间

**创建方法：**
1. 点击云开发控制台提供的"快速创建索引"链接
2. 或手动创建（参考上面的步骤）

---

## 索引优先级

### 高优先级（必须创建）
1. ✅ `reportDate` 降序索引
2. ✅ `createdAt` 降序索引

### 中优先级（强烈推荐）
3. ⭐ `_openid + reportDate + items` 组合索引

### 低优先级（可选）
4. ⚪ `_id + _openid` 组合索引

## 索引维护

### 查看索引使用情况

1. 进入云开发控制台
2. 选择 `reports` 集合
3. 点击"监控"标签
4. 查看"索引使用情况"

### 删除多余索引

如果创建了 `_openid + reportDate + items` 组合索引，可以删除：
- 单独的 `_openid` 索引（如果存在）

**原因：** 组合索引的前缀可以覆盖单字段查询

**删除方法：**
1. 进入云开发控制台
2. 选择 `reports` 集合
3. 点击"索引管理"标签
4. 找到要删除的索引
5. 点击"删除"

### 索引大小监控

索引会占用存储空间，定期检查：
1. 进入云开发控制台
2. 选择 `reports` 集合
3. 点击"统计"标签
4. 查看"索引大小"

**建议：**
- 索引大小不应超过数据大小的 50%
- 如果索引过大，考虑删除不常用的索引

## 性能优化建议

### 1. 查询优化

**✅ 好的查询：**
```typescript
// 使用索引字段排序
db.collection('reports')
  .orderBy('reportDate', 'desc')
  .limit(20)
  .get()
```

**❌ 避免的查询：**
```typescript
// 不使用索引字段排序
db.collection('reports')
  .orderBy('itemCount', 'desc')  // itemCount 没有索引
  .get()
```

### 2. 分页优化

**✅ 好的分页：**
```typescript
// 使用 skip 和 limit
db.collection('reports')
  .orderBy('reportDate', 'desc')
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .get()
```

**⚠️ 注意：** 当 skip 值很大时（如第 100 页），性能会下降。考虑使用游标分页。

### 3. 字段选择优化

**✅ 好的查询：**
```typescript
// 只返回需要的字段
db.collection('reports')
  .field({
    reportDate: true,
    itemCount: true,
    abnormalCount: true
  })
  .get()
```

**❌ 避免的查询：**
```typescript
// 返回所有字段（包括大数组）
db.collection('reports')
  .get()  // items 数组可能很大
```

### 4. elemMatch 优化

**✅ 好的查询：**
```typescript
// 使用 elemMatch 精确匹配
db.collection('reports')
  .where({
    items: _.elemMatch({ name: '白细胞' })
  })
  .get()
```

**❌ 避免的查询：**
```typescript
// 不使用 elemMatch，需要在客户端过滤
db.collection('reports')
  .get()
  .then(res => {
    return res.data.filter(report => 
      report.items.some(item => item.name === '白细胞')
    )
  })
```

## 测试索引效果

### 1. 运行数据库测试

```bash
# 在微信开发者工具中
# 打开测试页面：pages/test-database/test-database
# 点击"运行所有测试"
```

### 2. 查看性能指标

在测试过程中，观察：
- 查询响应时间
- 索引建议（控制台输出）
- 错误信息

### 3. 对比优化效果

创建索引前后对比：
- 查询时间是否减少
- 是否还有索引建议
- 用户体验是否改善

## 常见问题

### Q: 为什么需要这么多索引？

A: 不同的查询需要不同的索引。合理的索引配置可以显著提高查询性能。

### Q: 索引会影响写入性能吗？

A: 会有轻微影响，但对于读多写少的应用（如医疗报告），收益远大于成本。

### Q: 如何判断是否需要创建某个索引？

A: 参考以下标准：
1. 查询频率高
2. 数据量大（1000+ 条记录）
3. 查询响应时间长（>500ms）
4. 云开发控制台有索引建议

### Q: 索引创建失败怎么办？

A: 可能原因：
1. 索引名称重复 - 使用不同的名称
2. 字段不存在 - 确保集合中有数据
3. 权限不足 - 检查云开发权限

### Q: 可以删除自动创建的 _id 索引吗？

A: 不可以。`_id` 索引是系统自动创建的唯一索引，不能删除。

## 相关文档

- [数据库配置指南](./database-setup.md)
- [测试修复说明](./test-fixes.md)
- [测试使用文档](../miniprogram/utils/DATABASE_TESTS.md)
- [微信云开发文档 - 数据库索引](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database/index.html)

## 总结

合理的索引配置是数据库性能优化的关键：

1. **必须创建**：`reportDate` 和 `createdAt` 降序索引
2. **强烈推荐**：`_openid + reportDate + items` 组合索引
3. **可选创建**：`_id + _openid` 组合索引
4. **定期维护**：监控索引使用情况，删除多余索引
5. **持续优化**：根据实际使用情况调整索引配置
