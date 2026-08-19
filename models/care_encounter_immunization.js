// models/care_encounter_immunization.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_immunization = sequelize.define('care_encounter_immunization', {
    nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(60), allowNull: false },
    medicine: { type: DataTypes.STRING(60), allowNull: false },
    dosage: { type: DataTypes.STRING(60), allowNull: true },
    application_type_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    application_by: { type: DataTypes.STRING(60), allowNull: true },
    titer: { type: DataTypes.STRING(15), allowNull: true },
    refresh_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_immunization',
    timestamps: false,
  });

  return care_encounter_immunization;
};