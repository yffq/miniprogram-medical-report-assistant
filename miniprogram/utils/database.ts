/**
 * 云数据库访问工具模块
 * 提供统一的数据库操作接口
 */

/**
 * 报告项目接口
 */
export interface ReportItem {
  name: string        // 中文名称
  nameEn: string      // 英文名称
  value: number       // 检验值
  unit: string        // 单位
  normalRange: string // 正常范围
  status: 'L' | 'N' | 'H'  // L=低, N=正常, H=高
}

/**
 * 报告接口
 */
export interface Report {
  _id: string
  reportDate: string
  itemCount: number
  abnormalCount: number
  items: ReportItem[]
  createdAt: Date
  updatedAt: Date
}

/**
 * 指标接口
 */
export interface Indicator {
  name: string
  nameEn: string
  unit: string
  count: number
}

/**
 * 指标历史记录接口
 */
export interface IndicatorHistoryItem {
  reportDate: string
  value: number
  unit: string
  status: 'L' | 'N' | 'H'
}

/**
 * 获取数据库实例
 */
export function getDatabase() {
  return wx.cloud.database()
}

/**
 * 获取集合引用
 */
export function getCollection(name: string) {
  return getDatabase().collection(name)
}

/**
 * 统一错误处理
 */
export function handleDatabaseError(error: any) {
  console.error('数据库操作失败:', error)
  
  // 根据错误码显示不同提示
  if (error.errCode === -1) {
    wx.showToast({ title: '网络错误，请重试', icon: 'none' })
  } else if (error.errCode === -502001) {
    wx.showToast({ title: '集合不存在', icon: 'none' })
  } else if (error.errCode === -502005) {
    wx.showToast({ title: '权限不足', icon: 'none' })
  } else {
    wx.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

/**
 * 保存报告
 */
export async function saveReport(reportDate: string, items: ReportItem[]): Promise<string> {
  // 1. 验证数据
  if (!reportDate || !items || items.length === 0) {
    throw new Error('报告数据不完整')
  }
  
  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(reportDate)) {
    throw new Error('报告日期格式无效，应为 YYYY-MM-DD')
  }
  
  // 2. 计算 abnormalCount
  const abnormalCount = items.filter(item => item.status !== 'N').length
  
  // 3. 构建报告文档
  const report = {
    reportDate,
    itemCount: items.length,
    abnormalCount,
    items,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  // 4. 保存到数据库
  const db = getDatabase()
  const result = await db.collection('reports').add({
    data: report
  })
  
  console.log('saveReport result:', result)
  console.log('saveReport _id:', result._id)
  
  const reportId = String(result._id)
  console.log('saveReport returning reportId:', reportId)
  
  return reportId
}

/**
 * 查询报告列表（分页）
 */
export async function getReports(page: number = 1, pageSize: number = 20) {
  const db = getDatabase()
  
  // 1. 查询总数
  const countResult = await db.collection('reports').count()
  const total = countResult.total
  
  // 2. 查询列表（排除 items 字段）
  const result = await db.collection('reports')
    .field({
      reportDate: true,
      itemCount: true,
      abnormalCount: true,
      createdAt: true
      // 不指定 items 字段，自动排除，提高性能
    })
    .orderBy('reportDate', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  return {
    total,
    page,
    pageSize,
    reports: result.data
  }
}

/**
 * 查询报告详情
 */
export async function getReportDetail(reportId: string): Promise<Report> {
  console.log('getReportDetail called with reportId:', reportId)
  
  if (!reportId) {
    throw new Error('报告 ID 为空')
  }
  
  const db = getDatabase()
  
  const result = await db.collection('reports')
    .doc(reportId)
    .get()
  
  console.log('getReportDetail result:', result)
  
  if (!result.data) {
    throw new Error(`报告不存在 (ID: ${reportId})`)
  }
  
  return result.data as Report
}

/**
 * 查询指标列表
 * 
 * 注意：不同医院可能对同一指标使用不同的名称、英文缩写或单位
 * 因此按 name + nameEn + unit 的组合进行分组
 */
export async function getIndicators(): Promise<Indicator[]> {
  const db = getDatabase()
  const $ = db.command.aggregate
  
  const result = await (db.collection('reports') as any)
    .aggregate()
    .unwind('$items')  // 展开 items 数组
    .group({
      // 按 name + nameEn + unit 组合分组
      // 这样可以区分不同医院的同名指标
      _id: {
        name: '$items.name',
        nameEn: '$items.nameEn',
        unit: '$items.unit'
      },
      name: $.first('$items.name'),
      nameEn: $.first('$items.nameEn'),
      unit: $.first('$items.unit'),
      count: $.sum(1)  // 统计数量
    })
    .sort({
      name: 1  // 按名称排序
    })
    .end()
  
  return result.list as Indicator[]
}

/**
 * 查询指标历史
 */
export async function getIndicatorHistory(
  indicatorName: string,
  startDate?: string,
  endDate?: string
): Promise<{ indicatorName: string; history: IndicatorHistoryItem[] }> {
  const db = getDatabase()
  const _ = db.command
  
  // 构建查询条件
  const where: any = {
    items: _.elemMatch({
      name: indicatorName  // 只返回包含该指标的报告
    })
  }
  
  // 添加日期范围
  if (startDate && endDate) {
    where.reportDate = _.gte(startDate).and(_.lte(endDate))
  } else if (startDate) {
    where.reportDate = _.gte(startDate)
  } else if (endDate) {
    where.reportDate = _.lte(endDate)
  }
  
  // 查询报告
  const result = await db.collection('reports')
    .where(where)
    .orderBy('reportDate', 'asc')
    .get()
  
  // 提取指标数据
  const history = result.data.map((report: any) => {
    const item = report.items.find((i: ReportItem) => i.name === indicatorName)
    return {
      reportDate: report.reportDate,
      value: item.value,
      unit: item.unit,
      status: item.status
    }
  })
  
  return {
    indicatorName,
    history
  }
}
