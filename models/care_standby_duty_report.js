// models/care_standby_duty_report.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_standby_duty_report = sequelize.define('care_standby_duty_report', {
    report_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    dept: { type: DataTypes.STRING(15), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    standby_name: { type: DataTypes.STRING(35), allowNull: false },
    standby_start: { type: DataTypes.TIME, allowNull: true },
    standby_end: { type: DataTypes.TIME, allowNull: true },
    oncall_name: { type: DataTypes.STRING(35), allowNull: false },
    oncall_start: { type: DataTypes.TIME, allowNull: true },
    oncall_end: { type: DataTypes.TIME, allowNull: true },
    op_room: { type: DataTypes.CHAR(2), allowNull: false },
    diagnosis_therapy: { type: DataTypes.TEXT, allowNull: false },
    encoding: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName:  'care_standby_duty_report',
    timestamps: false,
  });

  return care_standby_duty_report;
};