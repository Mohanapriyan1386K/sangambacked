const router = require('express').Router();
const c = require('../controllers/eventController');
const system = require('../controllers/systemController');
const wrap = require('../utils/asyncHandler');
router.get('/events', wrap(c.publicEvents));
router.get('/events/archive', wrap(c.publicEventArchive));
router.get('/events/:slug', wrap(c.publicEvent));
router.get('/settings', wrap(system.publicSettings));
module.exports = router;
