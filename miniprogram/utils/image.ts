/**
 * 图片处理工具
 * 提供图片压缩、格式转换和数据读取功能
 */

interface CompressOptions {
  quality?: number // 压缩质量 0-100
  maxWidth?: number // 最大宽度
  maxHeight?: number // 最大高度
}

/**
 * 压缩图片
 * @param filePath 图片临时文件路径
 * @param options 压缩选项
 * @returns 压缩后的临时文件路径
 */
export async function compressImage(
  filePath: string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    quality = 80,
    maxWidth = 1920,
    maxHeight = 1920
  } = options

  try {
    // 先获取原图信息
    const imageInfo = await getImageInfo(filePath)
    console.log('原图尺寸:', imageInfo.width, 'x', imageInfo.height)

    // 计算是否需要缩放
    let needResize = false
    let targetWidth = imageInfo.width
    let targetHeight = imageInfo.height

    if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) {
      needResize = true
      const widthRatio = maxWidth / imageInfo.width
      const heightRatio = maxHeight / imageInfo.height
      const ratio = Math.min(widthRatio, heightRatio)
      
      targetWidth = Math.floor(imageInfo.width * ratio)
      targetHeight = Math.floor(imageInfo.height * ratio)
      console.log('需要缩放到:', targetWidth, 'x', targetHeight)
    }

    // 如果需要缩放，使用 Canvas 进行缩放
    let processedPath = filePath
    if (needResize) {
      processedPath = await resizeImageWithCanvas(filePath, targetWidth, targetHeight)
      console.log('缩放完成')
    }

    // 使用 wx.compressImage 进行质量压缩
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: processedPath,
        quality,
        success: (res) => {
          console.log('压缩完成')
          resolve(res.tempFilePath)
        },
        fail: (err) => {
          console.error('压缩失败，使用原图:', err)
          // 如果压缩失败，返回缩放后的图片（如果有缩放）或原图
          resolve(processedPath)
        }
      })
    })
  } catch (error) {
    console.error('图片处理失败:', error)
    // 如果处理失败，尝试直接压缩原图
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality,
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve(filePath) // 最后的兜底，返回原图
      })
    })
  }
}

/**
 * 使用 Canvas 缩放图片
 * @param filePath 图片路径
 * @param targetWidth 目标宽度
 * @param targetHeight 目标高度
 * @returns 缩放后的临时文件路径
 */
async function resizeImageWithCanvas(
  filePath: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 创建离屏 Canvas
    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: targetWidth,
      height: targetHeight
    } as any)
    
    // 设置 canvas 尺寸
    canvas.width = targetWidth
    canvas.height = targetHeight
    
    const ctx = canvas.getContext('2d') as any
    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'))
      return
    }

    // 创建图片对象
    const image = (canvas as any).createImage()
    
    image.onload = () => {
      // 绘制缩放后的图片
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight)
      
      // 导出为临时文件
      wx.canvasToTempFilePath({
        canvas: canvas as any,
        success: (res: any) => {
          resolve(res.tempFilePath)
        },
        fail: (err: any) => {
          reject(err)
        }
      } as any)
    }
    
    image.onerror = () => {
      reject(new Error('图片加载失败'))
    }
    
    image.src = filePath
  })
}

/**
 * 将图片转换为 base64
 * @param filePath 图片临时文件路径
 * @returns base64 字符串
 */
export async function imageToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        resolve(res.data as string)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 选择图片并压缩
 * @param options 压缩选项
 * @returns 压缩后的图片路径和 base64 数据
 */
export async function chooseAndCompressImage(
  options: CompressOptions = {}
): Promise<{ filePath: string; base64: string }> {
  // 定义大小限制
  const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024  // 原始图片最大 10MB
  const MAX_BASE64_LENGTH = 7 * 1024 * 1024   // base64 最大约 5MB（编码后会增大）

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['original'],
      success: async (res) => {
        try {
          const tempFilePath = res.tempFiles[0].tempFilePath
          const fileSize = res.tempFiles[0].size

          console.log('选择的图片大小:', formatFileSize(fileSize))

          // 检查原始文件大小
          if (fileSize > MAX_ORIGINAL_SIZE) {
            reject(new Error(`图片过大（${formatFileSize(fileSize)}），请选择小于 10MB 的图片`))
            return
          }

          // 压缩图片
          const compressedPath = await compressImage(tempFilePath, options)

          // 检查压缩后的文件大小
          const compressedSize = await getFileSize(compressedPath)
          console.log('压缩后的图片大小:', formatFileSize(compressedSize))

          // 转换为 base64
          const base64 = await imageToBase64(compressedPath)

          // 检查 base64 大小
          if (base64.length > MAX_BASE64_LENGTH) {
            reject(new Error(`图片压缩后仍然过大（${formatFileSize(base64.length)}），请选择更小的图片或降低分辨率`))
            return
          }

          console.log('base64 大小:', formatFileSize(base64.length))

          resolve({
            filePath: compressedPath,
            base64
          })
        } catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 获取图片信息
 * @param filePath 图片路径
 */
export async function getImageInfo(filePath: string): Promise<{
  width: number
  height: number
  path: string
  type: string
}> {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success: (res) => {
        resolve({
          width: res.width,
          height: res.height,
          path: res.path,
          type: res.type
        })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 检查图片大小
 * @param filePath 图片路径
 * @param maxSize 最大大小（字节）
 * @returns 是否超过限制
 */
export async function checkImageSize(
  filePath: string,
  maxSize: number = 5 * 1024 * 1024 // 默认 5MB
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath,
      success: (res) => {
        resolve(res.size <= maxSize)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 获取文件大小
 * @param filePath 文件路径
 * @returns 文件大小（字节）
 */
export async function getFileSize(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.getFileInfo({
      filePath,
      success: (res) => {
        resolve(res.size)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
