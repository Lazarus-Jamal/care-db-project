// models/care_users_roles.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_users_roles = sequelize.define('care_users_roles', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_name:   { type: DataTypes.STRING(50),  allowNull: false, defaultValue: 'no_name' },
    permission:  { type: DataTypes.TEXT,         allowNull: true },
    history:     { type: DataTypes.TEXT,         allowNull: true },
    modify_id:   { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE,         allowNull: false },
    create_id:   { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE,         allowNull: false },
  }, {
    tableName:  'care_users_roles',
    timestamps: false,
  });

  return care_users_roles;
};
