// models/care_type_location.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_type_location = sequelize.define('care_type_location', {
    nr: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(35), allowNull: false },
    name: { type: DataTypes.STRING(35), allowNull: false },
    LD_var: { type: DataTypes.STRING(35), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_type_location',
    timestamps: false,
  });

  return care_type_location;
};