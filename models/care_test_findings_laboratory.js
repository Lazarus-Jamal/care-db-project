// models/care_test_findings_laboratory.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_findings_laboratory = sequelize.define('care_test_findings_laboratory', {
    findings_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
    parent: { type: DataTypes.STRING, allowNull: true },
    task_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: -1 },
    timestamp: { type: DataTypes.BIGINT, allowNull: false },
    finding: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_findings_laboratory',
    timestamps: false,
  });

  return care_test_findings_laboratory;
};