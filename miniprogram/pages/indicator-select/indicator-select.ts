// indicator-select.ts
import { getIndicators } from '../../utils/database'
import { showLoadError } from '../../utils/error-handler'

interface Indicator {
  name: string
  unit: string
  count: number
  selected: boolean
}

Component({
  data: {
    indicators: [] as Indicator[],
    filteredIndicators: [] as Indicator[],
    searchKeyword: '',
    selectedCount: 0,
    maxSelection: 10,
    loading: true
  },

  lifetimes: {
    attached() {
      this.loadIndicators()
    }
  },

  methods: {
    // 加载指标列表
    async loadIndicators() {
      this.setData({ loading: true })

      try {
        const result = await getIndicators()
        
        // 验证数据
        if (!result || result.length === 0) {
          wx.showModal({
            title: '暂无数据',
            content: '您还没有上传过检验报告，请先上传报告',
            showCancel: false,
            success: () => {
              wx.navigateBack()
            }
          })
          return
        }
        
        const indicators = result.map(item => ({
          ...item,
          selected: false
        }))

        this.setData({
          indicators,
          filteredIndicators: indicators,
          loading: false
        })
      } catch (error: any) {
        console.error('加载指标列表失败:', error)
        this.setData({ loading: false })
        
        // 使用统一的加载错误处理
        showLoadError(error, () => {
          this.loadIndicators()
        })
      }
    },

    // 搜索
    onSearchInput(e: any) {
      const keyword = e.detail.value.trim().toLowerCase()
      this.setData({ searchKeyword: keyword })
      this.filterIndicators(keyword)
    },

    // 筛选指标
    filterIndicators(keyword: string) {
      if (!keyword) {
        this.setData({
          filteredIndicators: this.data.indicators
        })
        return
      }

      const filtered = this.data.indicators.filter(item =>
        item.name.toLowerCase().includes(keyword)
      )

      this.setData({
        filteredIndicators: filtered
      })
    },

    // 切换选择
    toggleSelect(e: any) {
      const { index } = e.currentTarget.dataset
      const indicator = this.data.filteredIndicators[index]
      
      // 查找在原始数组中的索引
      const originalIndex = this.data.indicators.findIndex(
        item => item.name === indicator.name
      )

      if (originalIndex === -1) return

      const isSelected = this.data.indicators[originalIndex].selected
      const selectedCount = this.data.selectedCount

      // 如果是取消选择，直接允许
      if (isSelected) {
        this.setData({
          [`indicators[${originalIndex}].selected`]: false,
          selectedCount: selectedCount - 1
        })
        this.updateFilteredIndicators()
        return
      }

      // 如果是选择，检查是否超过限制
      if (selectedCount >= this.data.maxSelection) {
        wx.showToast({
          title: `最多选择${this.data.maxSelection}个指标`,
          icon: 'none'
        })
        return
      }

      this.setData({
        [`indicators[${originalIndex}].selected`]: true,
        selectedCount: selectedCount + 1
      })
      this.updateFilteredIndicators()
    },

    // 更新筛选后的列表
    updateFilteredIndicators() {
      this.filterIndicators(this.data.searchKeyword)
    },

    // 确认选择
    confirmSelection() {
      const selectedIndicators = this.data.indicators.filter(item => item.selected)

      if (selectedIndicators.length === 0) {
        wx.showToast({
          title: '请至少选择一个指标',
          icon: 'none'
        })
        return
      }

      // 跳转到图表页面
      const names = selectedIndicators.map(item => item.name)
      
      // 同时使用 URL 参数和 globalData 传递指标名称
      const app = getApp<IAppOption>()
      app.globalData = app.globalData || {}
      app.globalData.selectedIndicatorNames = names
      
      console.log('Stored indicator names in globalData:', names)
      
      // 使用 navigateTo 保持页面栈，可以正常返回
      wx.navigateTo({
        url: `/pages/chart/chart?names=${encodeURIComponent(JSON.stringify(names))}`,
        fail: (err) => {
          console.error('跳转失败:', err)
          // 如果页面栈太深，使用 redirectTo
          wx.redirectTo({
            url: `/pages/chart/chart?names=${encodeURIComponent(JSON.stringify(names))}`
          })
        }
      })
    },

    // 清空选择
    clearSelection() {
      const indicators = this.data.indicators.map(item => ({
        ...item,
        selected: false
      }))

      this.setData({
        indicators,
        selectedCount: 0
      })
      this.updateFilteredIndicators()
    }
  }
})
