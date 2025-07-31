const Joi = require('joi');

// User registration validation
const validateUserRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(2).max(100).required(),
    subscriptionType: Joi.string().valid('free', 'pro', 'enterprise').default('free')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }

  next();
};

// User login validation
const validateUserLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }

  next();
};

// Database connection validation
const validateDatabaseConnection = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid('postgresql', 'postgres', 'mysql', 'sqlite', 'sqlserver', 'mssql', 'oracle', 'mongodb', 'mongo').required(),
    host: Joi.string().when('type', {
      is: 'sqlite',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    port: Joi.number().integer().min(1).max(65535).when('type', {
      is: 'sqlite',
      then: Joi.optional(),
      otherwise: Joi.optional()
    }),
    database: Joi.string().required(),
    username: Joi.string().when('type', {
      is: 'sqlite',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    password: Joi.string().when('type', {
      is: 'sqlite',
      then: Joi.optional(),
      otherwise: Joi.optional()
    }),
    ssl: Joi.boolean().optional(),
    connectionName: Joi.string().max(100).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Database connection validation error',
      details: error.details[0].message
    });
  }

  next();
};

// SQL query validation
const validateSQLQuery = (req, res, next) => {
  const schema = Joi.object({
    query: Joi.string().required().max(10000), // Max 10KB query
    params: Joi.array().items(Joi.any()).optional(),
    limit: Joi.number().integer().min(1).max(10000).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Query validation error',
      details: error.details[0].message
    });
  }

  // Basic SQL injection protection
  const query = req.body.query.toLowerCase();
  const dangerousPatterns = [
    /;\s*(drop|delete|truncate|alter|create|insert|update)\s+/gi,
    /union\s+select/gi,
    /exec\s*\(/gi,
    /script\s*>/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return res.status(400).json({
        success: false,
        message: 'Potentially dangerous SQL detected',
        code: 'DANGEROUS_SQL'
      });
    }
  }

  next();
};

// Natural language query validation
const validateNLQuery = (req, res, next) => {
  const schema = Joi.object({
    description: Joi.string().required().min(5).max(1000),
    context: Joi.object().optional(),
    includeExplanation: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Natural language query validation error',
      details: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateDatabaseConnection,
  validateSQLQuery,
  validateNLQuery
};
