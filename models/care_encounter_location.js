// models/care_encounter_location.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_location = sequelize.define('care_encounter_location', {
    nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
    encounter_nr: { primaryKey: true, type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    location_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    group_nr: { primaryKey: true, type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    date_from: { type: DataTypes.DATEONLY, allowNull: false },
    date_to: { type: DataTypes.DATEONLY, allowNull: false },
    time_from: { type: DataTypes.TIME, allowNull: true },
    time_to: { type: DataTypes.TIME, allowNull: true },
    discharge_type_nr: { primaryKey: true, type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_location',
    timestamps: false,
  });

  return care_encounter_location;
};