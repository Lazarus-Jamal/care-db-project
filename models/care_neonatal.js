// models/care_neonatal.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_neonatal = sequelize.define('care_neonatal', {
    nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    pid: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    delivery_date: { type: DataTypes.DATEONLY, allowNull: false },
    parent_encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    delivery_nr: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    delivery_place: { type: DataTypes.STRING(60), allowNull: false },
    delivery_mode: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    c_s_reason: { type: DataTypes.TEXT, allowNull: true },
    born_before_arrival: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 0 },
    face_presentation: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    posterio_occipital_position: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    delivery_rank: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
    apgar_1_min: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    apgar_5_min: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    apgar_10_min: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    time_to_spont_resp: { type: DataTypes.TINYINT, allowNull: true },
    condition: { type: DataTypes.STRING(60), allowNull: true, defaultValue: 0 },
    weight: { type: DataTypes.FLOAT, allowNull: true },
    length: { type: DataTypes.FLOAT, allowNull: true },
    head_circumference: { type: DataTypes.FLOAT, allowNull: true },
    scored_gestational_age: { type: DataTypes.FLOAT, allowNull: true },
    feeding: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    congenital_abnormality: { type: DataTypes.STRING(125), allowNull: false },
    classification: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 0 },
    disease_category: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    outcome: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_neonatal',
    timestamps: false,
  });

  return care_neonatal;
};