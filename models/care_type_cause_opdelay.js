// models/care_type_cause_opdelay.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_type_cause_opdelay = sequelize.define('care_type_cause_opdelay', {
    type_nr: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(35), allowNull: false },
    cause: { type: DataTypes.STRING(255), allowNull: false },
    LD_var: { type: DataTypes.STRING(35), allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName:  'care_type_cause_opdelay',
    timestamps: false,
  });

  return care_type_cause_opdelay;
};