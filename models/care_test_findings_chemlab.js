// models/care_test_findings_chemlab.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_chemlab = sequelize.define('care_test_findings_chemlab', {
    batch_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
    encounter_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    job_id: { primaryKey: true, type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    test_date: { type: DataTypes.DATEONLY, allowNull: true },
    test_time: { type: DataTypes.TIME, allowNull: true },
    group_id: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    serial_value: { type: DataTypes.TEXT, allowNull: false },
    add_value: { type: DataTypes.TEXT, allowNull: false },
    validator: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    validate_dt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_findings_chemlab',
    timestamps: false,
  });

  return care_test_findings_chemlab;
};