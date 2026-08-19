// models/care_category_diagnosis.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_category_diagnosis = sequelize.define('care_category_diagnosis', {
    nr: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category_type: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'diagnosis' },
    group_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    code: { type: DataTypes.STRING(25), allowNull: true },
    mode: { type: DataTypes.STRING(35), allowNull: true },
    category: { type: DataTypes.STRING(35), allowNull: false },
    name: { type: DataTypes.STRING(35), allowNull: false },
    LD_var: { type: DataTypes.STRING(35), allowNull: false },
    short_code: { type: DataTypes.CHAR(1), allowNull: false },
    LD_var_short_code: { type: DataTypes.STRING(25), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    hide_from: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_category_diagnosis',
    timestamps: false,
  });

  return care_category_diagnosis;
};