// edit-report.ts
import { saveReport, ReportItem } from '../../utils/database'
import { showSaveError } from '../../utils/error-handler'

Component({
  data: {
    reportDate: '',
    items: [] as TestItem[],
    editingIndex: -1,
    editingItem: null as TestItem | null,
    showEditDialog: false
  },

  lifetimes: {
    attached() {
      // 从全局数据中获取识别结果
      const app = getApp<IAppOption>()
      const tempData = app.globalData && app.globalData.tempReportData

      if (tempData) {
        this.setData({
          reportDate: tempData.reportDate,
          items: tempData.items
        })
        
        // 清除临时数据
        delete app.globalData.tempReportData
      } else {
        // 如果没有数据，返回上一页
        wx.showToast({
          title: '没有可编辑的数据',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    }
  },

  methods: {
    // 编辑项目
    editItem(e: any) {
      const { index } = e.currentTarget.dataset
      const item = this.data.items[index]
      
      this.setData({
        editingIndex: index,
        editingItem: { ...item },
        showEditDialog: true
      })
    },

    // 删除项目
    deleteItem(e: any) {
      const { index } = e.currentTarget.dataset
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个检验项目吗？',
        success: (res) => {
          if (res.confirm) {
            const items = [...this.data.items]
            items.splice(index, 1)
            this.setData({ items })
            
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
          }
        }
      })
    },

    // 关闭编辑对话框
    closeEditDialog() {
      this.setData({
        showEditDialog: false,
        editingIndex: -1,
        editingItem: null
      })
    },

    // 输入框变化
    onInputChange(e: any) {
      const { field } = e.currentTarget.dataset
      const { value } = e.detail
      
      this.setData({
        [`editingItem.${field}`]: value
      })
    },

    // 保存编辑
    saveEdit() {
      const { editingIndex, editingItem, items } = this.data
      
      if (!editingItem) return

      // 验证数据
      if (!editingItem.name || !editingItem.unit) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        })
        return
      }

      // 更新数据
      const newItems = [...items]
      newItems[editingIndex] = editingItem
      
      this.setData({
        items: newItems,
        showEditDialog: false,
        editingIndex: -1,
        editingItem: null
      })

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    },

    // 保存报告
    async saveReportData() {
      if (this.data.items.length === 0) {
        wx.showToast({
          title: '没有可保存的数据',
          icon: 'none'
        })
        return
      }

      // 数据验证
      const invalidItems = this.data.items.filter(item => 
        !item.name || item.value === undefined || !item.unit
      )
      
      if (invalidItems.length > 0) {
        wx.showModal({
          title: '数据不完整',
          content: `有 ${invalidItems.length} 个检验项目信息不完整，请检查后再保存`,
          showCancel: false
        })
        return
      }

      try {
        // 转换为 ReportItem 格式
        const reportItems: ReportItem[] = this.data.items.map(item => ({
          name: item.name,
          nameEn: item.nameEn || '',
          value: item.value,
          unit: item.unit,
          normalRange: item.normalRange,
          status: item.status
        }))
        
        const reportId = await saveReport(this.data.reportDate, reportItems)
        
        console.log('报告保存成功, reportId:', reportId)
        
        if (!reportId) {
          throw new Error('保存成功但未返回报告 ID')
        }
        
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })

        // 同时使用 URL 参数和 globalData 传递 ID
        const app = getApp<IAppOption>()
        app.globalData = app.globalData || {}
        app.globalData.currentReportId = reportId
        
        console.log('Stored reportId in globalData:', reportId)

        // 跳转到报告详情页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/report-detail/report-detail?id=${encodeURIComponent(reportId)}`,
            fail: (err) => {
              console.error('跳转失败:', err)
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              })
            }
          })
        }, 1500)
      } catch (error: any) {
        console.error('保存报告失败:', error)
        
        // 使用专门的保存错误处理
        showSaveError(error, () => {
          this.saveReportData()
        })
      }
    },

    // 取消保存
    cancel() {
      wx.showModal({
        title: '确认取消',
        content: '取消后数据将不会保存，确定要取消吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    }
  }
})
