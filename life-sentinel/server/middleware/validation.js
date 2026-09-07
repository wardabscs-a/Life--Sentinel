// Reusable express-validator chains for common field validations
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

/** Run after validators — sends 400 with field errors if any exist */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data.',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

// === SOS validation chains ===
// Trusted contacts are fetched server-side from Firestore (users/{uid}.trustedContacts)
// and are NOT accepted from the client. Location is optional so an SOS can still
// fire when GPS is unavailable — but if provided it must be a valid coordinate pair.
const sosActivateValidators = [
  body('location').optional({ nullable: true }).isObject().withMessage('location must be an object'),
  body('location.lat')
    .optional({ values: 'null' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location.lng')
    .optional({ values: 'null' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('message')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Message must be 1000 characters or fewer'),
  body('emergencyType')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Invalid emergency type'),
  handleValidation,
];

const sosDeactivateValidators = [
  body('sosId').isString().notEmpty().withMessage('sosId is required'),
  handleValidation,
];

// === Reports validation chains ===
const reportCreateValidators = [
  body('category').isString().notEmpty().withMessage('Emergency category is required'),
  body('severity').isString().notEmpty().withMessage('Severity level is required'),
  body('description').isString().notEmpty().withMessage('Description is required'),
  body('location').isObject().withMessage('location object is required'),
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidation,
];

const reportStatusValidators = [
  param('reportId').isString().notEmpty().withMessage('Report ID is required'),
  body('status')
    .isIn(['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED'])
    .withMessage('Status must be NEW, ACKNOWLEDGED, ASSIGNED, or RESOLVED'),
  handleValidation,
];

// === Notification validation ===
const notifyContactValidators = [
  body('contact').isObject().withMessage('contact object is required'),
  body('contact.phone').isString().notEmpty().withMessage('Contact phone is required'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('type').isString().notEmpty().withMessage('Notification type is required'),
  handleValidation,
];

// === Location update validation ===
const locationUpdateValidators = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidation,
];

module.exports = {
  handleValidation,
  sosActivateValidators,
  sosDeactivateValidators,
  reportCreateValidators,
  reportStatusValidators,
  notifyContactValidators,
  locationUpdateValidators,
};
