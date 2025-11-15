# 项目文档

## 文档结构

### 核心文档

1. **[deployment.md](./deployment.md)** - 部署指南
   - 部署步骤
   - 配置说明
   - 测试验证
   - 常见问题
   - 上线发布

2. **[security.md](./security.md)** - 安全最佳实践
   - 敏感信息保护
   - 提交前检查清单
   - AppID 和云环境 ID 安全说明
   - 应急响应

### 专项文档

3. **[database-setup.md](./database-setup.md)** - 数据库配置详细说明
   - 创建集合
   - 配置权限规则
   - 创建索引
   - 数据结构示例

4. **[database-indexes.md](./database-indexes.md)** - 数据库索引优化
   - 索引列表
   - 创建方法
   - 性能优化建议

5. **[test-guide.md](./test-guide.md)** - 测试运行指南
   - 测试套件说明
   - 运行方法
   - 结果解读
   - 问题排查

## 快速开始

### 新手入门

1. 阅读 [../medical-report-assistant/requirements.md](../medical-report-assistant/requirements.md) 了解项目需求
2. 阅读 [../medical-report-assistant/design.md](../medical-report-assistant/design.md) 了解技术架构
3. 按照 [deployment.md](./deployment.md) 部署项目
4. 参考 [security.md](./security.md) 确保安全

### 开发者

1. 配置数据库：[database-setup.md](./database-setup.md)
2. 优化性能：[database-indexes.md](./database-indexes.md)
3. 运行测试：[test-guide.md](./test-guide.md)
4. 提交代码前：[security.md](./security.md) 第 3 节

### 运维人员

1. 部署流程：[deployment.md](./deployment.md)
2. 监控维护：[deployment.md](./deployment.md) 监控和维护章节
3. 安全检查：[security.md](./security.md)
4. 应急响应：[security.md](./security.md) 第 9 节

## 文档更新

### 最近更新
- 2024-01-15: 整合和精简文档，移除冗余内容
- 2024-01-15: 更新架构说明，反映实际实现
- 2024-01-15: 补充安全最佳实践

### 维护说明
- 文档应与代码保持同步
- 重大变更需更新相关文档
- 定期审查文档准确性

## 常见问题

### Q: 为什么 AppID 和云环境 ID 可以公开？
A: 详见 [security.md](./security.md) 第 2 节。简而言之，这些是标识符而非密钥，有多重保护机制。

### Q: 如何确保代码安全？
A: 参考 [security.md](./security.md) 第 3 节的提交前检查清单。

### Q: 数据库如何配置？
A: 详见 [database-setup.md](./database-setup.md) 和 [deployment.md](./deployment.md) 步骤 1。

### Q: 如何运行测试？
A: 详见 [test-guide.md](./test-guide.md)。

### Q: 部署失败怎么办？
A: 查看 [deployment.md](./deployment.md) 的常见问题章节。

## 相关资源

### 官方文档
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [Textin API 文档](https://www.textin.com/document)

### 项目文件
- [项目主 README](../../../README.md)
- [规格文档](../medical-report-assistant/) - 需求、设计和实施计划
- [文档中心](../README.md) - 统一的文档导航

## 贡献指南

如需更新文档：

1. 确保内容准确、清晰
2. 保持格式一致
3. 更新相关章节的交叉引用
4. 在 README.md 中记录更新

## 联系方式

如有问题或建议，请提交 Issue。
