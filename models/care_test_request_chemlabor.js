// models/care_test_request_chemlabor.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_chemlabor = sequelize.define('care_test_request_chemlabor', {
    batch_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    room_nr: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    lab_type: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'chemistry' },
    parameters: { type: DataTypes.TEXT, allowNull: true },
    doctor_sign: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    highrisk: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
    send_date: { type: DataTypes.DATE, allowNull: true },
    sample_time: { type: DataTypes.TIME, allowNull: true },
    sample_weekday: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    bill_number: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    bill_status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    is_disabled: { type: DataTypes.STRING(255), allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
    bon: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_test_request_chemlabor',
    timestamps: false,
  });

  return care_test_request_chemlabor;
};