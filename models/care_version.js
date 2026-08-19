// models/care_version.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_version = sequelize.define('care_version', {
    name: { type: DataTypes.STRING(20), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false },
    number: { type: DataTypes.STRING(10), allowNull: false },
    build: { type: DataTypes.STRING(5), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    time: { type: DataTypes.TIME, allowNull: true },
    releaser: { type: DataTypes.STRING(30), allowNull: false },
    id: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
  }, {
    tableName:  'care_version',
    timestamps: false,
  });

  return care_version;
};