// models/care_person_insurance.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_person_insurance = sequelize.define('care_person_insurance', {
    item_nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    pid: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.STRING(60), allowNull: false },
    insurance_nr: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 0 },
    firm_id: { type: DataTypes.STRING(60), allowNull: false },
    class_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_void: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_person_insurance',
    timestamps: false,
  });

  return care_person_insurance;
};