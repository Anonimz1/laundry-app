/**
 * Utility: Response Formatter
 * Standardize API responses
 */

class ResponseFormatter {
  static success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      message,
      data,
      meta
    };
  }

  static error(message, errors = [], statusCode = 400) {
    return {
      success: false,
      message,
      errors,
      statusCode
    };
  }

  static paginated(data, page, limit, total) {
    return {
      success: true,
      data,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = ResponseFormatter;
