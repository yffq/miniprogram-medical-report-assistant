/**
 * OCR 识别检验报告云函数
 * 功能：
 * 1. 接收图片数据（base64 或临时文件路径）
 * 2. 调用 Textin 医疗票据识别 API 识别报告内容
 * 3. 解析 OCR 结果，提取检验项目信息
 * 4. 返回结构化的检验数据
 */

const cloud = require('wx-server-sdk');
const axios = require('axios');
const { 
  wrapCloudFunction, 
  ErrorHandler,
  InputValidator 
} = require('./common');

// 初始化云开发
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * Textin OCR API 配置
 * 从环境变量中读取（在云函数配置中设置）
 */
const TEXTIN_OCR_CONFIG = {
  // 医疗识别 API URL
  apiUrl: 'https://api.textin.com/ai/service/v1/medical_recognize',
  appId: process.env.TEXTIN_APP_ID || '',
  secretCode: process.env.TEXTIN_SECRET_CODE || '',
  timeout: 30000  // 30秒超时
};

// 记录配置加载状态（不输出敏感信息）
console.log('配置加载完成', {
  hasTextinAppId: !!TEXTIN_OCR_CONFIG.appId,
  hasTextinSecretCode: !!TEXTIN_OCR_CONFIG.secretCode
});



/**
 * 调用 Textin 医疗票据识别 API
 */
async function callTextinOCR(imageBase64) {
  try {
    ErrorHandler.safeLog('info', '开始调用 Textin 医疗票据识别 API', {
      appIdConfigured: !!TEXTIN_OCR_CONFIG.appId,
      secretCodeConfigured: !!TEXTIN_OCR_CONFIG.secretCode
    });

    // 验证配置
    if (!TEXTIN_OCR_CONFIG.appId || !TEXTIN_OCR_CONFIG.secretCode) {
      throw new Error('Textin App ID 或 Secret Code 未配置');
    }

    // 去除 base64 前缀（如果有）
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(',')) {
      cleanBase64 = imageBase64.split(',')[1];
    }

    // 将 base64 转换为 Buffer（二进制流）
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    // 生成时间戳
    const timestamp = Math.floor(Date.now() / 1000);

    ErrorHandler.safeLog('info', '准备调用 Textin 医疗票据识别 API', {
      url: TEXTIN_OCR_CONFIG.apiUrl,
      imageSize: imageBuffer.length,
      timestamp,
      appId: TEXTIN_OCR_CONFIG.appId
    });

    // 调用 Textin 医疗检验报告识别 API
    // category=6 表示医疗检验报告
    // 请求体直接使用二进制流，不使用 FormData
    const response = await axios.post(
      `${TEXTIN_OCR_CONFIG.apiUrl}?category=6`,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-ti-app-id': TEXTIN_OCR_CONFIG.appId,
          'x-ti-secret-code': TEXTIN_OCR_CONFIG.secretCode
        },
        timeout: TEXTIN_OCR_CONFIG.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    ErrorHandler.safeLog('info', 'Textin 医疗票据识别 API 调用成功', {
      status: response.status,
      hasData: !!response.data
    });

    // 打印返回的原始结果（用于调试）
    ErrorHandler.safeLog('info', 'Textin API 原始返回结果 - 基本信息', {
      code: response.data.code,
      message: response.data.message,
      version: response.data.version,
      duration: response.data.duration
    });

    // 打印完整返回数据（仅在需要调试时启用）
    const DEBUG_MODE = process.env.DEBUG_OCR === 'true';
    
    if (DEBUG_MODE) {
      // 完整打印原始返回数据（分段打印，避免日志截断）
      const fullResponseStr = JSON.stringify(response.data, null, 2);
      const chunkSize = 3000;
      const totalChunks = Math.ceil(fullResponseStr.length / chunkSize);
      
      ErrorHandler.safeLog('info', `Textin API 完整返回数据（共 ${fullResponseStr.length} 字符，分 ${totalChunks} 段）`);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fullResponseStr.length);
        const chunk = fullResponseStr.substring(start, end);
        ErrorHandler.safeLog('info', `Textin API 返回数据 [${i + 1}/${totalChunks}]`, {
          chunk: chunk
        });
      }
    } else {
      // 简化模式：只打印关键信息
      ErrorHandler.safeLog('info', 'Textin API 返回数据摘要', {
        hasObjectList: !!response.data.result?.object_list,
        objectCount: response.data.result?.object_list?.length || 0,
        hasTables: !!response.data.result?.tables,
        tableCount: response.data.result?.tables?.length || 0,
        responseSize: JSON.stringify(response.data).length
      });
    }

    // 检查返回结果
    if (response.data.code !== 200) {
      throw new Error(`Textin OCR 识别失败: ${response.data.message || '未知错误'}`);
    }

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      ErrorHandler.safeLog('error', 'Textin 医疗票据识别 API 调用失败', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        responseData: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('OCR 服务认证失败，请检查 App ID 和 Secret Code 配置');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OCR 识别超时，请重试');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        throw new Error(`OCR 服务调用失败: ${errorMsg}`);
      }
    }
    
    // 处理其他类型的错误
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('OCR 服务调用失败');
  }
}

