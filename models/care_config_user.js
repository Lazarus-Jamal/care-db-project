// models/care_config_user.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_config_user = sequelize.define('care_config_user', {
    user_id: { type: DataTypes.STRING(100), primaryKey: true },
    serial_config_data: { type: DataTypes.TEXT, allowNull: false },
    notes: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_config_user',
    timestamps: false,
  });

  return care_config_user;
};