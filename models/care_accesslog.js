// models/care_accesslog.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_accesslog = sequelize.define('care_accesslog', {
    id: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    datetime: { type: DataTypes.DATE, allowNull: false },
    ip: { type: DataTypes.STRING(45), allowNull: false },
    lognote: { type: DataTypes.TEXT, allowNull: false },
    userid: { type: DataTypes.STRING(255), allowNull: false },
    username: { type: DataTypes.STRING(255), allowNull: false },
    thisfile: { type: DataTypes.TEXT, allowNull: false },
    fileforward: { type: DataTypes.TEXT, allowNull: false },
    login_success: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 1 },
  }, {
    tableName:  'care_accesslog',
    timestamps: false,
  });

  return care_accesslog;
};