
// models/care_encounter_diagnosis.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_diagnosis = sequelize.define('care_encounter_diagnosis', {
    diagnosis_nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    op_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    date: { type: DataTypes.DATE, allowNull: false },
    code: { type: DataTypes.STRING(25), allowNull: false },
    code_parent: { type: DataTypes.STRING(25), allowNull: false },
    group_nr: { type: DataTypes.MEDIUMINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    code_version: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    localcode: { type: DataTypes.STRING(35), allowNull: false },
    category_nr: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.STRING(35), allowNull: false },
    localization: { type: DataTypes.STRING(35), allowNull: false },
    diagnosing_clinician: { type: DataTypes.STRING(60), allowNull: false },
    diagnosing_dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_diagnosis',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });

  return care_encounter_diagnosis;
};

