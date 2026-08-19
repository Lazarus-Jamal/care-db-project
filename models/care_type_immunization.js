// models/care_type_immunization.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_type_immunization = sequelize.define('care_type_immunization', {
    nr: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(50), allowNull: false },
    LD_var: { type: DataTypes.STRING(50), allowNull: false },
    period: { type: DataTypes.SMALLINT, allowNull: true, defaultValue: 0 },
    tolerance: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 0 },
    dosage: { type: DataTypes.TEXT, allowNull: true },
    medicine: { type: DataTypes.TEXT, allowNull: false },
    titer: { type: DataTypes.TEXT, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    application: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: true },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_type_immunization',
    timestamps: false,
  });

  return care_type_immunization;
};