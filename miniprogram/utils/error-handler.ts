/**
 * 统一错误处理工具
 * 提供错误分类、重试机制和用户友好的错误提示
 */

export enum ErrorType {
  NETWORK = 'network',
  OCR = 'ocr',
  DATABASE = 'database',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  type: ErrorType
  message: string
  canRetry: boolean
  originalError?: any
}

/**
 * 解析错误类型和信息
 */
export function parseError(error: any): ErrorInfo {
  // 网络错误
  if (error.errMsg) {
    if (error.errMsg.includes('timeout') || 
        error.errMsg.includes('network') ||
        error.errMsg.includes('fail')) {
      return {
        type: ErrorType.NETWORK,
        message: '网络连接失败，请检查网络后重试',
        canRetry: true,
        originalError: error
      }
    }
    
    if (error.errMsg.includes('cancel')) {
      return {
        type: ErrorType.PERMISSION,
        message: '操作已取消',
        canRetry: false,
        originalError: error
      }
    }
  }

  // 云函数业务错误
  if (error.message) {
    const msg = error.message.toLowerCase()
    
    // OCR 相关错误
    if (msg.includes('ocr') || msg.includes('识别')) {
      return {
        type: ErrorType.OCR,
        message: error.message || 'OCR 识别失败，请确保图片清晰后重试',
        canRetry: true,
        originalError: error
      }
    }
    
    // 数据库相关错误
    if (msg.includes('database') || msg.includes('数据库') || msg.includes('保存')) {
      return {
        type: ErrorType.DATABASE,
        message: error.message || '数据保存失败，请重试',
        canRetry: true,
        originalError: error
      }
    }
    
    // 验证错误
    if (msg.includes('invalid') || msg.includes('验证') || msg.includes('参数')) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message || '数据格式错误，请检查后重试',
        canRetry: false,
        originalError: error
      }
    }
    
    // 权限错误
    if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('权限')) {
      return {
        type: ErrorType.PERMISSION,
        message: error.message || '没有访问权限',
        canRetry: false,
        originalError: error
      }
    }
  }

  // 未知错误
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || error.errMsg || '操作失败，请重试',
    canRetry: true,
    originalError: error
  }
}

/**
 * 显示错误提示
 */
export function showError(error: any, options: {
  title?: string
  showRetry?: boolean
  onRetry?: () => void
} = {}) {
  const errorInfo = parseError(error)
  
  if (options.showRetry && errorInfo.canRetry && options.onRetry) {
    // 显示带重试按钮的模态框
    wx.showModal({
      title: options.title || '操作失败',
      content: errorInfo.message,
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && options.onRetry) {
          options.onRetry()
        }
      }
    })
  } else {
    // 显示简单的 Toast 提示
    wx.showToast({
      title: errorInfo.message,
      icon: 'none',
      duration: 3000
    })
  }
}

/**
 * 带重试机制的异步操作执行器
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    onRetry?: (attempt: number) => void
  } = {}
): Promise<T> {
  const { maxRetries = 2, retryDelay = 1000, onRetry } = options
  
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorInfo = parseError(error)
      
      // 如果错误不可重试，直接抛出
      if (!errorInfo.canRetry) {
        throw error
      }
      
      // 如果还有重试机会
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1)
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  // 所有重试都失败，抛出最后的错误
  throw lastError
}

/**
 * 检查网络状态
 */
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    const res = await wx.getNetworkType()
    return res.networkType !== 'none'
  } catch (error) {
    return false
  }
}

/**
 * 显示网络错误提示
 */
export function showNetworkError(onRetry?: () => void) {
  wx.showModal({
    title: '网络连接失败',
    content: '请检查网络连接后重试',
    confirmText: '重试',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm && onRetry) {
        onRetry()
      }
    }
  })
}

/**
 * OCR 识别失败的特定处理
 */
export function showOcrError(error: any, onRetry?: () => void) {
  const errorInfo = parseError(error)
  
  let content = errorInfo.message
  
  // 根据错误类型提供更详细的建议
  if (errorInfo.type === ErrorType.OCR) {
    content += '\n\n建议：\n1. 确保图片清晰\n2. 光线充足\n3. 避免反光和阴影'
  } else if (errorInfo.type === ErrorType.NETWORK) {
    content = '网络连接失败，请检查网络后重试'
  }
  
  wx.showModal({
    title: 'OCR 识别失败',
    content,
    confirmText: onRetry ? '重新拍照' : '确定',
    cancelText: onRetry ? '取消' : '',
    showCancel: !!onRetry,
    success: (res) => {
      if (res.confirm && onRetry) {
        onRetry()
      }
    }
  })
}

/**
 * 数据保存失败的特定处理
 */
export function showSaveError(error: any, onRetry?: () => void) {
  const errorInfo = parseError(error)
  
  wx.showModal({
    title: '保存失败',
    content: errorInfo.message + '\n\n您的数据已暂存，可以稍后重试',
    confirmText: '重试',
    cancelText: '稍后再试',
    success: (res) => {
      if (res.confirm && onRetry) {
        onRetry()
      }
    }
  })
}

/**
 * 加载失败的处理
 */
export function showLoadError(error: any, onRetry?: () => void) {
  const errorInfo = parseError(error)
  
  wx.showModal({
    title: '加载失败',
    content: errorInfo.message,
    confirmText: onRetry ? '重试' : '确定',
    cancelText: onRetry ? '取消' : '',
    showCancel: !!onRetry,
    success: (res) => {
      if (res.confirm && onRetry) {
        onRetry()
      }
    }
  })
}
