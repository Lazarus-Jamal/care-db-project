// models/care_encounter_obstetric.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_obstetric = sequelize.define('care_encounter_obstetric', {
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    pregnancy_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    hospital_adm_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    patient_class: { type: DataTypes.STRING(60), allowNull: false },
    is_discharged_not_in_labour: { type: DataTypes.TINYINT, allowNull: true },
    is_re_admission: { type: DataTypes.TINYINT, allowNull: true },
    referral_status: { type: DataTypes.STRING(60), allowNull: true },
    referral_reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_obstetric',
    timestamps: false,
  });

  return care_encounter_obstetric;
};