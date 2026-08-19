// models/care_pregnancy.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_pregnancy = sequelize.define('care_pregnancy', {
    nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    encounter_nr: { primaryKey: true, type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    this_pregnancy_nr: { primaryKey: true, type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
    delivery_time: { type: DataTypes.TIME, allowNull: true },
    gravida: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    para: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    pregnancy_gestational_age: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    nr_of_fetuses: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    child_encounter_nr: { primaryKey: true, type: DataTypes.STRING(255), allowNull: false },
    is_booked: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    vdrl: { type: DataTypes.CHAR(1), allowNull: true },
    rh: { type: DataTypes.TINYINT, allowNull: true },
    delivery_mode: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    delivery_by: { type: DataTypes.STRING(60), allowNull: true },
    bp_systolic_high: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    bp_diastolic_high: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    proteinuria: { type: DataTypes.TINYINT, allowNull: true },
    labour_duration: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    induction_method: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    induction_indication: { type: DataTypes.STRING(125), allowNull: true },
    anaesth_type_nr: { primaryKey: true, type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_epidural: { type: DataTypes.CHAR(1), allowNull: true },
    complications: { type: DataTypes.STRING(255), allowNull: true },
    perineum: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    blood_loss: { type: DataTypes.FLOAT, allowNull: true },
    blood_loss_unit: { type: DataTypes.STRING(10), allowNull: true },
    is_retained_placenta: { type: DataTypes.CHAR(1), allowNull: false },
    post_labour_condition: { type: DataTypes.STRING(35), allowNull: true },
    outcome: { type: DataTypes.STRING(35), allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName:  'care_pregnancy',
    timestamps: false,
  });

  return care_pregnancy;
};