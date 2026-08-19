
// models/care_encounter_measurement.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_measurement = sequelize.define('care_encounter_measurement', {
    nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    msr_date: { type: DataTypes.DATEONLY, allowNull: false },
    msr_time: { type: DataTypes.TIME, allowNull: false },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    msr_type_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    value: { type: DataTypes.STRING(255), allowNull: true },
    unit_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    unit_type_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.STRING(255), allowNull: true },
    measured_by: { type: DataTypes.STRING(35), allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_measurement',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });

  return care_encounter_measurement;
};

