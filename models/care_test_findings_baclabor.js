// models/care_test_findings_baclabor.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_baclabor = sequelize.define('care_test_findings_baclabor', {
    batch_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    encounter_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    room_nr: { primaryKey: true, type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    dept_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    lab_type: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'bacteriology' },
    notes: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    findings_init: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    findings_current: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    findings_final: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    entry_nr: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    rec_date: { type: DataTypes.DATEONLY, allowNull: true },
    type_general: { type: DataTypes.TEXT, allowNull: true },
    resist_anaerob: { type: DataTypes.TEXT, allowNull: true },
    resist_aerob: { type: DataTypes.TEXT, allowNull: true },
    findings: { type: DataTypes.TEXT, allowNull: true },
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
    tableName:  'care_test_findings_baclabor',
    timestamps: false,
  });

  return care_test_findings_baclabor;
};