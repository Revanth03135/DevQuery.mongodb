const Joi = require('joi');

const validateUserRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(2).max(100).optional(),
    name: Joi.string().min(2).max(100).optional(),
    subscriptionType: Joi.string().valid('free', 'pro', 'enterprise').default('free')
  }).custom((value, helpers) => {
    if (!value.username && !value.fullName && !value.name) {
      return helpers.error('any.required');
    }
    return value;
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    // Check if it's the custom error about name/username
    if (error.details.some(d => d.type === 'any.required')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: 'Please provide either a username or full name'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }

  req.body = value;

  next();
};

const validateUserLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(100).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().required()
  }).custom((value, helpers) => {
    if (!value.username && !value.email) {
      return helpers.message('Please provide an email or username');
    }
    return value;
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }

  req.body = value;

  next();
};

const validateDatabaseConnection = (req, res, next) => {
  const schema = Joi.object({
    connectionString: Joi.string().pattern(/^(mongodb(\+srv)?|postgres(ql)?|mysql|sqlite|mssql):\/\//).optional(),
    type: Joi.string()
      .valid('postgresql', 'postgres', 'mysql', 'sqlite', 'sqlserver', 'mssql', 'oracle', 'mongodb', 'mongo')
      .when('connectionString', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
      }),
    host: Joi.string().when('connectionString', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.when('type', {
        is: 'sqlite',
        then: Joi.optional(),
        otherwise: Joi.required()
      })
    }),
    port: Joi.number().integer().min(1).max(65535).optional(),
    database: Joi.string().when('connectionString', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    username: Joi.string().when('connectionString', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.when('type', {
        is: 'sqlite',
        then: Joi.optional(),
        otherwise: Joi.required()
      })
    }),
    password: Joi.string().optional(),
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

const validateSQLQuery = (req, res, next) => {
  const schema = Joi.object({
    query: Joi.string().required().max(10000),
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

  const queryText = req.body.query.toLowerCase();
  const dangerousPatterns = [
    /;\s*(drop|delete|truncate|alter|create|insert|update)\s+/gi,
    /union\s+select/gi,
    /exec\s*\(/gi,
    /script\s*>/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(queryText)) {
      return res.status(400).json({
        success: false,
        message: 'Potentially dangerous SQL detected',
        code: 'DANGEROUS_SQL'
      });
    }
  }

  next();
};

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

const validateAssistantMessage = (req, res, next) => {
  const schema = Joi.object({
    message: Joi.string().min(2).max(1500).required(),
    connectionId: Joi.string().min(6).max(200).optional(),
    options: Joi.object({
      runQuery: Joi.boolean().default(true)
    })
      .default({})
      .optional(),
    chatHistory: Joi.array().items(Joi.object()).optional(),
    queryHistory: Joi.array().items(Joi.object()).optional(),
    savedQueries: Joi.array().items(Joi.object()).optional()
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Assistant message validation error',
      details: error.details[0].message
    });
  }

  req.body = value;

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateDatabaseConnection,
  validateSQLQuery,
  validateNLQuery,
  validateAssistantMessage
};
