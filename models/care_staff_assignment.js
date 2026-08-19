// models/care_staff_assignment.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_staff_assignment = sequelize.define('care_staff_assignment', {
    nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    staff_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    role_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    location_type_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    location_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    date_start: { type: DataTypes.DATEONLY, allowNull: true },
    date_end: { type: DataTypes.DATEONLY, allowNull: true },
    is_temporary: { type: DataTypes.TINYINT, allowNull: true },
    list_frequency: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName:  'care_staff_assignment',
    timestamps: false,
  });

  return care_staff_assignment;
};