
// models/care_encounter_prescription.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_prescription = sequelize.define('care_encounter_prescription', {
    nr: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    prescription_type_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    article: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    article_item_number: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
    price: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    drug_class: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    order_nr: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dosage: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    application_type_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
    prescribe_date: { type: DataTypes.DATEONLY, allowNull: true },
    prescriber: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    color_marker: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    is_stopped: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_outpatient_prescription: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_disabled: { type: DataTypes.STRING(255), allowNull: true },
    stop_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    bill_number: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    bill_status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
    bon: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    livrer: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    caution: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_encounter_prescription',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });

  return care_encounter_prescription;
};



