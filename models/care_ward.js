// models/care_ward.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_ward = sequelize.define('care_ward', {
    nr: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    ward_id: { type: DataTypes.STRING(35), allowNull: false },
    name: { type: DataTypes.STRING(35), allowNull: false },
    is_temp_closed: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    date_create: { type: DataTypes.DATEONLY, allowNull: true },
    date_close: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    info: { type: DataTypes.TEXT, allowNull: true },
    dept_nr: { type: DataTypes.MEDIUMINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    room_nr_start: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    room_nr_end: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    roomprefix: { type: DataTypes.STRING(4), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 0 },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 0 },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_ward',
    timestamps: false,
  });

  return care_ward;
};