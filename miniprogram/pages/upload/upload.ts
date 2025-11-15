// upload.ts
import { chooseAndCompressImage } from '../../utils/image'
import { ocrReport } from '../../utils/cloud'
import { showOcrError, parseError } from '../../utils/error-handler'

type OcrStatus = 'idle' | 'uploading' | 'recognizing' | 'success' | 'error'

Component({
  data: {
    imageUrl: '',
    ocrStatus: 'idle' as OcrStatus,
    errorMessage: '',
    recognizedItems: [] as TestItem[],
    reportDate: ''
  },

  lifetimes: {
    attached() {
      // 设置默认报告日期为今天
      const today = new Date()
      const dateStr = this.formatDate(today)
      this.setData({
        reportDate: dateStr
      })
    }
  },

  methods: {
    // 选择图片
    async chooseImage() {
      try {
        this.setData({
          ocrStatus: 'uploading',
          errorMessage: '',
          imageUrl: '',
          recognizedItems: []
        })

        // 显示压缩提示
        wx.showLoading({
          title: '压缩图片中...',
          mask: true
        })

        // 压缩图片以减小体积，提高上传和识别速度
        // OCR 识别不需要太高分辨率，1280px 足够
        const { filePath, base64 } = await chooseAndCompressImage({
          quality: 75, // 降低质量到 75%，减小文件大小
          maxWidth: 1280, // 降低最大宽度到 1280px
          maxHeight: 1280 // 降低最大高度到 1280px
        })

        wx.hideLoading()

        this.setData({
          imageUrl: filePath,
          ocrStatus: 'recognizing'
        })

        // 调用 OCR 识别
        await this.recognizeImage(base64)
      } catch (error: any) {
        console.error('选择图片失败:', error)
        wx.hideLoading() // 确保隐藏加载提示
        
        if (error.errMsg && error.errMsg.includes('cancel')) {
          // 用户取消选择
          this.setData({
            ocrStatus: 'idle'
          })
        } else {
          // 提取错误信息
          let errorMessage = '选择图片失败，请重试'
          if (error.message) {
            errorMessage = error.message
          } else if (error.errMsg) {
            errorMessage = error.errMsg
          }
          
          this.setData({
            ocrStatus: 'error',
            errorMessage
          })
          
          // 显示错误提示
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 3000
          })
        }
      }
    },

    // 识别图片
    async recognizeImage(base64: string) {
      try {
        const result = await ocrReport(base64, this.data.reportDate)

        // 检查识别结果
        if (!result.items || result.items.length === 0) {
          throw new Error('未识别到检验项目，请确保图片清晰完整')
        }

        this.setData({
          ocrStatus: 'success',
          recognizedItems: result.items
        })

        // 将识别结果存储到全局数据中，供编辑页面使用
        const app = getApp<IAppOption>()
        app.globalData = app.globalData || {}
        app.globalData.tempReportData = {
          reportDate: this.data.reportDate,
          items: result.items
        }

        // 跳转到编辑页面
        wx.navigateTo({
          url: `/pages/edit-report/edit-report?date=${this.data.reportDate}`
        })
      } catch (error: any) {
        console.error('OCR 识别失败:', error)
        
        const errorInfo = parseError(error)
        this.setData({
          ocrStatus: 'error',
          errorMessage: errorInfo.message
        })

        // 显示详细的错误提示和重试选项
        showOcrError(error, () => {
          this.retry()
        })
      }
    },

    // 重试
    retry() {
      this.chooseImage()
    },

    // 返回首页
    goBack() {
      wx.navigateBack()
    },

    // 日期选择
    onDateChange(e: any) {
      this.setData({
        reportDate: e.detail.value
      })
    },

    // 格式化日期
    formatDate(date: Date): string {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
})
