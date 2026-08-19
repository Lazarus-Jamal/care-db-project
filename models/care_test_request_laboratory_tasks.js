// models/care_test_request_laboratory_tasks.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_laboratory_tasks = sequelize.define('care_test_request_laboratory_tasks', {
    task_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    batch_nr: { type: DataTypes.STRING, allowNull: false },
    test_nr: { type: DataTypes.STRING, allowNull: false },
    bill_number: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    bill_status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    send_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    is_disabled: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 0 },
  }, {
    tableName:  'care_test_request_laboratory_tasks',
    timestamps: false,
  });

  return care_test_request_laboratory_tasks;
};