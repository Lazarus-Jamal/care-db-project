// models/care_sessions.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_sessions = sequelize.define('care_sessions', {
    sid: { type: DataTypes.STRING(36), primaryKey: true },
    expires: { type: DataTypes.DATE, allowNull: true },
    data: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_sessions',
    timestamps: false,
  });

  return care_sessions;
};