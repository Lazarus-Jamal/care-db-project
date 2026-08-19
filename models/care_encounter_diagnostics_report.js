// models/care_encounter_diagnostics_report.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_diagnostics_report = sequelize.define('care_encounter_diagnostics_report', {
    item_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    report_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    reporting_dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    reporting_dept: { type: DataTypes.STRING(100), allowNull: false },
    report_date: { type: DataTypes.DATEONLY, allowNull: false },
    report_time: { type: DataTypes.TIME, allowNull: false },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    script_call: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_diagnostics_report',
    timestamps: false,
  });

  return care_encounter_diagnostics_report;
};