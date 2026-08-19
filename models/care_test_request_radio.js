// models/care_test_request_radio.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_radio = sequelize.define('care_test_request_radio', {
    batch_nr: { type: DataTypes.STRING, primaryKey: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    xray: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    ct: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    sono: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    mammograph: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    mrt: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    nuclear: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    if_patmobile: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    if_allergy: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    if_hyperten: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    if_pregnant: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    clinical_info: { type: DataTypes.TEXT, allowNull: false },
    test_request: { type: DataTypes.TEXT, allowNull: false },
    send_date: { type: DataTypes.DATEONLY, allowNull: true },
    send_doctor: { type: DataTypes.STRING(35), allowNull: false, defaultValue: 0 },
    xray_nr: { type: DataTypes.STRING(9), allowNull: false, defaultValue: 0 },
    r_cm_2: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    mtr: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    xray_date: { type: DataTypes.DATEONLY, allowNull: true },
    xray_time: { type: DataTypes.TIME, allowNull: true },
    results: { type: DataTypes.TEXT, allowNull: false },
    results_date: { type: DataTypes.DATEONLY, allowNull: true },
    results_doctor: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
    process_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    process_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_request_radio',
    timestamps: false,
  });

  return care_test_request_radio;
};