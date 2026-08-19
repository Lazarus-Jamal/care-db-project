// models/care_room.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_room = sequelize.define('care_room', {
    nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type_nr: { primaryKey: true, type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    date_create: { type: DataTypes.DATEONLY, allowNull: true },
    date_close: { type: DataTypes.DATEONLY, allowNull: true },
    is_temp_closed: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 0 },
    room_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    ward_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    dept_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    nr_of_beds: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
    closed_beds: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    info: { type: DataTypes.STRING(60), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_room',
    timestamps: false,
  });

  return care_room;
};