const mongoose = require('mongoose');
const SangamSettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  name: { type: String, default: 'Sangam' },
  logoUrl: String,
  about: { type: String, maxlength: 5000 },
  contactEmail: String,
  contactPhone: String,
  address: String,
  monthlyFee: { type: Number, min: 0, default: 100 },
  timezone: { type: String, default: 'Asia/Kolkata' },
}, { timestamps: true });
module.exports = mongoose.model('SangamSetting', SangamSettingSchema);
