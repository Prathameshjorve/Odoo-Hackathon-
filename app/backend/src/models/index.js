import { DataTypes } from 'sequelize';
import sequelize from '../sequelize.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('customer','organiser','admin'), allowNull: false, defaultValue: 'customer' },
  status: { type: DataTypes.ENUM('active','inactive','suspended'), defaultValue: 'active' },
  otp: { type: DataTypes.STRING },
  otpExpire: { type: DataTypes.DATE },
  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  loginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  lockUntil: { type: DataTypes.DATE },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpire: { type: DataTypes.DATE },
  phone: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING },
}, {
  timestamps: true,
  tableName: 'users',
});

const Service = sequelize.define('Service', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  duration: { type: DataTypes.INTEGER, defaultValue: 30 },
  price: { type: DataTypes.FLOAT, defaultValue: 0 },
  maxCapacity: { type: DataTypes.INTEGER, defaultValue: 1 },
  image: { type: DataTypes.STRING },
  workingHours: { type: DataTypes.JSON, defaultValue: { start: '09:00', end: '17:00' } },
  daysAvailable: { type: DataTypes.JSON, defaultValue: [1, 2, 3, 4, 5] },
  bufferTime: { type: DataTypes.INTEGER, defaultValue: 0 },
  requiresAdvancePayment: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  rating: { type: DataTypes.FLOAT, defaultValue: 0 },
  reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  organiserId: { type: DataTypes.INTEGER.UNSIGNED },
}, { timestamps: true, tableName: 'services' });

const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  serviceId: { type: DataTypes.INTEGER.UNSIGNED },
  organiserId: { type: DataTypes.INTEGER.UNSIGNED },
  customerId: { type: DataTypes.INTEGER.UNSIGNED },
  date: { type: DataTypes.DATE, allowNull: false },
  startTime: { type: DataTypes.STRING },
  endTime: { type: DataTypes.STRING },
  paymentAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('pending','confirmed','cancelled','completed'), defaultValue: 'pending' },
  cancellationReason: { type: DataTypes.TEXT },
  cancelledBy: { type: DataTypes.STRING },
  cancelledAt: { type: DataTypes.DATE },
  rescheduleCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  previousAppointmentId: { type: DataTypes.INTEGER.UNSIGNED },
}, { timestamps: true, tableName: 'appointments' });

const Slot = sequelize.define('Slot', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  start: { type: DataTypes.DATE, allowNull: false },
  end: { type: DataTypes.DATE, allowNull: false },
  isBooked: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true, tableName: 'slots' });

// Associations
User.hasMany(Service, { as: 'services', foreignKey: 'organiserId' });
Service.belongsTo(User, { as: 'organiser', foreignKey: 'organiserId' });

Service.hasMany(Appointment, { as: 'appointments', foreignKey: 'serviceId' });
Appointment.belongsTo(Service, { as: 'service', foreignKey: 'serviceId' });

User.hasMany(Appointment, { as: 'customerAppointments', foreignKey: 'customerId' });
User.hasMany(Appointment, { as: 'organiserAppointments', foreignKey: 'organiserId' });
Appointment.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
Appointment.belongsTo(User, { as: 'organiser', foreignKey: 'organiserId' });

Service.hasMany(Slot, { as: 'slots', foreignKey: 'serviceId' });
Slot.belongsTo(Service, { as: 'service', foreignKey: 'serviceId' });

export { sequelize, User, Service, Appointment, Slot };
