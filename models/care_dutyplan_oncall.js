// models/care_dutyplan_oncall.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_dutyplan_oncall = sequelize.define('care_dutyplan_oncall', {
    nr: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    dept_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    role_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    year: { type: DataTypes.STRING, allowNull: false },
    month: { type: DataTypes.CHAR(2), allowNull: false },
    duty_1_txt: { type: DataTypes.TEXT, allowNull: false },
    duty_2_txt: { type: DataTypes.TEXT, allowNull: false },
    duty_1_pnr: { type: DataTypes.TEXT, allowNull: false },
    duty_2_pnr: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_dutyplan_oncall',
    timestamps: false,
  });

  return care_dutyplan_oncall;
};