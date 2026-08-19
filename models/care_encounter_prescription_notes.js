// models/care_encounter_prescription_notes.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_prescription_notes = sequelize.define('care_encounter_prescription_notes', {
    nr: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    prescription_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.STRING(35), allowNull: true },
    short_notes: { type: DataTypes.STRING(25), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_prescription_notes',
    timestamps: false,
  });

  return care_encounter_prescription_notes;
};