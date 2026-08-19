// models/care_test_request_patho.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_patho = sequelize.define('care_test_request_patho', {
    batch_nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    quick_cut: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    qc_phone: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    quick_diagnosis: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    qd_phone: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    material_type: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    material_desc: { type: DataTypes.TEXT, allowNull: false },
    localization: { type: DataTypes.TEXT, allowNull: false },
    clinical_note: { type: DataTypes.TEXT, allowNull: false },
    extra_note: { type: DataTypes.TEXT, allowNull: false },
    repeat_note: { type: DataTypes.TEXT, allowNull: false },
    gyn_last_period: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    gyn_period_type: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    gyn_gravida: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    gyn_menopause_since: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 0 },
    gyn_hysterectomy: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 0 },
    gyn_contraceptive: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 0 },
    gyn_iud: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    gyn_hormone_therapy: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    doctor_sign: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    op_date: { type: DataTypes.DATEONLY, allowNull: true },
    send_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    entry_date: { type: DataTypes.DATEONLY, allowNull: true },
    journal_nr: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    blocks_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    deep_cuts: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    special_dye: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    immune_histochem: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    hormone_receptors: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    specials: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
    process_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    process_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_request_patho',
    timestamps: false,
  });

  return care_test_request_patho;
};