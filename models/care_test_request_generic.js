// models/care_test_request_generic.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_generic = sequelize.define('care_test_request_generic', {
    batch_nr: { type: DataTypes.STRING, primaryKey: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    testing_dept: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    visit: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    order_patient: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    diagnosis_quiry: { type: DataTypes.TEXT, allowNull: false },
    send_date: { type: DataTypes.DATEONLY, allowNull: true },
    send_doctor: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    result: { type: DataTypes.TEXT, allowNull: false },
    result_date: { type: DataTypes.DATEONLY, allowNull: true },
    result_doctor: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_request_generic',
    timestamps: false,
  });

  return care_test_request_generic;
};