// models/care_test_request_baclabor.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_test_request_baclabor = sequelize.define('care_test_request_baclabor', {
    batch_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    material: { type: DataTypes.TEXT, allowNull: false },
    test_type: { type: DataTypes.TEXT, allowNull: false },
    material_note: { type: DataTypes.TEXT, allowNull: false },
    diagnosis_note: { type: DataTypes.TEXT, allowNull: false },
    immune_supp: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    send_date: { type: DataTypes.DATEONLY, allowNull: true },
    sample_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_test_request_baclabor',
    timestamps: false,
  });

  return care_test_request_baclabor;
};