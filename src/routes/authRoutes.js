const router = require('express').Router();
const c = require('../controllers/authController');
const wrap = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateId, rateLimit } = require('../middleware/validate');

router.post('/login', rateLimit({ max: 8 }), validateBody(['email', 'password']), wrap(c.login));
router.get('/me', authenticate, wrap(c.me));
router.post('/logout', authenticate, wrap(c.logout));
router.get('/users', authenticate, authorize('users:view'), wrap(c.listUsers));
router.post('/users', authenticate, authorize('users:create'), validateBody(['name', 'email', 'password', 'roleId']), wrap(c.createUser));
router.patch('/users/:id/status', authenticate, authorize('users:edit'), validateId, validateBody(['status']), wrap(c.setUserStatus));
router.patch('/users/:id/password', authenticate, authorize('users:edit'), validateId, validateBody(['password']), wrap(c.resetPassword));
module.exports = router;
