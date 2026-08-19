// models/care_test_findings_chemlabor_sub.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_chemlabor_sub = sequelize.define('care_test_findings_chemlabor_sub', {
    sub_id: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    record_type: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'finding' },
    batch_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    job_id: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    encounter_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    paramater_name: { type: DataTypes.STRING(255), allowNull: true },
    parameter_value: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(255), allowNull: true },
    history: { type: DataTypes.TEXT, allowNull: true },
    test_date: { type: DataTypes.DATEONLY, allowNull: true },
    test_time: { type: DataTypes.TIME, allowNull: true },
    create_id: { type: DataTypes.STRING(35), allowNull: true },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_findings_chemlabor_sub',
    timestamps: false,
  });

  return care_test_findings_chemlabor_sub;
};