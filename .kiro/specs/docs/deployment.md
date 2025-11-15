# 部署指南

## 前置准备

### 1. 账号准备
- [ ] 微信小程序账号
- [ ] 云开发环境（已开通）
- [ ] Textin API 账号

### 2. 工具准备
- [ ] 微信开发者工具
- [ ] Node.js 16+

## 部署步骤

### 步骤 1：配置云数据库

#### 1.1 创建集合
1. 打开微信开发者工具 → 云开发 → 数据库
2. 创建 `reports` 集合

#### 1.2 配置权限规则
1. 选择 `reports` 集合 → 权限设置
2. 选择"自定义安全规则"
3. 输入规则：
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

#### 1.3 创建索引
1. 选择 `reports` 集合 → 索引管理
2. 创建以下索引：

**索引 1**: `reportDate` 降序
- 索引名称：`reportDate_-1`
- 字段：`reportDate`，排序：降序（-1）

**索引 2**: `createdAt` 降序
- 索引名称：`createdAt_-1`
- 字段：`createdAt`，排序：降序（-1）

**索引 3**: 组合索引（推荐）
- 索引名称：`_openid_1_reportDate_1_items_1`
- 字段 1：`_openid`，排序：升序（1）
- 字段 2：`reportDate`，排序：升序（1）
- 字段 3：`items`，排序：升序（1）

### 步骤 2：配置云函数

#### 2.1 配置 Textin API 密钥
1. 复制配置模板：
```bash
cp cloudfunctions/ocrReport/config.example.json cloudfunctions/ocrReport/config.json
```

2. 编辑 `config.json`，填入真实密钥：
```json
{
  "envVariables": {
    "TEXTIN_APP_ID": "your_app_id",
    "TEXTIN_SECRET_CODE": "your_secret_code",
    "DEBUG_OCR": "false"
  }
}
```

#### 2.2 部署云函数
1. 右键点击 `cloudfunctions/ocrReport` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成（约 1-2 分钟）

### 步骤 3：配置小程序

#### 3.1 确认环境 ID
1. 打开 `miniprogram/app.ts`
2. 确认环境 ID 正确：
```typescript
wx.cloud.init({
  env: 'your-cloud-env-id',  // 替换为你的环境 ID
  traceUser: true,
})
```

#### 3.2 配置 AppID
1. 打开 `project.config.json`
2. 确认 `appid` 正确

### 步骤 4：测试功能

#### 4.1 测试数据库
1. 打开测试页面：`pages/test-database/test-database`
2. 点击"运行所有测试"
3. 确认所有测试通过

#### 4.2 测试 OCR 识别
1. 打开上传页面
2. 选择一张检验报告图片
3. 确认识别结果正确

#### 4.3 测试完整流程
1. 上传报告 → 编辑 → 保存
2. 查看报告列表
3. 查看报告详情
4. 查看指标趋势

## 常见问题

### Q: 数据库权限错误
**错误**: `errCode: -502005, permission denied`

**解决**:
1. 检查权限规则是否配置正确
2. 确认规则为：`doc._openid == auth.openid`

### Q: 云函数调用失败
**错误**: `cloud.callFunction:fail`

**解决**:
1. 检查云函数是否部署成功
2. 检查 config.json 是否配置正确
3. 查看云函数日志

### Q: OCR 识别失败
**错误**: `OCR 服务认证失败`

**解决**:
1. 检查 Textin API 密钥是否正确
2. 确认 API 账号有足够的调用额度
3. 检查网络连接

### Q: 图片上传失败
**错误**: `图片数据过大`

**解决**:
1. 检查图片压缩是否生效
2. 确认图片大小 < 10MB
3. 尝试选择较小的图片

## 安全检查

### 提交前检查
- [ ] `config.json` 不在 Git 暂存区
- [ ] 代码中无硬编码密钥
- [ ] `.gitignore` 配置正确
- [ ] 日志无敏感信息输出

### 运行检查命令
```bash
# 检查敏感文件
git status | grep config.json

# 检查硬编码密钥
grep -r "TEXTIN_APP_ID\|TEXTIN_SECRET" --include="*.ts" --include="*.js" miniprogram/

# 应该没有任何结果
```

## 监控和维护

### 日常监控
1. 云开发控制台 → 监控
2. 查看云函数调用量
3. 查看数据库读写量
4. 查看错误日志

### 定期维护
- **每周**: 检查错误日志
- **每月**: 检查 API 调用量和费用
- **每季度**: 更新依赖包版本

## 上线发布

### 1. 代码审查
- [ ] 完成所有功能测试
- [ ] 通过安全检查
- [ ] 代码无明显问题

### 2. 配置域名白名单
在小程序管理后台配置：
- `https://api.textin.com` (Textin API)

### 3. 上传代码
1. 点击"上传"按钮
2. 填写版本号和备注
3. 等待上传完成

### 4. 提交审核
1. 登录小程序管理后台
2. 选择开发版本
3. 提交审核
4. 等待审核通过（通常 1-7 天）

### 5. 发布上线
1. 审核通过后
2. 点击"发布"按钮
3. 确认发布

## 回滚方案

如果发现问题需要回滚：

1. 登录小程序管理后台
2. 进入"版本管理"
3. 选择上一个稳定版本
4. 点击"回退"

## 备份策略

### 数据库备份
1. 云开发控制台 → 数据库
2. 选择 `reports` 集合
3. 点击"导出"
4. 下载备份文件

**建议**: 每周备份一次

### 代码备份
1. 使用 Git 版本控制
2. 定期推送到远程仓库
3. 重要版本打 tag

## 相关文档

- [数据库配置详细说明](./database-setup.md)
- [数据库索引优化](./database-indexes.md)
- [测试运行指南](./test-guide.md)
- [安全最佳实践](./security.md)
