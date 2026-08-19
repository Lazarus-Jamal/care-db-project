// models/care_encounter_op.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_op = sequelize.define('care_encounter_op', {
    nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.CHAR(4), allowNull: false, defaultValue: 0 },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    op_room: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 0 },
    op_nr: { type: DataTypes.MEDIUMINT, allowNull: false, defaultValue: 0 },
    op_date: { type: DataTypes.DATEONLY, allowNull: false },
    op_src_date: { type: DataTypes.CHAR(8), allowNull: false },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    diagnosis: { type: DataTypes.TEXT, allowNull: false },
    operator: { type: DataTypes.TEXT, allowNull: false },
    assistant: { type: DataTypes.TEXT, allowNull: false },
    scrub_nurse: { type: DataTypes.TEXT, allowNull: false },
    rotating_nurse: { type: DataTypes.TEXT, allowNull: false },
    anesthesia: { type: DataTypes.STRING(30), allowNull: false },
    an_doctor: { type: DataTypes.TEXT, allowNull: false },
    op_therapy: { type: DataTypes.TEXT, allowNull: false },
    result_info: { type: DataTypes.TEXT, allowNull: false },
    entry_time: { type: DataTypes.CHAR(5), allowNull: false },
    cut_time: { type: DataTypes.CHAR(5), allowNull: false },
    close_time: { type: DataTypes.CHAR(5), allowNull: false },
    exit_time: { type: DataTypes.CHAR(5), allowNull: false },
    entry_out: { type: DataTypes.TEXT, allowNull: false },
    cut_close: { type: DataTypes.TEXT, allowNull: false },
    wait_time: { type: DataTypes.TEXT, allowNull: false },
    bandage_time: { type: DataTypes.TEXT, allowNull: false },
    repos_time: { type: DataTypes.TEXT, allowNull: false },
    encoding: { type: DataTypes.TEXT, allowNull: false },
    doc_date: { type: DataTypes.CHAR(10), allowNull: false },
    doc_time: { type: DataTypes.CHAR(5), allowNull: false },
    duty_type: { type: DataTypes.STRING(15), allowNull: false },
    material_codedlist: { type: DataTypes.TEXT, allowNull: false },
    container_codedlist: { type: DataTypes.TEXT, allowNull: false },
    icd_code: { type: DataTypes.TEXT, allowNull: false },
    ops_code: { type: DataTypes.TEXT, allowNull: false },
    ops_intern_code: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_op',
    timestamps: false,
  });

  return care_encounter_op;
};