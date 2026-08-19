// models/care_test_param.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_param = sequelize.define('care_test_param', {
    nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    group_id: { primaryKey: true, type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    name: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    id: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    msr_unit: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    median: { type: DataTypes.STRING(20), allowNull: true },
    hi_bound: { type: DataTypes.STRING(20), allowNull: true },
    lo_bound: { type: DataTypes.STRING(20), allowNull: true },
    hi_critical: { type: DataTypes.STRING(20), allowNull: true },
    lo_critical: { type: DataTypes.STRING(20), allowNull: true },
    hi_toxic: { type: DataTypes.STRING(20), allowNull: true },
    lo_toxic: { type: DataTypes.STRING(20), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_param',
    timestamps: false,
  });

  return care_test_param;
};