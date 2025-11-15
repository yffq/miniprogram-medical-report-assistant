# 错误处理系统

## 错误分类

- **NETWORK**: 网络连接失败、超时
- **OCR**: OCR 识别失败、图片质量问题
- **DATABASE**: 数据保存失败、查询错误
- **VALIDATION**: 数据格式错误、参数无效
- **PERMISSION**: 用户取消操作、无访问权限
- **UNKNOWN**: 其他未分类错误

## 核心功能

### 1. 自动重试

对于可重试的错误，系统自动重试最多 2 次：

```typescript
export async function ocrReport(imageData: string, reportDate?: string) {
  return callCloudFunction('ocrReport', { imageData, reportDate }, {
    enableRetry: true,
    maxRetries: 2
  })
}
```

### 2. 网络状态检测

```typescript
const hasNetwork = await checkNetworkStatus()
if (!hasNetwork) {
  showNetworkError(() => {
    // 重试操作
  })
}
```

### 3. 友好的错误提示

```typescript
// OCR 识别失败
showOcrError(error, () => {
  // 重新拍照
})

// 数据保存失败
showSaveError(error, () => {
  // 重试保存
})

// 数据加载失败
showLoadError(error, () => {
  // 重新加载
})
```

## 使用示例

### OCR 识别

```typescript
try {
  const result = await ocrReport(base64, reportDate)
  // 处理成功结果
} catch (error) {
  showOcrError(error, () => {
    // 重试逻辑
  })
}
```

### 保存数据

```typescript
try {
  const result = await saveReport(reportDate, items)
  // 处理成功结果
} catch (error) {
  showSaveError(error, () => {
    // 重试逻辑
  })
}
```

### 加载数据

```typescript
try {
  const result = await getReports(page, pageSize)
  // 处理成功结果
} catch (error) {
  showLoadError(error, () => {
    // 重试逻辑
  })
}
```

## 错误处理流程

### 上传和识别

```
用户选择图片 → 检查网络 → 压缩图片 → OCR (自动重试2次)
    ↓
成功 → 跳转编辑页面
失败 → 显示错误提示和重试选项
```

### 保存报告

```
用户确认保存 → 验证数据 → 保存 (自动重试2次)
    ↓
成功 → 跳转报告详情
失败 → 显示错误提示，数据暂存，提供重试
```

### 加载数据

```
进入页面 → 检查网络 → 查询数据
    ↓
成功 → 显示数据
失败 → 显示错误提示和重试选项
```

## 最佳实践

### 1. 始终提供重试选项

```typescript
showLoadError(error, () => {
  this.loadData() // 重试加载
})
```

### 2. 数据验证

```typescript
if (items.length === 0) {
  wx.showToast({
    title: '没有可保存的数据',
    icon: 'none'
  })
  return
}
```

### 3. 网络状态检测

```typescript
const hasNetwork = await checkNetworkStatus()
if (!hasNetwork) {
  showNetworkError(() => {
    this.loadData()
  })
  return
}
```

### 4. 错误日志

```typescript
catch (error: any) {
  console.error('操作失败:', error)
  showError(error)
}
```

## 测试建议

- **网络错误**: 关闭网络后尝试操作，测试重试机制
- **OCR 错误**: 上传模糊图片、非报告图片
- **数据错误**: 提交不完整或格式错误的数据
- **用户体验**: 验证错误提示是否清晰，重试功能是否正常
