/**
 * 云函数公共工具模块
 */

/**
 * 错误码定义
 */
const ErrorCodes = {
  SUCCESS: 0,
  UNKNOWN_ERROR: -1,
  INVALID_PARAMS: 1001,
  UNAUTHORIZED: 1002,
  OCR_FAILED: 2001,
  OCR_NO_CONTENT: 2002,
  DATABASE_ERROR: 3001
};

/**
 * 错误处理器
 */
class ErrorHandler {
  static ErrorCodes = ErrorCodes;

  /**
   * 安全日志输出（避免敏感信息泄露）
   */
  static safeLog(level, message, data = {}) {
    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };

    // 过滤敏感字段
    const sensitiveKeys = ['password', 'token', 'secret', 'appId', 'secretCode'];
    Object.keys(logData).forEach(key => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        logData[key] = '***';
      }
    });

    console.log(JSON.stringify(logData));
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(code, message, data = {}) {
    return {
      code,
      message,
      data,
      success: false
    };
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse(data = {}) {
    return {
      code: ErrorCodes.SUCCESS,
      message: 'success',
      data,
      success: true
    };
  }
}

/**
 * 输入验证器
 */
class InputValidator {
  /**
   * 验证 base64 格式
   */
  static isValidBase64(str) {
    if (!str || typeof str !== 'string') {
      return false;
    }

    // 移除 data URL 前缀
    let base64Str = str;
    if (str.includes(',')) {
      base64Str = str.split(',')[1];
    }

    // Base64 正则验证
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Str);
  }

  /**
   * 验证日期格式 (YYYY-MM-DD)
   */
  static isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return false;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return false;
    }

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

/**
 * 云函数包装器（统一错误处理）
 */
async function wrapCloudFunction(handler) {
  try {
    const result = await handler();
    
    // 如果返回结果已经包含 code 字段，直接返回
    if (result && typeof result.code !== 'undefined') {
      return result;
    }

    // 否则包装为成功响应
    return ErrorHandler.createSuccessResponse(result);

  } catch (error) {
    ErrorHandler.safeLog('error', '云函数执行失败', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return ErrorHandler.createErrorResponse(
      ErrorCodes.UNKNOWN_ERROR,
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

module.exports = {
  ErrorHandler,
  InputValidator,
  wrapCloudFunction,
  ErrorCodes
};