// isValueNormal 函数已移除，不再需要
// 直接使用 Textin API 返回的 prompt 字段作为 status

/**
 * 解析 Textin 医疗票据识别结果，提取检验项目信息
 */
function parseOCRResult(ocrData) {
  try {
    ErrorHandler.safeLog('info', '开始解析 Textin 医疗票据识别结果', {
      hasData: !!ocrData,
      dataKeys: ocrData ? Object.keys(ocrData) : []
    });

    const items = [];

    // 检查 OCR 返回数据结构
    if (!ocrData || !ocrData.result) {
      ErrorHandler.safeLog('warn', 'OCR 返回数据为空或格式不正确');
      return items;
    }

    const result = ocrData.result;

    // 检查是否有 object_list（结构化数据）
    if (result.object_list && Array.isArray(result.object_list)) {
      ErrorHandler.safeLog('info', '找到结构化数据', {
        objectCount: result.object_list.length
      });

      // 遍历所有识别对象
      for (const obj of result.object_list) {
        // 检查是否为医疗检验报告类型
        if (obj.type === 'medical_laboratory_report') {
          ErrorHandler.safeLog('info', '找到医疗检验报告', {
            type: obj.type,
            typeDescription: obj.type_description
          });

          // 提取检验结果汇总表
          const details = obj.details;
          if (details && details.test_results_summary_table && Array.isArray(details.test_results_summary_table)) {
            ErrorHandler.safeLog('info', '找到检验结果汇总表', {
              itemCount: details.test_results_summary_table.length
            });

            for (const item of details.test_results_summary_table) {
              try {
                // 从 Textin API 响应中提取数据
                const name = item.project_name?.value || '';
                const valueStr = item.result?.value || '';
                const unit = item.unit?.value || '';
                const normalRange = item.reference_value?.value || '';
                const prompt = item.prompt?.value || '';  // "L", "", "H"

                // 验证必填字段
                if (!name || !valueStr) {
                  ErrorHandler.safeLog('warn', '检验项缺少必填字段', { 
                    name, 
                    valueStr 
                  });
                  continue;
                }

                // 解析数值
                const value = parseFloat(valueStr);
                if (isNaN(value)) {
                  ErrorHandler.safeLog('warn', '无法解析数值', { 
                    name, 
                    valueStr
                  });
                  continue;
                }

                // 确定 status：直接使用 Textin API 的 prompt 字段
                let status = 'N';  // 默认正常
                if (prompt === 'L') {
                  status = 'L';  // 低于正常
                } else if (prompt === 'H') {
                  status = 'H';  // 高于正常
                }

                // nameEn 暂时为空，可以后续补充
                const nameEn = '';

                items.push({
                  name,
                  nameEn,
                  value,
                  unit,
                  normalRange,
                  status
                });

                ErrorHandler.safeLog('info', '成功解析检验项（结构化）', {
                  name,
                  value,
                  unit,
                  normalRange,
                  status,
                  prompt
                });

              } catch (error) {
                ErrorHandler.safeLog('error', '解析检验项失败', {
                  error: error instanceof Error ? error.message : String(error)
                });
                continue;
              }
            }
          } else {
            ErrorHandler.safeLog('warn', '未找到 test_results_summary_table 字段');
          }
        }
      }
    }

    // 如果结构化数据没有找到检验项目，尝试从表格数据中提取
    if (items.length === 0 && result.tables && Array.isArray(result.tables)) {
      ErrorHandler.safeLog('info', '尝试从表格数据中提取', {
        tableCount: result.tables.length
      });

      // 遍历所有表格
      for (const table of result.tables) {
        if (!table.rows || !Array.isArray(table.rows)) {
          continue;
        }

        // 查找表头行，确定列索引
        let headerRow = null;
        let nameColIndex = -1;
        let valueColIndex = -1;
        let unitColIndex = -1;
        let rangeColIndex = -1;

        // 查找表头
        for (const row of table.rows) {
          if (!row.cells || !Array.isArray(row.cells)) {
            continue;
          }

          const cellTexts = row.cells.map(cell => (cell.text || '').trim());
          
          // 检查是否为表头行
          if (cellTexts.some(text => 
            text.includes('项目') || text.includes('检验') || text.includes('名称')
          )) {
            headerRow = row;
            
            // 确定各列索引
            cellTexts.forEach((text, index) => {
              if (text.includes('项目') || text.includes('检验') || text.includes('名称')) {
                nameColIndex = index;
              } else if (text.includes('结果') || text.includes('测定值') || text.includes('检测值')) {
                valueColIndex = index;
              } else if (text.includes('单位')) {
                unitColIndex = index;
              } else if (text.includes('参考') || text.includes('范围') || text.includes('区间')) {
                rangeColIndex = index;
              }
            });
            
            break;
          }
        }

        if (!headerRow || nameColIndex === -1 || valueColIndex === -1) {
          ErrorHandler.safeLog('warn', '未找到有效的表头行');
          continue;
        }

        ErrorHandler.safeLog('info', '找到表头', {
          nameColIndex,
          valueColIndex,
          unitColIndex,
          rangeColIndex
        });

        // 解析数据行
        let isDataRow = false;
        for (const row of table.rows) {
          // 跳过表头行
          if (row === headerRow) {
            isDataRow = true;
            continue;
          }

          if (!isDataRow || !row.cells || !Array.isArray(row.cells)) {
            continue;
          }

          try {
            const name = row.cells[nameColIndex]?.text?.trim() || '';
            const valueStr = row.cells[valueColIndex]?.text?.trim() || '';
            const unit = unitColIndex >= 0 ? (row.cells[unitColIndex]?.text?.trim() || '') : '';
            const normalRange = rangeColIndex >= 0 ? (row.cells[rangeColIndex]?.text?.trim() || '') : '';

            // 验证必填字段
            if (!name || !valueStr) {
              continue;
            }

            // 解析数值
            const value = parseFloat(valueStr);
            if (isNaN(value)) {
              ErrorHandler.safeLog('warn', '无法解析数值', { 
                name, 
                valueStr
              });
              continue;
            }

            // 表格数据没有 prompt 字段，默认为正常
            const status = 'N';
            const nameEn = '';

            items.push({
              name,
              nameEn,
              value,
              unit,
              normalRange,
              status
            });

            ErrorHandler.safeLog('info', '成功解析检验项（表格）', {
              name,
              value,
              unit,
              normalRange,
              status
            });

          } catch (error) {
            ErrorHandler.safeLog('error', '解析检验项失败', {
              error: error instanceof Error ? error.message : String(error)
            });
            continue;
          }
        }
      }
    }

    ErrorHandler.safeLog('info', 'OCR 结果解析完成', {
      itemCount: items.length
    });

    return items;

  } catch (error) {
    ErrorHandler.safeLog('error', '解析 OCR 结果失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  return wrapCloudFunction(async () => {
    // 1. 获取用户身份
    const { OPENID } = cloud.getWXContext();
    
    if (!OPENID) {
      ErrorHandler.safeLog('error', '无法获取用户 openid');
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.UNAUTHORIZED,
        '用户身份验证失败'
      );
    }

    // 2. 验证输入参数
    if (!event.imageData) {
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.INVALID_PARAMS,
        '缺少图片数据'
      );
    }

    // 验证 base64 格式
    if (!InputValidator.isValidBase64(event.imageData)) {
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.INVALID_PARAMS,
        '图片数据格式无效'
      );
    }

    // 验证 base64 大小（防止超大图片攻击）
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // 10MB
    if (event.imageData.length > MAX_BASE64_LENGTH) {
      ErrorHandler.safeLog('warn', '图片数据过大', {
        size: event.imageData.length,
        maxSize: MAX_BASE64_LENGTH
      });
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.INVALID_PARAMS,
        `图片数据过大（${Math.round(event.imageData.length / 1024 / 1024)}MB），请选择较小的图片`
      );
    }

    ErrorHandler.safeLog('info', 'OCR 识别请求', {
      openid: OPENID,
      imageSize: event.imageData.length,
      reportDate: event.reportDate
    });

    // 3. 调用 Textin OCR API
    let ocrResult;
    try {
      ocrResult = await callTextinOCR(event.imageData);
    } catch (error) {
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.OCR_FAILED,
        error instanceof Error ? error.message : 'OCR 识别失败'
      );
    }

    // 4. 解析 OCR 结果
    const items = parseOCRResult(ocrResult);

    if (items.length === 0) {
      return ErrorHandler.createErrorResponse(
        ErrorHandler.ErrorCodes.OCR_NO_CONTENT,
        '未能识别到检验项目，请确保图片清晰且包含表格数据'
      );
    }

    // 5. 返回结果
    return ErrorHandler.createSuccessResponse({
      items,
      totalItems: items.length
    });

  });
};
