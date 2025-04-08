/**
 * Standard API response formatter middleware
 * Ensures consistent response structure across endpoints
 */
const responseHandler = (req, res, next) => {
  // Add success response method
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  };

  // Add paginated response method for lists
  res.paginated = (data, totalCount, page, limit, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        totalCount,
        page,
        limit,
        pageCount: Math.ceil(totalCount / limit)
      }
    });
  };

  next();
};

module.exports = responseHandler; 