
// models/care_encounter_appointment.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_appointment = sequelize.define('care_encounter_appointment', {
    nr: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    pid: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    date: { type: DataTypes.DATE, allowNull: false },
    time: { type: DataTypes.TIME, allowNull: false },
    to_dept_id: { type: DataTypes.STRING(25), allowNull: false },
    to_dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    to_staff_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    to_staff_name: { type: DataTypes.STRING(60), allowNull: true },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    urgency: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    remind: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    remind_email: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    remind_mail: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    remind_phone: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    appt_status: { type: DataTypes.STRING(35), allowNull: false, defaultValue: 'pending' },
    cancel_by: { type: DataTypes.STRING(255), allowNull: false },
    cancel_date: { type: DataTypes.DATEONLY, allowNull: true },
    cancel_reason: { type: DataTypes.STRING(255), allowNull: true },
    encounter_class_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_appointment',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
      { name: 'idx_appointment_encounter', fields: ['encounter_nr'] },
    ],
  });

  return care_encounter_appointment;
};

