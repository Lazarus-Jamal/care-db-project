// models/care_test_findings_patho.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_patho = sequelize.define('care_test_findings_patho', {
    batch_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    encounter_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    room_nr: { primaryKey: true, type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    dept_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    material: { type: DataTypes.TEXT, allowNull: false },
    macro: { type: DataTypes.TEXT, allowNull: false },
    micro: { type: DataTypes.TEXT, allowNull: false },
    findings: { type: DataTypes.TEXT, allowNull: false },
    diagnosis: { type: DataTypes.TEXT, allowNull: false },
    doctor_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    findings_date: { type: DataTypes.DATEONLY, allowNull: true },
    findings_time: { type: DataTypes.TIME, allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_findings_patho',
    timestamps: false,
  });

  return care_test_findings_patho;
};