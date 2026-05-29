const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    surname: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
    nin: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role !== 'user') return true;
          return /^\d{11}$/.test(v || '');
        },
        message: 'NIN must be 11 digits',
      },
    },
    receiveApplicationEmails: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date },
  },
  { timestamps: true, collection: 'users' }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafe = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    surname: this.surname,
    email: this.email,
    role: this.role,
    nin: this.nin || '',
    receiveApplicationEmails: !!this.receiveApplicationEmails,
  };
};

module.exports = mongoose.model('User', userSchema);
