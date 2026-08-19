// models/care_test_findings_radio.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_radio = sequelize.define('care_test_findings_radio', {
    batch_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    encounter_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    room_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    findings: { type: DataTypes.TEXT, allowNull: false },
    diagnosis: { type: DataTypes.TEXT, allowNull: false },
    doctor_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    findings_date: { type: DataTypes.DATEONLY, allowNull: true },
    findings_time: { type: DataTypes.TIME, allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_findings_radio',
    timestamps: false,
  });

  return care_test_findings_radio;
};