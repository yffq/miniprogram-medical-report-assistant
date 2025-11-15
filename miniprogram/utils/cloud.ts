/**
 * 云函数调用封装工具
 * 提供统一的错误处理和加载提示
 */

import { checkNetworkStatus, retryOperation } from './error-handler'

interface CloudFunctionResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: number
    message: string
    details?: any
  }
}

interface CallOptions {
  showLoading?: boolean
  loadingTitle?: string
  showError?: boolean
  enableRetry?: boolean
  maxRetries?: number
}

/**
 * 调用云函数的封装方法
 * @param name 云函数名称
 * @param data 传递给云函数的数据
 * @param options 调用选项
 */
export async function callCloudFunction<T = any>(
  name: string,
  data: any = {},
  options: CallOptions = {}
): Promise<T> {
  const {
    showLoading = true,
    loadingTitle = '加载中...',
    showError = true,
    enableRetry = false,
    maxRetries = 2
  } = options

  // 检查网络状态
  const hasNetwork = await checkNetworkStatus()
  if (!hasNetwork) {
    const error = new Error('网络连接失败，请检查网络后重试')
    if (showError) {
      wx.showToast({
        title: error.message,
        icon: 'none',
        duration: 2000
      })
    }
    throw error
  }

  // 定义实际的调用操作
  const performCall = async (): Promise<T> => {
    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingTitle,
        mask: true
      })
    }

    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      })

      // 隐藏加载提示
      if (showLoading) {
        wx.hideLoading()
      }

      const result = res.result as CloudFunctionResponse<T>

      // 检查云函数返回的业务状态
      if (!result.success) {
        const errorMessage = (result.error && result.error.message) || '操作失败'
        
        if (showError) {
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2000
          })
        }

        throw new Error(errorMessage)
      }

      return result.data as T
    } catch (error: any) {
      // 隐藏加载提示
      if (showLoading) {
        wx.hideLoading()
      }

      // 处理网络错误或其他异常
      const errorMessage = error.errMsg || error.message || '网络错误，请重试'
      
      if (showError) {
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        })
      }

      throw error
    }
  }

  // 如果启用重试，使用重试机制
  if (enableRetry) {
    return retryOperation(performCall, {
      maxRetries,
      retryDelay: 1000,
      onRetry: (attempt) => {
        console.log(`重试第 ${attempt} 次...`)
        if (showLoading) {
          wx.showLoading({
            title: `重试中 (${attempt}/${maxRetries})...`,
            mask: true
          })
        }
      }
    })
  }

  return performCall()
}

/**
 * OCR 识别云函数
 * 这是唯一保留的云函数，用于调用 Textin API
 */
export async function ocrReport(imageData: string, reportDate?: string) {
  return callCloudFunction<{
    items: Array<{
      name: string        // 中文名称
      nameEn: string      // 英文名称
      value: number       // 检验值
      unit: string        // 单位
      normalRange: string // 正常范围
      status: 'L' | 'N' | 'H'  // L=低, N=正常, H=高
    }>
    totalItems: number
  }>('ocrReport', { imageData, reportDate }, {
    loadingTitle: '识别中...',
    showLoading: true,
    enableRetry: true,
    maxRetries: 2
  })
}

// 其他数据库操作已迁移到 miniprogram/utils/database.ts
// 请使用以下函数替代：
// - saveReport() -> 从 database.ts 导入
// - getReports() -> 从 database.ts 导入
// - getReportDetail() -> 从 database.ts 导入
// - getIndicators() -> 从 database.ts 导入
// - getIndicatorHistory() -> 从 database.ts 导入
