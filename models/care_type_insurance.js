// models/care_type_insurance.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_type_insurance = sequelize.define('care_type_insurance', {
    type_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    LD_var: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_type_insurance',
    timestamps: false,
  });

  return care_type_insurance;
};